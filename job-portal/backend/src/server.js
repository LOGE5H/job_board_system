require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./config/database');

const uploadsDir = path.join(__dirname, '../uploads');
const dirs = ['resumes', 'logos', 'profiles'];
dirs.forEach(dir => {
  const dirPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const startServer = async () => {
  // Local file storage (SQLite via sql.js) — no MongoDB required.
  await initDatabase();
  console.log('Using local SQLite storage (data/jobportal.db). MongoDB disabled.');

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/jobs', require('./routes/jobs'));
  app.use('/api/employer', require('./routes/employer'));
  // Alias so renamed UI can call /api/institution/... identically
  app.use('/api/institution', require('./routes/employer'));
  app.use('/api/candidate', require('./routes/candidate'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/analytics', require('./routes/analytics'));
  app.use('/api/ai', require('./routes/ai'));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', storage: 'sqlite-local', timestamp: new Date().toISOString() });
  });

  app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large' });
      }
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ message: err.message || 'Internal server error' });
  });

  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });
};

startServer().catch(console.error);

module.exports = app;
