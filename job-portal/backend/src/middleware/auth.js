const jwt = require('jsonwebtoken');
const { normalizeRole } = require('../utils/roles');

// Authenticate user middleware
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'job_portal_secret_key_change_in_production');
    // Normalize legacy roles: 'institution'/'company' -> 'employer'
    if (decoded && decoded.role) {
      decoded.role = normalizeRole(decoded.role);
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Check if user is employer (job poster: Institution / Company).
// Accepts 'employer', 'institution', 'company' for backward compatibility.
const isEmployer = (req, res, next) => {
  const role = normalizeRole(req.user.role);
  if (role !== 'employer') {
    return res.status(403).json({ message: 'Access denied. Institution / Company account only. Only institutions/companies can post jobs.' });
  }
  req.user.role = 'employer';
  next();
};

// Check if user is candidate (job seeker)
const isCandidate = (req, res, next) => {
  const role = normalizeRole(req.user.role);
  if (role !== 'candidate') {
    return res.status(403).json({ message: 'Access denied. Job Seeker account only.' });
  }
  req.user.role = 'candidate';
  next();
};

// Check if employer email is verified
const isVerifiedEmployer = (req, res, next) => {
  const role = normalizeRole(req.user.role);
  if (role !== 'employer') {
    return res.status(403).json({ message: 'Access denied. Institution / Company account only.' });
  }
  req.user.role = 'employer';
  if (!req.user.emailVerified) {
    return res.status(403).json({ message: 'Please verify your email before posting jobs.' });
  }
  next();
};

module.exports = { auth, isEmployer, isCandidate, isVerifiedEmployer };
