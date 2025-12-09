const jwt = require('jsonwebtoken');

// Authenticate user middleware
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Check if user is employer
const isEmployer = (req, res, next) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Access denied. Employer only.' });
  }
  next();
};

// Check if user is candidate
const isCandidate = (req, res, next) => {
  if (req.user.role !== 'candidate') {
    return res.status(403).json({ message: 'Access denied. Candidate only.' });
  }
  next();
};

// Check if employer email is verified
const isVerifiedEmployer = (req, res, next) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Access denied. Employer only.' });
  }
  if (!req.user.emailVerified) {
    return res.status(403).json({ message: 'Please verify your email before posting jobs.' });
  }
  next();
};

module.exports = { auth, isEmployer, isCandidate, isVerifiedEmployer };
