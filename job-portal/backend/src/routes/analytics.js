const express = require('express');
const { User, Job, Application } = require('../models');

const router = express.Router();

// Get public analytics/stats (for homepage)
router.get('/public', async (req, res) => {
  try {
    // Total stats
    const stats = {
      totalCandidates: await User.countDocuments({ role: 'candidate' }),
      totalEmployers: await User.countDocuments({ role: 'employer' }),
      totalJobs: await Job.countDocuments(),
      activeJobs: await Job.countDocuments({ status: 'open' }),
      totalApplications: await Application.countDocuments()
    };

    // Most applied categories
    const topCategories = await Job.aggregate([
      { $match: { category: { $ne: '' }, status: 'open' } },
      {
        $group: {
          _id: '$category',
          applications: { $sum: '$applicationCount' },
          jobs: { $sum: 1 }
        }
      },
      { $sort: { applications: -1 } },
      { $limit: 6 },
      { $project: { category: '$_id', applications: 1, jobs: 1, _id: 0 } }
    ]);

    // Job type distribution
    const jobTypes = await Job.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$jobType', count: { $sum: 1 } } },
      { $project: { job_type: '$_id', count: 1, _id: 0 } }
    ]);

    // Top locations
    const topLocations = await Job.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $project: { location: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      stats,
      topCategories,
      jobTypes,
      topLocations
    });
  } catch (error) {
    console.error('Get public analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
