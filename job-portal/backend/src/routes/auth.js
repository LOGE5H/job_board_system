const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { User, EmployerProfile, CandidateProfile } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Free email domains to potentially restrict
const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];

// Check if email is from a free domain
const isFreeEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return freeEmailDomains.includes(domain);
};

// Register Employer
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

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const verificationToken = uuidv4();

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      email,
      password,
      role: 'employer',
      verificationToken
    });

    // Create employer profile
    await EmployerProfile.create({
      userId: user._id,
      companyName,
      companyDescription: companyDescription || '',
      industry: industry || '',
      website: website || '',
      location: location || ''
    });

    // Check if free email (for potential restrictions)
    const isFromFreeEmail = isFreeEmail(email);

    res.status(201).json({
      message: 'Employer registered successfully. Please verify your email.',
      userId: user._id,
      verificationToken,
      isFreeEmail: isFromFreeEmail
    });
  } catch (error) {
    console.error('Employer registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Register Candidate
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

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const verificationToken = uuidv4();

    // Create user
    const user = await User.create({
      email,
      password,
      role: 'candidate',
      verificationToken
    });

    // Create candidate profile
    await CandidateProfile.create({
      userId: user._id,
      fullName,
      phone: phone || '',
      location: location || ''
    });

    res.status(201).json({
      message: 'Candidate registered successfully. Please verify your email.',
      userId: user._id,
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

    const user = await User.findOne({ verificationToken: token });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.verificationToken = null;
    await user.save();

    // If employer, also mark profile as verified
    if (user.role === 'employer') {
      await EmployerProfile.findOneAndUpdate(
        { userId: user._id },
        { isVerified: true }
      );
    }

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Login
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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Get profile data
    let profile;
    if (user.role === 'employer') {
      profile = await EmployerProfile.findOne({ userId: user._id });
    } else {
      profile = await CandidateProfile.findOne({ userId: user._id });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        emailVerified: user.emailVerified
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
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
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile;
    if (user.role === 'employer') {
      profile = await EmployerProfile.findOne({ userId: user._id });
    } else {
      profile = await CandidateProfile.findOne({ userId: user._id });
    }

    res.json({
      id: user._id,
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

    const user = await User.findById(req.user.id);
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
