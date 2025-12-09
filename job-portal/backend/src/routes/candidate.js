const express = require('express');
const { body, validationResult } = require('express-validator');
const { Job, Application, CandidateProfile, EmployerProfile, SavedJob, Notification } = require('../models');
const { auth, isCandidate } = require('../middleware/auth');
const { uploadResume, uploadProfilePicture } = require('../middleware/upload');

const router = express.Router();

// Get candidate dashboard
router.get('/dashboard', auth, isCandidate, async (req, res) => {
  try {
    // Get application stats
    const applications = await Application.find({ candidateId: req.user.id });
    const applicationStats = {
      totalApplications: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      reviewed: applications.filter(a => a.status === 'reviewed').length,
      shortlisted: applications.filter(a => a.status === 'shortlisted').length,
      rejected: applications.filter(a => a.status === 'rejected').length
    };

    // Get saved jobs count
    const savedCount = await SavedJob.countDocuments({ candidateId: req.user.id });

    // Get recent applications with job and employer info
    const recentApps = await Application.find({ candidateId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentApplications = [];
    for (let app of recentApps) {
      const job = await Job.findById(app.jobId).lean();
      const employer = await EmployerProfile.findOne({ userId: job?.employerId }).lean();
      recentApplications.push({
        ...app,
        jobTitle: job?.title,
        location: job?.location,
        jobType: job?.jobType,
        companyName: employer?.companyName,
        logoPath: employer?.logoPath
      });
    }

    // Get unread notifications count
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });

    res.json({
      stats: {
        ...applicationStats,
        savedJobs: savedCount,
        unreadNotifications: unreadCount
      },
      recentApplications
    });
  } catch (error) {
    console.error('Get candidate dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get/Update candidate profile
router.get('/profile', auth, isCandidate, async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({ userId: req.user.id }).lean();
    
    if (profile) {
      profile.skills = JSON.parse(profile.skills || '[]');
      profile.education = JSON.parse(profile.education || '[]');
      profile.experience = JSON.parse(profile.experience || '[]');
    }

    res.json(profile);
  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', auth, isCandidate, async (req, res) => {
  try {
    const {
      fullName, phone, location, bio, skills, education, experience, preferredLocations
    } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (location) updateData.location = location;
    if (bio) updateData.bio = bio;
    if (skills) updateData.skills = JSON.stringify(skills);
    if (education) updateData.education = JSON.stringify(education);
    if (experience) updateData.experience = JSON.stringify(experience);

    const profile = await CandidateProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updateData },
      { new: true }
    ).lean();
    
    if (profile) {
      profile.skills = JSON.parse(profile.skills || '[]');
      profile.education = JSON.parse(profile.education || '[]');
      profile.experience = JSON.parse(profile.experience || '[]');
    }

    res.json({
      message: 'Profile updated successfully',
      profile
    });
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

    await CandidateProfile.findOneAndUpdate(
      { userId: req.user.id },
      { resumePath }
    );

    res.json({
      message: 'Resume uploaded successfully',
      resumePath
    });
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

    await CandidateProfile.findOneAndUpdate(
      { userId: req.user.id },
      { profilePicture: picturePath }
    );

    res.json({
      message: 'Profile picture uploaded successfully',
      picturePath
    });
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

    // Check if job exists and is open
    const job = await Job.findOne({ _id: jobId, status: 'open' });
    if (!job) {
      return res.status(404).json({ message: 'Job not found or no longer accepting applications' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({ jobId, candidateId: req.user.id });
    
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }

    // Get candidate's resume path
    const profile = await CandidateProfile.findOne({ userId: req.user.id });
    
    // Use uploaded resume or existing profile resume
    let resumePath = req.file ? `/uploads/resumes/${req.file.filename}` : profile?.resumePath;

    if (!resumePath) {
      return res.status(400).json({ message: 'Please upload a resume to apply' });
    }

    // Create application
    const application = await Application.create({
      jobId,
      candidateId: req.user.id,
      employerId: job.employerId,
      resumePath,
      coverLetter: coverLetter || ''
    });

    // Update job application count
    job.applicationCount = (job.applicationCount || 0) + 1;
    await job.save();

    // Create notification for employer
    await Notification.create({
      userId: job.employerId,
      type: 'new_application',
      title: 'New Application Received',
      message: `${profile?.fullName || 'A candidate'} applied for ${job.title}`,
      relatedId: jobId
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: application._id
    });
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
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = { candidateId: req.user.id };
    if (status) filter.status = status;

    const total = await Application.countDocuments(filter);

    const apps = await Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const applications = [];
    for (let app of apps) {
      const job = await Job.findById(app.jobId).lean();
      const employer = await EmployerProfile.findOne({ userId: job?.employerId }).lean();
      applications.push({
        ...app,
        jobTitle: job?.title,
        location: job?.location,
        jobType: job?.jobType,
        salaryMin: job?.salaryMin,
        salaryMax: job?.salaryMax,
        companyName: employer?.companyName,
        companyLogo: employer?.logoPath
      });
    }

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

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already saved
    const existing = await SavedJob.findOne({ candidateId: req.user.id, jobId });
    
    if (existing) {
      return res.status(400).json({ message: 'Job already saved' });
    }

    await SavedJob.create({ candidateId: req.user.id, jobId });

    res.json({ message: 'Job saved successfully' });
  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove saved job
router.delete('/saved-jobs/:jobId', auth, isCandidate, async (req, res) => {
  try {
    await SavedJob.findOneAndDelete({ candidateId: req.user.id, jobId: req.params.jobId });

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
    const skip = (page - 1) * limit;

    const total = await SavedJob.countDocuments({ candidateId: req.user.id });

    const saved = await SavedJob.find({ candidateId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const savedJobs = [];
    for (let s of saved) {
      const job = await Job.findById(s.jobId).lean();
      const employer = await EmployerProfile.findOne({ userId: job?.employerId }).lean();
      
      if (job) {
        savedJobs.push({
          ...job,
          savedAt: s.createdAt,
          requiredSkills: JSON.parse(job.requiredSkills || '[]'),
          companyName: employer?.companyName,
          logoPath: employer?.logoPath
        });
      }
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
    const saved = await SavedJob.findOne({ candidateId: req.user.id, jobId: req.params.jobId });

    res.json({ isSaved: !!saved });
  } catch (error) {
    console.error('Check saved job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if already applied to a job
router.get('/applications/check/:jobId', auth, isCandidate, async (req, res) => {
  try {
    const application = await Application.findOne({ candidateId: req.user.id, jobId: req.params.jobId });

    res.json({ 
      hasApplied: !!application,
      application: application ? { id: application._id, status: application.status } : null
    });
  } catch (error) {
    console.error('Check application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recommended jobs based on skills and preferences
router.get('/recommended-jobs', auth, isCandidate, async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({ userId: req.user.id });

    if (!profile) {
      return res.json([]);
    }

    const skills = JSON.parse(profile.skills || '[]');

    // Get applied job IDs to exclude
    const appliedJobs = await Application.find({ candidateId: req.user.id }).select('jobId');
    const appliedJobIds = appliedJobs.map(a => a.jobId.toString());

    // Get all open jobs
    let jobs = await Job.find({ status: 'open' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Filter out already applied jobs
    jobs = jobs.filter(job => !appliedJobIds.includes(job._id.toString()));

    // Get employer profiles
    const employerIds = [...new Set(jobs.map(j => j.employerId.toString()))];
    const profiles = await EmployerProfile.find({ userId: { $in: employerIds } }).lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.userId.toString()] = p; });

    // Calculate match score for each job
    const scoredJobs = jobs.map(job => {
      const jobSkills = JSON.parse(job.requiredSkills || '[]').map(s => s.toLowerCase());
      const candidateSkillsLower = skills.map(s => s.toLowerCase());

      // Skills match
      const matchingSkills = jobSkills.filter(js => 
        candidateSkillsLower.some(cs => cs.includes(js) || js.includes(cs))
      );
      const skillScore = jobSkills.length > 0 
        ? (matchingSkills.length / jobSkills.length) * 100 
        : 0;

      return {
        ...job,
        requiredSkills: JSON.parse(job.requiredSkills || '[]'),
        companyName: profileMap[job.employerId.toString()]?.companyName,
        logoPath: profileMap[job.employerId.toString()]?.logoPath,
        matchScore: Math.round(skillScore),
        matchingSkills
      };
    });

    // Sort by match score and return top 10
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
