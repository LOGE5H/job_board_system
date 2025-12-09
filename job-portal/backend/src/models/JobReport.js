const mongoose = require('mongoose');

const jobReportSchema = new mongoose.Schema({
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
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate reports
jobReportSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model('JobReport', jobReportSchema);
