const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { mapJob, mapEmployerProfile, safeParseJSON } = require('../utils/mappers');
const { auth, isVerifiedEmployer, isEmployer } = require('../middleware/auth');

const router = express.Router();
const REPORT_THRESHOLD = 5;

const getCompanyMap = (employerIds) => {
  const map = {};
  const unique = [...new Set(employerIds.filter(Boolean))];
  for (const id of unique) {
    const row = db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(id);
    if (row) map[id] = mapEmployerProfile(row);
  }
  return map;
};

// Create a new job — Institution / Company only
router.post('/', auth, isVerifiedEmployer, [
  body('title').notEmpty().trim(),
  body('description').notEmpty(),
  body('location').notEmpty().trim(),
  body('jobType').isIn(['full-time', 'part-time', 'contract', 'internship', 'remote'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title, description, location, salaryMin, salaryMax,
      jobType, category, requiredSkills, experienceLevel,
      minExperienceYears, minEducation
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();
    const skillsStr = requiredSkills ? JSON.stringify(requiredSkills) : '[]';

    db.prepare(
      `INSERT INTO jobs (id, employer_id, title, description, location, salary_min, salary_max, job_type, category, required_skills, experience_level, min_experience_years, min_education, status, report_count, application_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, 0, ?, ?)`
    ).run(id, req.user.id, title, description, location,
      salaryMin != null && salaryMin !== '' ? Number(salaryMin) : null,
      salaryMax != null && salaryMax !== '' ? Number(salaryMax) : null,
      jobType, category || '', skillsStr, experienceLevel || '',
      minExperienceYears != null && minExperienceYears !== '' ? Number(minExperienceYears) : 0,
      minEducation || 'any', now, now);

    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    res.status(201).json({
      message: 'Job posted successfully',
      job: mapJob(row)
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all jobs (public - with filters and pagination). Filtering done in JS over SQLite rows.
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { keyword, location, jobType, category, salaryMin, salaryMax, skills } = req.query;

    let rows = db.prepare("SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC").all();

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      rows = rows.filter(j => (j.title || '').toLowerCase().includes(kw) || (j.description || '').toLowerCase().includes(kw));
    }
    if (location) {
      const loc = String(location).toLowerCase();
      rows = rows.filter(j => (j.location || '').toLowerCase().includes(loc));
    }
    if (jobType) rows = rows.filter(j => j.job_type === jobType);
    if (category) rows = rows.filter(j => j.category === category);
    if (salaryMin) rows = rows.filter(j => j.salary_max == null || Number(j.salary_max) >= parseInt(salaryMin));
    if (salaryMax) rows = rows.filter(j => j.salary_min == null || Number(j.salary_min) <= parseInt(salaryMax));
    if (skills) {
      const skillList = String(skills).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      rows = rows.filter(j => {
        const js = safeParseJSON(j.required_skills).map(s => String(s).toLowerCase());
        return skillList.every(s => js.some(x => x.includes(s) || s.includes(x)));
      });
    }

    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);
    const profileMap = getCompanyMap(paged.map(j => j.employer_id));
    const jobs = paged.map(j => mapJob(j, profileMap[j.employer_id] || null));

    res.json({
      jobs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalJobs: total,
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent jobs (for homepage)
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const rows = db.prepare("SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC LIMIT ?").all(limit);
    const profileMap = getCompanyMap(rows.map(j => j.employer_id));
    res.json(rows.map(j => mapJob(j, profileMap[j.employer_id] || null)));
  } catch (error) {
    console.error('Get recent jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trending categories
router.get('/categories/trending', async (req, res) => {
  try {
    const rows = db.prepare("SELECT category, COUNT(*) as job_count, COALESCE(SUM(application_count),0) as total_applications FROM jobs WHERE status='open' AND category != '' GROUP BY category ORDER BY total_applications DESC, job_count DESC LIMIT 8").all();
    res.json(rows.map(r => ({ category: r.category, job_count: r.job_count, total_applications: r.total_applications })));
  } catch (error) {
    console.error('Get trending categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const rows = db.prepare("SELECT category, COUNT(*) as job_count FROM jobs WHERE status='open' AND category != '' GROUP BY category ORDER BY category ASC").all();
    res.json(rows.map(r => ({ category: r.category, job_count: r.job_count })));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single job details
router.get('/:id', async (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const profileRow = db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(row.employer_id);
    const profile = profileRow ? mapEmployerProfile(profileRow) : null;
    const job = mapJob(row, profile);

    const allOpen = db.prepare("SELECT * FROM jobs WHERE status='open' AND id != ?").all(row.id);
    const locHead = String(row.location || '').split(',')[0].toLowerCase().trim();
    const similar = allOpen.filter(j =>
      (row.category && j.category === row.category) ||
      (locHead && String(j.location || '').toLowerCase().includes(locHead))
    ).slice(0, 4);
    const simMap = getCompanyMap(similar.map(j => j.employer_id));
    const formattedSimilarJobs = similar.map(j => {
      const m = mapJob(j, simMap[j.employer_id] || null);
      return {
        _id: m.id, id: m.id, title: m.title, location: m.location,
        jobType: m.jobType, job_type: m.job_type,
        salaryMin: m.salaryMin, salary_min: m.salaryMin,
        salaryMax: m.salaryMax, salary_max: m.salaryMax,
        companyName: m.companyName, company_name: m.companyName,
        logoPath: m.logoPath, logo_path: m.logoPath
      };
    });

    const companyRows = db.prepare("SELECT * FROM jobs WHERE status='open' AND employer_id = ? AND id != ? LIMIT 4").all(row.employer_id, row.id);
    const formattedCompanyJobs = companyRows.map(j => ({
      _id: j.id, id: j.id, title: j.title, location: j.location,
      jobType: j.job_type, job_type: j.job_type,
      salaryMin: j.salary_min, salary_min: j.salary_min,
      salaryMax: j.salary_max, salary_max: j.salary_max
    }));

    res.json({ job, similarJobs: formattedSimilarJobs, companyJobs: formattedCompanyJobs });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update job (institution only)
router.put('/:id', auth, isEmployer, [
  body('title').optional().trim(),
  body('jobType').optional().isIn(['full-time', 'part-time', 'contract', 'internship', 'remote'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, req.user.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    const {
      title, description, location, salaryMin, salaryMax,
      jobType, category, requiredSkills, experienceLevel, status,
      minExperienceYears, minEducation
    } = req.body;

    const updated = {
      title: title ?? job.title,
      description: description ?? job.description,
      location: location ?? job.location,
      salary_min: salaryMin !== undefined ? (salaryMin === null || salaryMin === '' ? null : Number(salaryMin)) : job.salary_min,
      salary_max: salaryMax !== undefined ? (salaryMax === null || salaryMax === '' ? null : Number(salaryMax)) : job.salary_max,
      job_type: jobType ?? job.job_type,
      category: category !== undefined ? category : job.category,
      required_skills: requiredSkills ? JSON.stringify(requiredSkills) : job.required_skills,
      experience_level: experienceLevel !== undefined ? experienceLevel : job.experience_level,
      min_experience_years: minExperienceYears !== undefined ? (Number(minExperienceYears) || 0) : (job.min_experience_years || 0),
      min_education: minEducation !== undefined ? minEducation : (job.min_education || 'any'),
      status: status ?? job.status,
      updated_at: new Date().toISOString(),
    };

    db.prepare(
      `UPDATE jobs SET title=?, description=?, location=?, salary_min=?, salary_max=?, job_type=?, category=?, required_skills=?, experience_level=?, min_experience_years=?, min_education=?, status=?, updated_at=? WHERE id=?`
    ).run(updated.title, updated.description, updated.location, updated.salary_min, updated.salary_max,
      updated.job_type, updated.category, updated.required_skills, updated.experience_level,
      updated.min_experience_years, updated.min_education, updated.status, updated.updated_at, req.params.id);

    const fresh = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    res.json({ message: 'Job updated successfully', job: mapJob(fresh) });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete job (institution only)
router.delete('/:id', auth, isEmployer, async (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, req.user.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }
    db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Report a job (candidate only)
router.post('/:id/report', auth, async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ message: 'Only job seekers can report jobs' });
    }
    const { reason, description } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Report reason is required' });
    }
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const existingReport = db.prepare('SELECT * FROM job_reports WHERE job_id = ? AND candidate_id = ?').get(req.params.id, req.user.id);
    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this job' });
    }
    db.prepare('INSERT INTO job_reports (id, job_id, candidate_id, reason, description, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), req.params.id, req.user.id, reason, description || '', new Date().toISOString());

    const newCount = (job.report_count || 0) + 1;
    const newStatus = newCount >= REPORT_THRESHOLD ? 'hidden' : job.status;
    db.prepare('UPDATE jobs SET report_count = ?, status = ? WHERE id = ?').run(newCount, newStatus, job.id);

    if (newCount >= REPORT_THRESHOLD) {
      db.prepare('INSERT INTO notifications (id, user_id, type, title, message, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), job.employer_id, 'job_hidden', 'Job Hidden Due to Reports',
          'Your job posting has been hidden due to multiple reports. Please review and update it.', job.id, 0, new Date().toISOString());
    }

    res.json({ message: 'Job reported successfully' });
  } catch (error) {
    console.error('Report job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
