const express = require('express');
const { body, validationResult } = require('express-validator');
const { Job, Application, EmployerProfile, CandidateProfile, User, Notification } = require('../models');
const { auth, isEmployer } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');

const router = express.Router();

// Get employer dashboard stats
router.get('/dashboard', auth, isEmployer, async (req, res) => {
  try {
    // Get job stats
    const jobs = await Job.find({ employerId: req.user.id });
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'open').length;
    const closedJobs = jobs.filter(j => j.status === 'closed').length;
    const totalApplications = jobs.reduce((sum, j) => sum + (j.applicationCount || 0), 0);

    // Get recent applications
    const recentApplications = await Application.find({ employerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get job titles and candidate names for applications
    for (let app of recentApplications) {
      const job = await Job.findById(app.jobId).lean();
      const candidate = await CandidateProfile.findOne({ userId: app.candidateId }).lean();
      app.jobTitle = job?.title;
      app.candidateName = candidate?.fullName;
    }

    // Get application stats by status
    const applicationStats = await Application.aggregate([
      { $match: { employerId: req.user.id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    // Get applications this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyApps = await Application.countDocuments({
      employerId: req.user.id,
      createdAt: { $gte: startOfMonth }
    });

    res.json({
      stats: {
        totalJobs: totalJobs,
        activeJobs: activeJobs,
        closedJobs: closedJobs,
        totalApplications: totalApplications,
        applicationsThisMonth: monthlyApps
      },
      recentApplications,
      applicationStats
    });
  } catch (error) {
    console.error('Get employer dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employer's jobs
router.get('/jobs', auth, isEmployer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = { employerId: req.user.id };
    if (status) filter.status = status;

    const total = await Job.countDocuments(filter);

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const parsedJobs = jobs.map(job => ({
      ...job,
      requiredSkills: JSON.parse(job.requiredSkills || '[]')
    }));

    res.json({
      jobs: parsedJobs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalJobs: total
      }
    });
  } catch (error) {
    console.error('Get employer jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get applications for a specific job
router.get('/jobs/:jobId/applications', auth, isEmployer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    // Verify job belongs to employer
    const job = await Job.findOne({ _id: req.params.jobId, employerId: req.user.id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    const filter = { jobId: req.params.jobId };
    if (status) filter.status = status;

    const total = await Application.countDocuments(filter);

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get candidate profiles and users for applications
    for (let app of applications) {
      const candidate = await CandidateProfile.findOne({ userId: app.candidateId }).lean();
      const user = await User.findById(app.candidateId).lean();
      app.full_name = candidate?.fullName;
      app.skills = candidate?.skills || '[]';
      app.experience = candidate?.experience || '[]';
      app.education = candidate?.education || '[]';
      app.location = candidate?.location;
      app.bio = candidate?.bio;
      app.profile_resume = candidate?.resumePath;
      app.email = user?.email;
    }

    // Parse skills for each application
    const parsedApplications = applications.map(app => ({
      ...app,
      id: app._id,
      skills: JSON.parse(app.skills || '[]'),
      experience: JSON.parse(app.experience || '[]'),
      education: JSON.parse(app.education || '[]')
    }));

    res.json({
      job: { ...job.toObject(), id: job._id, required_skills: JSON.parse(job.requiredSkills || '[]') },
      applications: parsedApplications,
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

    // Verify application belongs to employer's job
    const application = await Application.findOne({
      _id: req.params.id,
      employerId: req.user.id
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found or unauthorized' });
    }

    // Get job title
    const job = await Job.findById(application.jobId);
    
    // Get company name for notification
    const employer = await EmployerProfile.findOne({ userId: req.user.id });

    // Update status
    application.status = status;
    await application.save();

    // Create notification for candidate with appropriate message
    let notifType = 'application_status';
    let notifTitle = 'Application Status Updated';
    let notifMessage = '';

    switch (status) {
      case 'reviewed':
        notifMessage = `Your application for "${job?.title}" at ${employer?.companyName || 'the company'} has been reviewed.`;
        break;
      case 'shortlisted':
        notifType = 'shortlisted';
        notifTitle = '🎉 Congratulations! You\'ve Been Shortlisted';
        notifMessage = `Great news! You have been shortlisted for "${job?.title}" at ${employer?.companyName || 'the company'}. The employer is interested in your profile!`;
        break;
      case 'rejected':
        notifType = 'rejected';
        notifTitle = 'Application Update';
        notifMessage = `Thank you for your interest in "${job?.title}" at ${employer?.companyName || 'the company'}. Unfortunately, the employer has decided to move forward with other candidates. Keep applying!`;
        break;
      case 'hired':
        notifType = 'hired';
        notifTitle = '🎊 Congratulations! You\'ve Been Hired!';
        notifMessage = `Amazing news! You have been selected for "${job?.title}" at ${employer?.companyName || 'the company'}. The employer will contact you soon with next steps.`;
        break;
      default:
        notifMessage = `Your application status for "${job?.title}" has been updated to ${status}.`;
    }

    await Notification.create({
      userId: application.candidateId,
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      relatedId: application.jobId
    });

    res.json({ message: 'Application status updated successfully', status });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update employer profile
router.put('/profile', auth, isEmployer, async (req, res) => {
  try {
    const {
      companyName, companyDescription, industry, companySize, website, location
    } = req.body;

    const profile = await EmployerProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          ...(companyName && { companyName }),
          ...(companyDescription && { companyDescription }),
          ...(industry && { industry }),
          ...(companySize && { companySize }),
          ...(website && { website }),
          ...(location && { location })
        }
      },
      { new: true }
    );

    res.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Update employer profile error:', error);
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

    await EmployerProfile.findOneAndUpdate(
      { userId: req.user.id },
      { logoPath }
    );

    res.json({
      message: 'Logo uploaded successfully',
      logoPath
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public company page
router.get('/company/:id', async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ userId: req.params.id }).lean();
    const user = await User.findById(req.params.id).lean();

    if (!profile) {
      return res.status(404).json({ message: 'Company not found' });
    }

    profile.member_since = user?.createdAt;

    // Get open jobs from this company
    const jobs = await Job.find({ employerId: req.params.id, status: 'open' })
      .sort({ createdAt: -1 })
      .lean();

    const formattedJobs = jobs.map(j => ({
      id: j._id,
      title: j.title,
      location: j.location,
      job_type: j.jobType,
      salary_min: j.salaryMin,
      salary_max: j.salaryMax,
      category: j.category,
      created_at: j.createdAt
    }));

    res.json({
      company: profile,
      jobs: formattedJobs,
      jobCount: jobs.length
    });
  } catch (error) {
    console.error('Get company page error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get candidate profile for an application (employer viewing applicant)
router.get('/applications/:id/candidate', auth, isEmployer, async (req, res) => {
  try {
    // Verify application belongs to employer's job
    const application = await Application.findOne({
      _id: req.params.id,
      employerId: req.user.id
    }).lean();

    if (!application) {
      return res.status(404).json({ message: 'Application not found or unauthorized' });
    }

    // Get job info
    const job = await Job.findById(application.jobId).lean();

    // Get full candidate profile
    const candidate = await CandidateProfile.findOne({ userId: application.candidateId }).lean();
    const user = await User.findById(application.candidateId).lean();

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    // Parse JSON fields
    const parsedCandidate = {
      ...candidate,
      email: user?.email,
      member_since: user?.createdAt,
      skills: JSON.parse(candidate.skills || '[]'),
      education: JSON.parse(candidate.education || '[]'),
      experience: JSON.parse(candidate.experience || '[]')
    };

    // Calculate skills match
    const jobSkills = JSON.parse(job?.requiredSkills || '[]').map(s => s.toLowerCase());
    const candidateSkills = parsedCandidate.skills.map(s => s.toLowerCase());
    const matchingSkills = jobSkills.filter(js => 
      candidateSkills.some(cs => cs.includes(js) || js.includes(cs))
    );
    const matchScore = jobSkills.length > 0 
      ? Math.round((matchingSkills.length / jobSkills.length) * 100)
      : 0;

    res.json({
      application: {
        id: application._id,
        status: application.status,
        cover_letter: application.coverLetter,
        resume_path: application.resumePath,
        applied_at: application.createdAt,
        job_title: job?.title
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
    const job = await Job.findOne({ _id: req.params.jobId, employerId: req.user.id });

    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    const jobSkills = JSON.parse(job.requiredSkills || '[]');

    // Get applicants
    const applications = await Application.find({ jobId: req.params.jobId }).lean();

    // Get candidate profiles and calculate match score
    const rankedApplicants = [];

    for (let app of applications) {
      const candidate = await CandidateProfile.findOne({ userId: app.candidateId }).lean();
      const user = await User.findById(app.candidateId).lean();

      const candidateSkills = JSON.parse(candidate?.skills || '[]').map(s => s.toLowerCase());
      const matchingSkills = jobSkills.filter(skill => 
        candidateSkills.some(cs => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))
      );
      
      const matchScore = jobSkills.length > 0 
        ? Math.round((matchingSkills.length / jobSkills.length) * 100)
        : 0;

      rankedApplicants.push({
        application_id: app._id,
        status: app.status,
        applied_at: app.createdAt,
        full_name: candidate?.fullName,
        skills: JSON.parse(candidate?.skills || '[]'),
        location: candidate?.location,
        experience: JSON.parse(candidate?.experience || '[]'),
        email: user?.email,
        matchScore,
        matchingSkills
      });
    }

    // Sort by match score
    rankedApplicants.sort((a, b) => b.matchScore - a.matchScore);

    res.json(rankedApplicants);
  } catch (error) {
    console.error('Get recommended candidates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
