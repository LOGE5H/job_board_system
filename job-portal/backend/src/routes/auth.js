const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { mapUser, mapEmployerProfile, mapCandidateProfile } = require('../utils/mappers');
const { normalizeRole } = require('../utils/roles');
const { auth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'job_portal_secret_key_change_in_production';

// Free email domains to potentially restrict
const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];

const isFreeEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return freeEmailDomains.includes(domain);
};

const signToken = (user) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: normalizeRole(user.role),
    emailVerified: !!user.email_verified,
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// Register Institution / Company (job poster). Accepts legacy 'employer' naming too.
router.post('/register/employer', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('companyName').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, companyName, companyDescription, industry, website, location } = req.body;

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const verificationToken = uuidv4();
    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, email, password, role, email_verified, verification_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, email, hashed, 'employer', 0, verificationToken, now, now);

    const profileId = uuidv4();
    db.prepare(
      'INSERT INTO employer_profiles (id, user_id, company_name, company_description, industry, website, location, is_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(profileId, userId, companyName, companyDescription || '', industry || '', website || '', location || '', 1, now, now);

    res.status(201).json({
      message: 'Institution / Company registered successfully. Please verify your email.',
      userId,
      verificationToken,
      isFreeEmail: isFreeEmail(email)
    });
  } catch (error) {
    console.error('Institution registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Alias: /register/institution behaves identically (for renamed UI)
router.post('/register/institution', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('companyName').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, companyName, companyDescription, industry, website, location } = req.body;
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    const verificationToken = uuidv4();
    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO users (id, email, password, role, email_verified, verification_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, email, hashed, 'employer', 0, verificationToken, now, now);
    const profileId = uuidv4();
    db.prepare(
      'INSERT INTO employer_profiles (id, user_id, company_name, company_description, industry, website, location, is_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(profileId, userId, companyName, companyDescription || '', industry || '', website || '', location || '', 1, now, now);
    res.status(201).json({
      message: 'Institution / Company registered successfully. Please verify your email.',
      userId,
      verificationToken,
      isFreeEmail: isFreeEmail(email)
    });
  } catch (error) {
    console.error('Institution registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Register Candidate (Job Seeker)
router.post('/register/candidate', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, phone, location } = req.body;

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const verificationToken = uuidv4();
    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, email, password, role, email_verified, verification_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, email, hashed, 'candidate', 0, verificationToken, now, now);

    const profileId = uuidv4();
    db.prepare(
      'INSERT INTO candidate_profiles (id, user_id, full_name, phone, location, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(profileId, userId, fullName, phone || '', location || '', now, now);

    res.status(201).json({
      message: 'Job Seeker registered successfully. Please verify your email.',
      userId,
      verificationToken
    });
  } catch (error) {
    console.error('Candidate registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Verify email
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);

    if (!user) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), user.id);

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Login — works for both Institution/Company (employer) and Job Seeker (candidate)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!userRow) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const role = normalizeRole(userRow.role);
    let profile = null;
    if (role === 'employer') {
      profile = mapEmployerProfile(db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(userRow.id));
    } else {
      profile = mapCandidateProfile(db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(userRow.id));
    }

    const user = mapUser({ ...userRow, role });
    const token = signToken(userRow);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        profile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!userRow) {
      return res.status(404).json({ message: 'User not found' });
    }

    const role = normalizeRole(userRow.role);
    let profile = null;
    if (role === 'employer') {
      profile = mapEmployerProfile(db.prepare('SELECT * FROM employer_profiles WHERE user_id = ?').get(userRow.id));
    } else {
      profile = mapCandidateProfile(db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(userRow.id));
    }

    const user = mapUser({ ...userRow, role });
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      profile
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!userRow) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, userRow.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?')
      .run(hashed, new Date().toISOString(), req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
