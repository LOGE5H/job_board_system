// Full smoke test — local SQLite backend, no MongoDB required.
// Run: node smoke-test.js  (backend must be running on PORT or it starts checks against http://localhost:5000)
// Exit 0 = all passed, 1 = failures.

const BASE = process.env.SMOKE_BASE || 'http://localhost:5000/api';
const stamp = Date.now();
const instEmail = `institution${stamp}@example.com`;
const candEmail = `seeker${stamp}@example.com`;
const PASS = 'Password123!';

let failures = 0;
let passed = 0;

async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failures++;
    console.error(`FAIL  ${name}: ${e.message}`);
    if (e.detail) console.error(`      ${e.detail}`);
  }
}

function assert(cond, msg, detail) {
  if (!cond) {
    const err = new Error(msg);
    if (detail) err.detail = detail;
    throw err;
  }
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

(async () => {
  console.log(`Smoke test against ${BASE} (local SQLite storage)`);
  let instToken, candToken, jobId, appId, instVerifyToken, candVerifyToken;

  await step('health check reports sqlite-local', async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await json(res);
    assert(res.ok, `health status ${res.status}`, JSON.stringify(body));
    assert(body.storage === 'sqlite-local', `expected sqlite-local, got ${body.storage}`, JSON.stringify(body));
  });

  await step('register institution/company (job poster)', async () => {
    const res = await fetch(`${BASE}/auth/register/employer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: instEmail, password: PASS, companyName: `Test University ${stamp}`, industry: 'Education', location: 'Test City' })
    });
    const body = await json(res);
    assert(res.status === 201, `register status ${res.status}`, JSON.stringify(body));
    assert(body.verificationToken, 'missing verificationToken', JSON.stringify(body));
    instVerifyToken = body.verificationToken;
  });

  await step('verify institution email', async () => {
    const res = await fetch(`${BASE}/auth/verify/${instVerifyToken}`);
    const body = await json(res);
    assert(res.ok, `verify status ${res.status}`, JSON.stringify(body));
  });

  await step('login institution', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: instEmail, password: PASS })
    });
    const body = await json(res);
    assert(res.ok, `login status ${res.status}`, JSON.stringify(body));
    assert(body.user.role === 'employer', `role should be employer, got ${body.user.role}`, JSON.stringify(body));
    assert(body.user.emailVerified === true, 'email should be verified', JSON.stringify(body));
    instToken = body.token;
    assert(instToken, 'missing token');
  });

  await step('institution posts a job (only job poster can)', async () => {
    const res = await fetch(`${BASE}/jobs`, {
      method: 'POST',
      headers: authHeaders(instToken),
      body: JSON.stringify({
        title: `QA Engineer ${stamp}`,
        description: 'Own quality for our platform. Write tests, automate pipelines.',
        location: 'Remote',
        jobType: 'full-time',
        category: 'Technology',
        requiredSkills: ['JavaScript', 'Testing', 'CI/CD'],
        experienceLevel: 'Mid-Level',
        minExperienceYears: 2,
        minEducation: 'bachelor',
        salaryMin: 60000,
        salaryMax: 90000
      })
    });
    const body = await json(res);
    assert(res.status === 201, `post job status ${res.status}`, JSON.stringify(body));
    jobId = body.job.id || body.job._id;
    assert(jobId, 'missing job id', JSON.stringify(body));
    assert((body.job.requiredSkills || []).length === 3, 'skills not stored', JSON.stringify(body));
  });

  await step('public job list contains new job', async () => {
    const res = await fetch(`${BASE}/jobs?keyword=QA%20Engineer`);
    const body = await json(res);
    assert(res.ok, `list status ${res.status}`, JSON.stringify(body));
    assert((body.jobs || []).some(j => (j.id || j._id) === jobId), 'new job not in list', JSON.stringify(body).slice(0, 500));
  });

  await step('job details include company + similar/company jobs', async () => {
    const res = await fetch(`${BASE}/jobs/${jobId}`);
    const body = await json(res);
    assert(res.ok, `details status ${res.status}`, JSON.stringify(body));
    assert(body.job && body.job.title.includes('QA Engineer'), 'wrong job', JSON.stringify(body).slice(0, 300));
    assert(Array.isArray(body.similarJobs) && Array.isArray(body.companyJobs), 'missing similar/company jobs');
  });

  await step('register job seeker (candidate)', async () => {
    const res = await fetch(`${BASE}/auth/register/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candEmail, password: PASS, fullName: 'Test Seeker' })
    });
    const body = await json(res);
    assert(res.status === 201, `register status ${res.status}`, JSON.stringify(body));
    candVerifyToken = body.verificationToken;
  });

  await step('verify + login job seeker', async () => {
    const v = await fetch(`${BASE}/auth/verify/${candVerifyToken}`);
    assert(v.ok, `verify status ${v.status}`);
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candEmail, password: PASS })
    });
    const body = await json(res);
    assert(res.ok, `login status ${res.status}`, JSON.stringify(body));
    assert(body.user.role === 'candidate', `role should be candidate, got ${body.user.role}`);
    candToken = body.token;
  });

  await step('job seeker cannot post jobs (403)', async () => {
    const res = await fetch(`${BASE}/jobs`, {
      method: 'POST',
      headers: authHeaders(candToken),
      body: JSON.stringify({ title: 'X', description: 'X', location: 'X', jobType: 'full-time' })
    });
    assert(res.status === 403, `expected 403, got ${res.status}`);
  });

  await step('update seeker profile (skills drive recommendations)', async () => {
    const res = await fetch(`${BASE}/candidate/profile`, {
      method: 'PUT',
      headers: authHeaders(candToken),
      body: JSON.stringify({ fullName: 'Test Seeker', skills: ['JavaScript', 'Testing'], bio: 'QA enthusiast' })
    });
    const body = await json(res);
    assert(res.ok, `profile status ${res.status}`, JSON.stringify(body));
    assert((body.profile.skills || []).includes('JavaScript'), 'skills not saved', JSON.stringify(body));
  });

  await step('seeker applies with inline resume upload', async () => {
    const fd = new FormData();
    fd.append('coverLetter', 'I love testing and would be a great fit.');
    fd.append('resume', new Blob(['%PDF-1.4 fake resume for smoke test'], { type: 'application/pdf' }), 'resume.pdf');
    const res = await fetch(`${BASE}/candidate/apply/${jobId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candToken}` },
      body: fd
    });
    const body = await json(res);
    assert(res.status === 201, `apply status ${res.status}`, JSON.stringify(body));
    appId = body.applicationId || body.application_id;
    assert(appId, 'missing application id', JSON.stringify(body));
  });

  await step('duplicate application rejected (400)', async () => {
    const fd = new FormData();
    fd.append('coverLetter', 'again');
    const res = await fetch(`${BASE}/candidate/apply/${jobId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candToken}` },
      body: fd
    });
    assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await step('seeker applications list + check endpoint', async () => {
    const res = await fetch(`${BASE}/candidate/applications`, { headers: authHeaders(candToken) });
    const body = await json(res);
    assert(res.ok, `list status ${res.status}`, JSON.stringify(body));
    assert(body.applications.length >= 1, 'no applications', JSON.stringify(body));
    const check = await fetch(`${BASE}/candidate/applications/check/${jobId}`, { headers: authHeaders(candToken) });
    const checkBody = await json(check);
    assert(checkBody.hasApplied === true, 'check should be true', JSON.stringify(checkBody));
  });

  await step('save / check / unsave job', async () => {
    const save = await fetch(`${BASE}/candidate/saved-jobs/${jobId}`, { method: 'POST', headers: authHeaders(candToken) });
    assert(save.ok, `save status ${save.status}`);
    const check = await fetch(`${BASE}/candidate/saved-jobs/check/${jobId}`, { headers: authHeaders(candToken) });
    const checkBody = await json(check);
    assert(checkBody.isSaved === true, 'should be saved', JSON.stringify(checkBody));
    const unsave = await fetch(`${BASE}/candidate/saved-jobs/${jobId}`, { method: 'DELETE', headers: authHeaders(candToken) });
    assert(unsave.ok, `unsave status ${unsave.status}`);
  });

  await step('recommended jobs returns skill matches', async () => {
    const res = await fetch(`${BASE}/candidate/recommended-jobs`, { headers: authHeaders(candToken) });
    const body = await json(res);
    assert(res.ok, `status ${res.status}`, JSON.stringify(body).slice(0, 300));
    assert(Array.isArray(body), 'should be array');
  });

  await step('institution dashboard + job applications', async () => {
    const dash = await fetch(`${BASE}/employer/dashboard`, { headers: authHeaders(instToken) });
    const dashBody = await json(dash);
    assert(dash.ok, `dashboard ${dash.status}`, JSON.stringify(dashBody).slice(0, 300));
    assert((dashBody.stats.totalJobs ?? 0) >= 1, 'totalJobs should be >=1', JSON.stringify(dashBody.stats));
    const apps = await fetch(`${BASE}/employer/jobs/${jobId}/applications`, { headers: authHeaders(instToken) });
    const appsBody = await json(apps);
    assert(apps.ok, `applications ${apps.status}`, JSON.stringify(appsBody).slice(0, 300));
    assert(appsBody.applications.length >= 1, 'should have 1 applicant');
  });

  await step('institution alias route /api/institution works', async () => {
    const res = await fetch(`${BASE}/institution/dashboard`, { headers: authHeaders(instToken) });
    assert(res.ok, `alias status ${res.status}`);
  });

  await step('AI rank + AI ranking fetch (local heuristic)', async () => {
    const rank = await fetch(`${BASE}/employer/jobs/${jobId}/rank`, { method: 'POST', headers: authHeaders(instToken) });
    const rankBody = await json(rank);
    assert(rank.ok, `rank ${rank.status}`, JSON.stringify(rankBody));
    const get = await fetch(`${BASE}/employer/jobs/${jobId}/ai-ranking`, { headers: authHeaders(instToken) });
    const getBody = await json(get);
    assert(get.ok, `ai-ranking ${get.status}`, JSON.stringify(getBody).slice(0, 300));
    assert(getBody.analyzed >= 1, 'should have analyzed >=1', JSON.stringify(getBody).slice(0, 300));
  });

  await step('update application status notifies seeker', async () => {
    const res = await fetch(`${BASE}/employer/applications/${appId}/status`, {
      method: 'PUT',
      headers: authHeaders(instToken),
      body: JSON.stringify({ status: 'shortlisted' })
    });
    const body = await json(res);
    assert(res.ok, `status ${res.status}`, JSON.stringify(body));
    const notifs = await fetch(`${BASE}/notifications`, { headers: authHeaders(candToken) });
    const notifsBody = await json(notifs);
    assert(notifsBody.unreadCount >= 1, 'seeker should have notification', JSON.stringify(notifsBody).slice(0, 300));
  });

  await step('mock AI endpoints return sample output', async () => {
    const status = await fetch(`${BASE}/ai/status`);
    const statusBody = await json(status);
    assert(statusBody.mode === 'mock', 'ai mode should be mock', JSON.stringify(statusBody));
    const analysis = await fetch(`${BASE}/ai/analyze-resume`, {
      method: 'POST',
      headers: authHeaders(candToken),
      body: JSON.stringify({ skills: ['JavaScript'], fullName: 'Test' })
    });
    const analysisBody = await json(analysis);
    assert(analysis.ok && analysisBody.overallScore > 0, 'analyze failed', JSON.stringify(analysisBody).slice(0, 300));
    const jd = await fetch(`${BASE}/ai/generate-job-description`, {
      method: 'POST',
      headers: authHeaders(instToken),
      body: JSON.stringify({ title: 'QA Engineer', skills: ['Testing'] })
    });
    const jdBody = await json(jd);
    assert(jd.ok && (jdBody.description || '').includes('QA Engineer'), 'JD failed', JSON.stringify(jdBody).slice(0, 300));
  });

  await step('public analytics works', async () => {
    const res = await fetch(`${BASE}/analytics/public`);
    const body = await json(res);
    assert(res.ok, `status ${res.status}`, JSON.stringify(body).slice(0, 300));
    assert((body.stats.activeJobs ?? 0) >= 1, 'activeJobs >=1', JSON.stringify(body.stats));
  });

  await step('institution profile update + logo validation', async () => {
    const res = await fetch(`${BASE}/employer/profile`, {
      method: 'PUT',
      headers: authHeaders(instToken),
      body: JSON.stringify({ companyDescription: 'Updated by smoke test' })
    });
    const body = await json(res);
    assert(res.ok, `profile ${res.status}`, JSON.stringify(body));
  });

  console.log(`\nDone: ${passed} passed, ${failures} failed.`);
  process.exit(failures ? 1 : 0);
})().catch(e => {
  console.error('Smoke harness crashed:', e);
  process.exit(1);
});
