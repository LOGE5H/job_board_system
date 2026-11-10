const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { mapJob, mapApplication, mapCandidateProfile, mapEmployerProfile, safeParseJSON } = require('../utils/mappers');
const { auth, isCandidate } = require('../middleware/auth');
const { uploadResume, uploadProfilePicture } = require('../middleware/upload');

const router = express.Router();
const nowISO = () => new Date().toISOString();

// Get candidate dashboard
router.get('/dashboard', auth, isCandidate, async (req, res) => {
  try {
    const applications = db.prepare('SELECT * FROM applications WHERE candidate_id = ?').all(req.user.id);
    const applicationStats = {
      totalApplications: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      reviewed: applications.filter(a => a.status === 'reviewed').length,
      shortlisted: applications.filter(a => a.status === 'shortlisted').length,
      rejected: applications.filter(a => a.status === 'rejected').length
    };

    const savedRow = db.prepare('SELECT COUNT(*) as c FROM saved_jobs WHERE candidate_id = ?').get(req.user.id);
    const savedCount = savedRow?.c || 0;

    const recentRows = db.prepare('SELECT * FROM applications WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 5').all(req.user.id);
    const recentApplications = recentRows.map(app => {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(app.job_id);
      const employerRow = job ? db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(job.employer_id) : null;
      return {
        ...mapApplication(app),
        jobTitle: job?.title,
        job_title: job?.title,
        location: job?.location,
        jobType: job?.job_type,
        job_type: job?.job_type,
        companyName: employerRow?.company_name,
        company_name: employerRow?.company_name,
        logoPath: employerRow?.logo_path,
        logo_path: employerRow?.logo_path,
      };
    });

    const unreadRow = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);

    res.json({
      stats: {
        ...applicationStats,
        savedJobs: savedCount,
        unreadNotifications: unreadRow?.c || 0
      },
      recentApplications
    });
  } catch (error) {
    console.error('Get candidate dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get candidate profile
router.get('/profile', auth, isCandidate, async (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(req.user.id);
    res.json(row ? mapCandidateProfile(row) : null);
  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', auth, isCandidate, async (req, res) => {
  try {
    const { fullName, phone, location, headline, bio, skills, education, experience, linkedinUrl, githubUrl, portfolioUrl } = req.body;

    const existing = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(req.user.id);
    if (!existing) return res.status(404).json({ message: 'Profile not found' });

    db.prepare(
      `UPDATE candidate_profiles SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        location = COALESCE(?, location),
        headline = COALESCE(?, headline),
        bio = COALESCE(?, bio),
        skills = COALESCE(?, skills),
        education = COALESCE(?, education),
        experience = COALESCE(?, experience),
        linkedin_url = COALESCE(?, linkedin_url),
        github_url = COALESCE(?, github_url),
        portfolio_url = COALESCE(?, portfolio_url),
        updated_at = ?
      WHERE user_id = ?`
    ).run(
      fullName ?? null, phone ?? null, location ?? null, headline ?? null, bio ?? null,
      skills ? JSON.stringify(skills) : null,
      education ? JSON.stringify(education) : null,
      experience ? JSON.stringify(experience) : null,
      linkedinUrl ?? null, githubUrl ?? null, portfolioUrl ?? null,
      nowISO(), req.user.id
    );

    const fresh = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(req.user.id);
    const profile = mapCandidateProfile(fresh);
    res.json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error('Update candidate profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload resume
router.post('/resume', auth, isCandidate, uploadResume.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const resumePath = `/uploads/resumes/${req.file.filename}`;
    db.prepare('UPDATE candidate_profiles SET resume_path = ?, updated_at = ? WHERE user_id = ?').run(resumePath, nowISO(), req.user.id);
    res.json({ message: 'Resume uploaded successfully', resumePath, resume_path: resumePath });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile picture
router.post('/profile-picture', auth, isCandidate, uploadProfilePicture.single('picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const picturePath = `/uploads/profiles/${req.file.filename}`;
    db.prepare('UPDATE candidate_profiles SET profile_picture = ?, updated_at = ? WHERE user_id = ?').run(picturePath, nowISO(), req.user.id);
    res.json({ message: 'Profile picture uploaded successfully', picturePath, picture_path: picturePath });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Apply to a job
router.post('/apply/:jobId', auth, isCandidate, uploadResume.single('resume'), async (req, res) => {
  try {
    const { coverLetter } = req.body;
    const jobId = req.params.jobId;

    const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'open'").get(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found or no longer accepting applications' });
    }

    const existingApplication = db.prepare('SELECT * FROM applications WHERE job_id = ? AND candidate_id = ?').get(jobId, req.user.id);
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }

    const profileRow = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(req.user.id);
    const profile = profileRow ? mapCandidateProfile(profileRow) : null;

    let resumePath = req.file ? `/uploads/resumes/${req.file.filename}` : profile?.resumePath;
    if (!resumePath) {
      return res.status(400).json({ message: 'Please upload a resume to apply' });
    }

    const appId = uuidv4();
    db.prepare(
      'INSERT INTO applications (id, job_id, candidate_id, employer_id, resume_path, cover_letter, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(appId, jobId, req.user.id, job.employer_id, resumePath, coverLetter || '', 'pending', nowISO(), nowISO());

    db.prepare('UPDATE jobs SET application_count = COALESCE(application_count,0) + 1 WHERE id = ?').run(jobId);

    db.prepare('INSERT INTO notifications (id, user_id, type, title, message, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), job.employer_id, 'new_application', 'New Application Received',
        `${profile?.fullName || 'A candidate'} applied for ${job.title}`, jobId, 0, nowISO());

    res.status(201).json({ message: 'Application submitted successfully', applicationId: appId, application_id: appId });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get applied jobs
router.get('/applications', auth, isCandidate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM applications WHERE candidate_id = ? AND status = ? ORDER BY created_at DESC').all(req.user.id, status);
    } else {
      rows = db.prepare('SELECT * FROM applications WHERE candidate_id = ? ORDER BY created_at DESC').all(req.user.id);
    }
    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    const applications = paged.map(app => {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(app.job_id);
      const employerRow = job ? db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(job.employer_id) : null;
      return {
        ...mapApplication(app),
        jobTitle: job?.title, job_title: job?.title,
        location: job?.location,
        jobType: job?.job_type, job_type: job?.job_type,
        salaryMin: job?.salary_min, salary_min: job?.salary_min,
        salaryMax: job?.salary_max, salary_max: job?.salary_max,
        companyName: employerRow?.company_name, company_name: employerRow?.company_name,
        companyLogo: employerRow?.logo_path, company_logo: employerRow?.logo_path,
      };
    });

    res.json({
      applications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalApplications: total
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save/Bookmark a job
router.post('/saved-jobs/:jobId', auth, isCandidate, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const existing = db.prepare('SELECT * FROM saved_jobs WHERE candidate_id = ? AND job_id = ?').get(req.user.id, jobId);
    if (existing) {
      return res.status(400).json({ message: 'Job already saved' });
    }
    db.prepare('INSERT INTO saved_jobs (id, candidate_id, job_id, created_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), req.user.id, jobId, nowISO());
    res.json({ message: 'Job saved successfully' });
  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove saved job
router.delete('/saved-jobs/:jobId', auth, isCandidate, async (req, res) => {
  try {
    db.prepare('DELETE FROM saved_jobs WHERE candidate_id = ? AND job_id = ?').run(req.user.id, req.params.jobId);
    res.json({ message: 'Job removed from saved list' });
  } catch (error) {
    console.error('Remove saved job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get saved jobs
router.get('/saved-jobs', auth, isCandidate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const totalRow = db.prepare('SELECT COUNT(*) as c FROM saved_jobs WHERE candidate_id = ?').get(req.user.id);
    const total = totalRow?.c || 0;
    const saved = db.prepare('SELECT * FROM saved_jobs WHERE candidate_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(req.user.id, limit, (page - 1) * limit);

    const savedJobs = [];
    for (const s of saved) {
      const jobRow = db.prepare('SELECT * FROM jobs WHERE id = ?').get(s.job_id);
      if (!jobRow) continue;
      const employerRow = db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(jobRow.employer_id);
      const employer = employerRow ? mapEmployerProfile(employerRow) : null;
      savedJobs.push({ ...mapJob(jobRow, employer), savedAt: s.created_at, saved_at: s.created_at });
    }

    res.json({
      savedJobs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSaved: total
      }
    });
  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if job is saved
router.get('/saved-jobs/check/:jobId', auth, isCandidate, async (req, res) => {
  try {
    const saved = db.prepare('SELECT * FROM saved_jobs WHERE candidate_id = ? AND job_id = ?').get(req.user.id, req.params.jobId);
    res.json({ isSaved: !!saved, is_saved: !!saved });
  } catch (error) {
    console.error('Check saved job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if already applied to a job
router.get('/applications/check/:jobId', auth, isCandidate, async (req, res) => {
  try {
    const application = db.prepare('SELECT * FROM applications WHERE candidate_id = ? AND job_id = ?').get(req.user.id, req.params.jobId);
    res.json({
      hasApplied: !!application,
      has_applied: !!application,
      application: application ? { id: application.id, _id: application.id, status: application.status } : null
    });
  } catch (error) {
    console.error('Check application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recommended jobs based on skills and preferences
router.get('/recommended-jobs', auth, isCandidate, async (req, res) => {
  try {
    const profileRow = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(req.user.id);
    if (!profileRow) {
      return res.json([]);
    }
    const profile = mapCandidateProfile(profileRow);
    const skills = profile.skills || [];

    const appliedRows = db.prepare('SELECT job_id FROM applications WHERE candidate_id = ?').all(req.user.id);
    const appliedJobIds = new Set(appliedRows.map(a => a.job_id));

    let jobs = db.prepare("SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC LIMIT 100").all();
    jobs = jobs.filter(job => !appliedJobIds.has(job.id));

    const employerIds = [...new Set(jobs.map(j => j.employer_id))];
    const profileMap = {};
    for (const id of employerIds) {
      const r = db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(id);
      if (r) profileMap[id] = mapEmployerProfile(r);
    }

    const scoredJobs = jobs.map(jobRow => {
      const jobSkills = safeParseJSON(jobRow.required_skills).map(s => String(s).toLowerCase());
      const candidateSkillsLower = skills.map(s => String(s).toLowerCase());
      const matchingSkills = jobSkills.filter(js =>
        candidateSkillsLower.some(cs => cs.includes(js) || js.includes(cs))
      );
      const skillScore = jobSkills.length > 0 ? (matchingSkills.length / jobSkills.length) * 100 : 0;
      return {
        ...mapJob(jobRow, profileMap[jobRow.employer_id] || null),
        matchScore: Math.round(skillScore),
        match_score: Math.round(skillScore),
        matchingSkills,
        matching_skills: matchingSkills
      };
    });

    const recommended = scoredJobs
      .filter(job => job.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    res.json(recommended);
  } catch (error) {
    console.error('Get recommended jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
