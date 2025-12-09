const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  salaryMin: {
    type: Number,
    default: null
  },
  salaryMax: {
    type: Number,
    default: null
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    required: true
  },
  category: {
    type: String,
    default: ''
  },
  requiredSkills: {
    type: String,
    default: ''
  },
  experienceLevel: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'hidden'],
    default: 'open'
  },
  reportCount: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
jobSchema.index({ status: 1 });
jobSchema.index({ employerId: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
