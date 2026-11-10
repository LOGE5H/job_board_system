const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumePath: {
    type: String,
    default: null
  },
  coverLetter: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'pending'
  },
  // AI Matching Scores (populated by /rank endpoint)
  skillMatchPct: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  experienceMatchPct: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  educationMatchPct: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  overallMatchPct: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rankPosition: {
    type: Number,
    default: 0
  },
  aiAnalyzedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate applications
applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ candidateId: 1 });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ employerId: 1 });

module.exports = mongoose.model('Application', applicationSchema);
