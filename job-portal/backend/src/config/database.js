const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
const DB_PATH = path.join(__dirname, '../../data/jobportal.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Save database to file
const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
};

// Initialize database
const initDatabase = async () => {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('employer', 'candidate')),
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employer_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      company_description TEXT,
      industry TEXT,
      company_size TEXT,
      website TEXT,
      location TEXT,
      phone TEXT,
      logo_path TEXT,
      is_verified INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      full_name TEXT,
      phone TEXT,
      location TEXT,
      headline TEXT,
      bio TEXT,
      skills TEXT,
      education TEXT,
      experience TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      portfolio_url TEXT,
      resume_path TEXT,
      profile_picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      employer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      salary_min INTEGER,
      salary_max INTEGER,
      job_type TEXT NOT NULL CHECK(job_type IN ('full-time', 'part-time', 'contract', 'internship', 'remote')),
      category TEXT,
      required_skills TEXT,
      experience_level TEXT,
      min_experience_years REAL DEFAULT 0,
      min_education TEXT DEFAULT 'any',
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'hidden')),
      report_count INTEGER DEFAULT 0,
      application_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      employer_id TEXT NOT NULL,
      resume_path TEXT,
      cover_letter TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),
      skill_match_pct REAL DEFAULT 0,
      experience_match_pct REAL DEFAULT 0,
      education_match_pct REAL DEFAULT 0,
      overall_match_pct REAL DEFAULT 0,
      rank_position INTEGER DEFAULT 0,
      ai_analyzed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(job_id, candidate_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_jobs (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(candidate_id, job_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS job_reports (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(job_id, candidate_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category)');
    db.run('CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_saved_jobs_candidate ON saved_jobs(candidate_id)');
  } catch (e) {
    // Indexes might already exist
  }

  // ── Lightweight migrations for DBs created before new columns existed ──
  const ensureColumn = (table, column, ddl) => {
    try {
      const stmt = db.prepare('SELECT name FROM pragma_table_info(?)');
      stmt.bind([table]);
      const cols = [];
      while (stmt.step()) cols.push(stmt.getAsObject().name);
      stmt.free();
      if (!cols.includes(column)) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      }
    } catch (e) { /* ignore */ }
  };
  try {
    ensureColumn('jobs', 'min_experience_years', 'min_experience_years REAL DEFAULT 0');
    ensureColumn('jobs', 'min_education', "min_education TEXT DEFAULT 'any'");
    ensureColumn('applications', 'skill_match_pct', 'skill_match_pct REAL DEFAULT 0');
    ensureColumn('applications', 'experience_match_pct', 'experience_match_pct REAL DEFAULT 0');
    ensureColumn('applications', 'education_match_pct', 'education_match_pct REAL DEFAULT 0');
    ensureColumn('applications', 'overall_match_pct', 'overall_match_pct REAL DEFAULT 0');
    ensureColumn('applications', 'rank_position', 'rank_position INTEGER DEFAULT 0');
    ensureColumn('applications', 'ai_analyzed_at', 'ai_analyzed_at DATETIME');
    ensureColumn('candidate_profiles', 'headline', 'headline TEXT');
    ensureColumn('candidate_profiles', 'bio', 'bio TEXT');
    ensureColumn('employer_profiles', 'phone', 'phone TEXT');
  } catch (e) { /* ignore migration errors */ }

  saveDatabase();
  console.log('Database initialized successfully');
  
  return db;
};

// Helper functions for sql.js
const getDb = () => db;

const prepare = (sql) => {
  return {
    run: (...params) => {
      db.run(sql, params);
      saveDatabase();
      return { changes: db.getRowsModified() };
    },
    get: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    }
  };
};

const exec = (sql) => {
  db.run(sql);
  saveDatabase();
};

// Auto-save on process exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});

module.exports = { 
  initDatabase, 
  getDb, 
  prepare, 
  exec, 
  saveDatabase 
};
