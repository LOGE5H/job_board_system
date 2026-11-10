const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get public analytics/stats (for homepage)
router.get('/public', async (req, res) => {
  try {
    const candRow = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'candidate'").get();
    const empRow = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'employer'").get();
    const jobsRow = db.prepare('SELECT COUNT(*) as c FROM jobs').get();
    const activeRow = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'open'").get();
    const appsRow = db.prepare('SELECT COUNT(*) as c FROM applications').get();

    const stats = {
      totalCandidates: candRow?.c || 0,
      totalEmployers: empRow?.c || 0,
      totalInstitutions: empRow?.c || 0,
      totalJobs: jobsRow?.c || 0,
      activeJobs: activeRow?.c || 0,
      totalApplications: appsRow?.c || 0
    };

    const topCategories = db.prepare(
      "SELECT category, COALESCE(SUM(application_count),0) as applications, COUNT(*) as jobs FROM jobs WHERE category != '' AND status='open' GROUP BY category ORDER BY applications DESC LIMIT 6"
    ).all().map(r => ({ category: r.category, applications: r.applications, jobs: r.jobs }));

    const jobTypes = db.prepare(
      "SELECT job_type as job_type, COUNT(*) as count FROM jobs WHERE status='open' GROUP BY job_type"
    ).all().map(r => ({ job_type: r.job_type, jobType: r.job_type, count: r.count }));

    const topLocations = db.prepare(
      "SELECT location, COUNT(*) as count FROM jobs WHERE status='open' GROUP BY location ORDER BY count DESC LIMIT 6"
    ).all().map(r => ({ location: r.location, count: r.count }));

    res.json({ stats, topCategories, jobTypes, topLocations });
  } catch (error) {
    console.error('Get public analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
