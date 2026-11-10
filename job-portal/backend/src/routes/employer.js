const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { mapJob, mapApplication, mapCandidateProfile, mapEmployerProfile, mapUser, safeParseJSON } = require('../utils/mappers');
const { auth, isEmployer } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');
const { rankApplications } = require('../services/aiMatchingService');

const router = express.Router();

const nowISO = () => new Date().toISOString();

// Get institution dashboard stats
router.get('/dashboard', auth, isEmployer, async (req, res) => {
  try {
    const jobs = db.prepare('SELECT * FROM jobs WHERE employer_id = ?').all(req.user.id);
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'open').length;
    const closedJobs = jobs.filter(j => j.status === 'closed').length;
    const totalApplications = jobs.reduce((sum, j) => sum + (j.application_count || 0), 0);

    const recentRows = db.prepare('SELECT * FROM applications WHERE employer_id = ? ORDER BY created_at DESC LIMIT 5').all(req.user.id);
    const recentApplications = recentRows.map(r => {
      const app = mapApplication(r);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(r.job_id);
      const cand = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(r.candidate_id);
      return { ...app, jobTitle: job?.title, candidateName: cand?.full_name };
    });

    const statusRows = db.prepare('SELECT status, COUNT(*) as count FROM applications WHERE employer_id = ? GROUP BY status').all(req.user.id);
    const applicationStats = statusRows.map(r => ({ status: r.status, count: r.count }));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyRow = db.prepare('SELECT COUNT(*) as c FROM applications WHERE employer_id = ? AND created_at >= ?').get(req.user.id, startOfMonth.toISOString());

    res.json({
      stats: {
        totalJobs,
        activeJobs,
        closedJobs,
        totalApplications,
        applicationsThisMonth: monthlyRow?.c || 0
      },
      recentApplications,
      applicationStats
    });
  } catch (error) {
    console.error('Get institution dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get institution's jobs
router.get('/jobs', auth, isEmployer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM jobs WHERE employer_id = ? AND status = ? ORDER BY created_at DESC').all(req.user.id, status);
    } else {
      rows = db.prepare('SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC').all(req.user.id);
    }
    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    res.json({
      jobs: paged.map(j => mapJob(j)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalJobs: total
      }
    });
  } catch (error) {
    console.error('Get institution jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get applications for a specific job
router.get('/jobs/:jobId/applications', auth, isEmployer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const jobRow = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.jobId, req.user.id);
    if (!jobRow) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM applications WHERE job_id = ? AND status = ? ORDER BY created_at DESC').all(req.params.jobId, status);
    } else {
      rows = db.prepare('SELECT * FROM applications WHERE job_id = ? ORDER BY created_at DESC').all(req.params.jobId);
    }
    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    const applications = paged.map(r => {
      const app = mapApplication(r);
      const candRow = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(r.candidate_id);
      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(r.candidate_id);
      const cand = candRow ? mapCandidateProfile(candRow) : null;
      return {
        ...app,
        full_name: cand?.fullName,
        fullName: cand?.fullName,
        skills: cand?.skills || [],
        experience: cand?.experience || [],
        education: cand?.education || [],
        location: cand?.location,
        bio: cand?.bio,
        profile_resume: cand?.resumePath,
        resumePath: app.resumePath,
        email: userRow?.email,
      };
    });

    res.json({
      job: mapJob(jobRow),
      applications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalApplications: total
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update application status
router.put('/applications/:id/status', auth, isEmployer, [
  body('status').isIn(['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const application = db.prepare('SELECT * FROM applications WHERE id = ? AND employer_id = ?').get(req.params.id, req.user.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found or unauthorized' });
    }

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(application.job_id);
    const employerRow = db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(req.user.id);
    const employer = employerRow ? mapEmployerProfile(employerRow) : null;

    db.prepare('UPDATE applications SET status = ?, updated_at = ? WHERE id = ?').run(status, nowISO(), req.params.id);

    let notifType = 'application_status';
    let notifTitle = 'Application Status Updated';
    let notifMessage = '';
    const companyName = employer?.companyName || 'the company';
    switch (status) {
      case 'reviewed':
        notifMessage = `Your application for "${job?.title}" at ${companyName} has been reviewed.`;
        break;
      case 'shortlisted':
        notifType = 'shortlisted';
        notifTitle = "You've Been Shortlisted";
        notifMessage = `Great news! You have been shortlisted for "${job?.title}" at ${companyName}. The institution is interested in your profile!`;
        break;
      case 'rejected':
        notifType = 'rejected';
        notifTitle = 'Application Update';
        notifMessage = `Thank you for your interest in "${job?.title}" at ${companyName}. Unfortunately, the institution has decided to move forward with other candidates. Keep applying!`;
        break;
      case 'hired':
        notifType = 'hired';
        notifTitle = "You've Been Hired!";
        notifMessage = `Amazing news! You have been selected for "${job?.title}" at ${companyName}. The institution will contact you soon with next steps.`;
        break;
      default:
        notifMessage = `Your application status for "${job?.title}" has been updated to ${status}.`;
    }

    db.prepare('INSERT INTO notifications (id, user_id, type, title, message, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), application.candidate_id, notifType, notifTitle, notifMessage, application.job_id, 0, nowISO());

    res.json({ message: 'Application status updated successfully', status });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update institution profile
router.put('/profile', auth, isEmployer, async (req, res) => {
  try {
    const { companyName, companyDescription, industry, companySize, website, location, phone } = req.body;
    const existing = db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(req.user.id);
    if (!existing) return res.status(404).json({ message: 'Profile not found' });

    db.prepare(
      `UPDATE employer_profiles SET company_name = COALESCE(?, company_name), company_description = COALESCE(?, company_description), industry = COALESCE(?, industry), company_size = COALESCE(?, company_size), website = COALESCE(?, website), location = COALESCE(?, location), phone = COALESCE(?, phone), updated_at = ? WHERE user_id = ?`
    ).run(companyName ?? null, companyDescription ?? null, industry ?? null, companySize ?? null, website ?? null, location ?? null, phone ?? null, nowISO(), req.user.id);

    const fresh = db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(req.user.id);
    res.json({ message: 'Profile updated successfully', profile: mapEmployerProfile(fresh) });
  } catch (error) {
    console.error('Update institution profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload company logo
router.post('/logo', auth, isEmployer, uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const logoPath = `/uploads/logos/${req.file.filename}`;
    db.prepare('UPDATE employer_profiles SET logo_path = ?, updated_at = ? WHERE user_id = ?').run(logoPath, nowISO(), req.user.id);
    res.json({ message: 'Logo uploaded successfully', logoPath });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public company page
router.get('/company/:id', async (req, res) => {
  try {
    const profileRow = db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(req.params.id);
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!profileRow) {
      return res.status(404).json({ message: 'Company not found' });
    }
    const profile = mapEmployerProfile(profileRow);
    profile.member_since = userRow?.created_at;
    profile.memberSince = userRow?.created_at;

    const jobRows = db.prepare("SELECT * FROM jobs WHERE employer_id = ? AND status = 'open' ORDER BY created_at DESC").all(req.params.id);
    const formattedJobs = jobRows.map(j => ({
      id: j.id, _id: j.id, title: j.title, location: j.location,
      job_type: j.job_type, jobType: j.job_type,
      salary_min: j.salary_min, salaryMin: j.salary_min,
      salary_max: j.salary_max, salaryMax: j.salary_max,
      category: j.category, created_at: j.created_at, createdAt: j.created_at
    }));

    res.json({ company: profile, jobs: formattedJobs, jobCount: jobRows.length });
  } catch (error) {
    console.error('Get company page error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get candidate profile for an application (institution viewing applicant)
router.get('/applications/:id/candidate', auth, isEmployer, async (req, res) => {
  try {
    const application = db.prepare('SELECT * FROM applications WHERE id = ? AND employer_id = ?').get(req.params.id, req.user.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found or unauthorized' });
    }
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(application.job_id);
    const candidateRow = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(application.candidate_id);
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(application.candidate_id);
    if (!candidateRow) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }
    const candidate = mapCandidateProfile(candidateRow);
    const parsedCandidate = { ...candidate, email: userRow?.email, member_since: userRow?.created_at, memberSince: userRow?.created_at };

    const jobSkills = safeParseJSON(job?.required_skills).map(s => String(s).toLowerCase());
    const candidateSkills = (parsedCandidate.skills || []).map(s => String(s).toLowerCase());
    const matchingSkills = jobSkills.filter(js => candidateSkills.some(cs => cs.includes(js) || js.includes(cs)));
    const matchScore = jobSkills.length > 0 ? Math.round((matchingSkills.length / jobSkills.length) * 100) : 0;

    res.json({
      application: {
        id: application.id, _id: application.id,
        status: application.status,
        cover_letter: application.cover_letter, coverLetter: application.cover_letter,
        resume_path: application.resume_path, resumePath: application.resume_path,
        applied_at: application.created_at, appliedAt: application.created_at,
        job_title: job?.title, jobTitle: job?.title
      },
      candidate: parsedCandidate,
      matchScore,
      matchingSkills
    });
  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recommended candidates for a job (based on skills match from applicants only)
router.get('/jobs/:jobId/recommended-candidates', auth, isEmployer, async (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.jobId, req.user.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }
    const jobSkills = safeParseJSON(job.required_skills);
    const applications = db.prepare('SELECT * FROM applications WHERE job_id = ?').all(req.params.jobId);
    const rankedApplicants = applications.map(app => {
      const candRow = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(app.candidate_id);
      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(app.candidate_id);
      const cand = candRow ? mapCandidateProfile(candRow) : null;
      const candidateSkills = (cand?.skills || []).map(s => String(s).toLowerCase());
      const matchingSkills = jobSkills.filter(skill =>
        candidateSkills.some(cs => cs.includes(String(skill).toLowerCase()) || String(skill).toLowerCase().includes(cs))
      );
      const matchScore = jobSkills.length > 0 ? Math.round((matchingSkills.length / jobSkills.length) * 100) : 0;
      return {
        application_id: app.id, applicationId: app.id,
        status: app.status, applied_at: app.created_at, appliedAt: app.created_at,
        full_name: cand?.fullName, fullName: cand?.fullName,
        skills: cand?.skills || [], location: cand?.location,
        experience: cand?.experience || [], email: userRow?.email,
        matchScore, matchingSkills
      };
    });
    rankedApplicants.sort((a, b) => b.matchScore - a.matchScore);
    res.json(rankedApplicants);
  } catch (error) {
    console.error('Get recommended candidates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── AI Ranking Endpoints ─────────────────────────────────────────────────────
router.post('/jobs/:jobId/rank', auth, isEmployer, async (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.jobId, req.user.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }
    const rankedResults = await rankApplications(req.params.jobId);
    res.json({
      message: `AI analysis complete. ${rankedResults.length} candidate(s) ranked.`,
      totalAnalyzed: rankedResults.length,
      rankedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI ranking error:', error);
    res.status(500).json({ message: 'AI analysis failed: ' + error.message });
  }
});

router.get('/jobs/:jobId/ai-ranking', auth, isEmployer, async (req, res) => {
  try {
    const jobRow = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.jobId, req.user.id);
    if (!jobRow) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }
    const applications = db.prepare('SELECT * FROM applications WHERE job_id = ? ORDER BY rank_position ASC, overall_match_pct DESC').all(req.params.jobId);
    const enriched = applications.map(app => {
      const profileRow = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(app.candidate_id);
      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(app.candidate_id);
      const profile = profileRow ? mapCandidateProfile(profileRow) : null;
      return {
        applicationId: app.id,
        candidateId: app.candidate_id,
        status: app.status,
        appliedAt: app.created_at,
        resumePath: app.resume_path,
        coverLetter: app.cover_letter,
        rankPosition: app.rank_position || 0,
        overallMatchPct: app.overall_match_pct || 0,
        skillMatchPct: app.skill_match_pct || 0,
        experienceMatchPct: app.experience_match_pct || 0,
        educationMatchPct: app.education_match_pct || 0,
        aiAnalyzedAt: app.ai_analyzed_at || null,
        fullName: profile?.fullName || 'Unknown',
        email: userRow?.email,
        location: profile?.location,
        skills: profile?.skills || [],
        experience: profile?.experience || [],
        education: profile?.education || [],
        profilePicture: profile?.profilePicture
      };
    });
    res.json({
      job: mapJob(jobRow),
      candidates: enriched,
      totalApplications: enriched.length,
      analyzed: enriched.filter(c => c.aiAnalyzedAt).length
    });
  } catch (error) {
    console.error('Get AI ranking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
