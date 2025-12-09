require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/mongodb');

// Create uploads directories
const uploadsDir = path.join(__dirname, '../uploads');
const dirs = ['resumes', 'logos', 'profiles'];
dirs.forEach(dir => {
  const dirPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize database and start server
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/jobs', require('./routes/jobs'));
  app.use('/api/employer', require('./routes/employer'));
  app.use('/api/candidate', require('./routes/candidate'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/analytics', require('./routes/analytics'));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large' });
      }
      return res.status(400).json({ message: err.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  });

  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });

  // Keep the server running
  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });
};

startServer().catch(console.error);
