const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Job, EmployerProfile, JobReport, Notification } = require('../models');
const { auth, isVerifiedEmployer, isEmployer } = require('../middleware/auth');

const router = express.Router();

// Report threshold for auto-hiding jobs
const REPORT_THRESHOLD = 5;

// Create a new job
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
      jobType, category, requiredSkills, experienceLevel
    } = req.body;

    const job = await Job.create({
      employerId: req.user.id,
      title,
      description,
      location,
      salaryMin: salaryMin || null,
      salaryMax: salaryMax || null,
      jobType,
      category: category || '',
      requiredSkills: requiredSkills ? JSON.stringify(requiredSkills) : '[]',
      experienceLevel: experienceLevel || ''
    });

    res.status(201).json({
      message: 'Job posted successfully',
      job: { ...job.toObject(), required_skills: JSON.parse(job.requiredSkills || '[]') }
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all jobs (public - with filters and pagination)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { keyword, location, jobType, category, salaryMin, salaryMax, skills } = req.query;

    // Build filter object
    const filter = { status: 'open' };

    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (jobType) {
      filter.jobType = jobType;
    }

    if (category) {
      filter.category = category;
    }

    if (salaryMin) {
      filter.salaryMax = { $gte: parseInt(salaryMin) };
    }

    if (salaryMax) {
      filter.salaryMin = { $lte: parseInt(salaryMax) };
    }

    if (skills) {
      const skillList = skills.split(',');
      skillList.forEach(skill => {
        filter.requiredSkills = { $regex: skill.trim(), $options: 'i' };
      });
    }

    // Get total count
    const total = await Job.countDocuments(filter);

    // Get jobs with employer info
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get employer profiles for jobs
    const employerIds = [...new Set(jobs.map(j => j.employerId.toString()))];
    const profiles = await EmployerProfile.find({ userId: { $in: employerIds } }).lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.userId.toString()] = p; });

    // Add employer info to jobs
    const parsedJobs = jobs.map(job => ({
      ...job,
      requiredSkills: JSON.parse(job.requiredSkills || '[]'),
      companyName: profileMap[job.employerId.toString()]?.companyName,
      logoPath: profileMap[job.employerId.toString()]?.logoPath,
      companyLocation: profileMap[job.employerId.toString()]?.location
    }));

    res.json({
      jobs: parsedJobs,
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

    const jobs = await Job.find({ status: 'open' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get employer profiles
    const employerIds = [...new Set(jobs.map(j => j.employerId.toString()))];
    const profiles = await EmployerProfile.find({ userId: { $in: employerIds } }).lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.userId.toString()] = p; });

    const parsedJobs = jobs.map(job => ({
      ...job,
      requiredSkills: JSON.parse(job.requiredSkills || '[]'),
      companyName: profileMap[job.employerId.toString()]?.companyName,
      logoPath: profileMap[job.employerId.toString()]?.logoPath
    }));

    res.json(parsedJobs);
  } catch (error) {
    console.error('Get recent jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trending categories
router.get('/categories/trending', async (req, res) => {
  try {
    const categories = await Job.aggregate([
      { $match: { status: 'open', category: { $ne: '' } } },
      {
        $group: {
          _id: '$category',
          job_count: { $sum: 1 },
          total_applications: { $sum: '$applicationCount' }
        }
      },
      { $sort: { total_applications: -1, job_count: -1 } },
      { $limit: 8 },
      { $project: { category: '$_id', job_count: 1, total_applications: 1, _id: 0 } }
    ]);

    res.json(categories);
  } catch (error) {
    console.error('Get trending categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Job.aggregate([
      { $match: { status: 'open', category: { $ne: '' } } },
      { $group: { _id: '$category', job_count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { category: '$_id', job_count: 1, _id: 0 } }
    ]);

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single job details
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Get employer profile
    const profile = await EmployerProfile.findOne({ userId: job.employerId }).lean();

    // Parse skills
    job.requiredSkills = JSON.parse(job.requiredSkills || '[]');
    job.companyName = profile?.companyName;
    job.companyDescription = profile?.companyDescription;
    job.logoPath = profile?.logoPath;
    job.website = profile?.website;
    job.industry = profile?.industry;
    job.companyLocation = profile?.location;

    // Get similar jobs (same category or location)
    const similarJobs = await Job.find({
      status: 'open',
      _id: { $ne: job._id },
      $or: [
        { category: job.category },
        { location: { $regex: job.location.split(',')[0], $options: 'i' } }
      ]
    }).limit(4).lean();

    // Get employer info for similar jobs
    const similarEmployerIds = [...new Set(similarJobs.map(j => j.employerId.toString()))];
    const similarProfiles = await EmployerProfile.find({ userId: { $in: similarEmployerIds } }).lean();
    const similarProfileMap = {};
    similarProfiles.forEach(p => { similarProfileMap[p.userId.toString()] = p; });

    const formattedSimilarJobs = similarJobs.map(j => ({
      _id: j._id,
      title: j.title,
      location: j.location,
      jobType: j.jobType,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      companyName: similarProfileMap[j.employerId.toString()]?.companyName,
      logoPath: similarProfileMap[j.employerId.toString()]?.logoPath
    }));

    // Get more jobs from same company
    const companyJobs = await Job.find({
      status: 'open',
      employerId: job.employerId,
      _id: { $ne: job._id }
    }).limit(4).lean();

    const formattedCompanyJobs = companyJobs.map(j => ({
      _id: j._id,
      title: j.title,
      location: j.location,
      jobType: j.jobType,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax
    }));

    res.json({
      job,
      similarJobs: formattedSimilarJobs,
      companyJobs: formattedCompanyJobs
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update job (employer only)
router.put('/:id', auth, isEmployer, [
  body('title').optional().trim(),
  body('jobType').optional().isIn(['full-time', 'part-time', 'contract', 'internship', 'remote'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if job belongs to employer
    const job = await Job.findOne({ _id: req.params.id, employerId: req.user.id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    const {
      title, description, location, salaryMin, salaryMax,
      jobType, category, requiredSkills, experienceLevel, status
    } = req.body;

    // Update fields
    if (title) job.title = title;
    if (description) job.description = description;
    if (location) job.location = location;
    if (salaryMin !== undefined) job.salaryMin = salaryMin;
    if (salaryMax !== undefined) job.salaryMax = salaryMax;
    if (jobType) job.jobType = jobType;
    if (category !== undefined) job.category = category;
    if (requiredSkills) job.requiredSkills = JSON.stringify(requiredSkills);
    if (experienceLevel !== undefined) job.experienceLevel = experienceLevel;
    if (status) job.status = status;

    await job.save();

    const updatedJob = job.toObject();
    updatedJob.required_skills = JSON.parse(updatedJob.requiredSkills || '[]');

    res.json({
      message: 'Job updated successfully',
      job: updatedJob
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete job (employer only)
router.delete('/:id', auth, isEmployer, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, employerId: req.user.id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

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
      return res.status(403).json({ message: 'Only candidates can report jobs' });
    }

    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Report reason is required' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already reported
    const existingReport = await JobReport.findOne({
      jobId: req.params.id,
      candidateId: req.user.id
    });
    
    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this job' });
    }

    // Create report
    await JobReport.create({
      jobId: req.params.id,
      candidateId: req.user.id,
      reason,
      description: description || ''
    });

    // Increment report count
    job.reportCount += 1;

    // Check if threshold reached
    if (job.reportCount >= REPORT_THRESHOLD) {
      job.status = 'hidden';

      // Notify employer
      await Notification.create({
        userId: job.employerId,
        type: 'job_hidden',
        title: 'Job Hidden Due to Reports',
        message: 'Your job posting has been hidden due to multiple reports. Please review and update it.',
        relatedId: job._id
      });
    }

    await job.save();

    res.json({ message: 'Job reported successfully' });
  } catch (error) {
    console.error('Report job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
