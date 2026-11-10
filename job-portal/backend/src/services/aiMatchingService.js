/**
 * AI Resume Matching & Ranking Service (local SQLite version)
 * ============================================================
 * Implements multi-factor weighted candidate scoring:
 *   Score = (0.50 × SkillMatch) + (0.30 × ExperienceMatch) + (0.20 × EducationMatch)
 * No external API keys required — fully deterministic local heuristics.
 */

const db = require('../config/database');
const { safeParseJSON } = require('../utils/mappers');

// ─── Canonical Skill Synonym Dictionary ─────────────────────────────────────
const SKILL_SYNONYMS = {
  js: 'javascript', 'node.js': 'nodejs', node: 'nodejs', 'express.js': 'express',
  'react.js': 'react', reactjs: 'react', 'vue.js': 'vue', vuejs: 'vue',
  'angular.js': 'angular', angularjs: 'angular', 'next.js': 'nextjs', nextjs: 'nextjs',
  ts: 'typescript',
  'spring boot': 'springboot', springboot: 'springboot', 'spring framework': 'springboot',
  'spring mvc': 'springboot', jpa: 'hibernate', 'spring data': 'hibernate',
  mysql: 'mysql', postgresql: 'postgresql', postgres: 'postgresql',
  mongodb: 'mongodb', mongo: 'mongodb', 'nosql': 'mongodb',
  'ms sql': 'mssql', 'sql server': 'mssql', 'microsoft sql': 'mssql',
  redis: 'redis', 'cache': 'redis',
  'amazon web services': 'aws', 'google cloud': 'gcp', 'google cloud platform': 'gcp',
  kubernetes: 'kubernetes', k8s: 'kubernetes',
  'continuous integration': 'cicd', 'continuous delivery': 'cicd', 'ci/cd': 'cicd',
  'machine learning': 'ml', 'deep learning': 'dl', 'natural language processing': 'nlp',
  tensorflow: 'tensorflow', pytorch: 'pytorch',
  'rest api': 'restapi', 'restful api': 'restapi', 'restful': 'restapi',
  'graphql': 'graphql', 'microservices': 'microservices',
  'object oriented programming': 'oop', 'oop': 'oop',
  'data structures': 'dsa', 'algorithms': 'dsa', 'data structures and algorithms': 'dsa',
  'agile methodology': 'agile', 'scrum': 'agile',
  'html5': 'html', 'css3': 'css', 'tailwind css': 'tailwindcss',
  'bootstrap 4': 'bootstrap', 'bootstrap 5': 'bootstrap',
  'c#': 'csharp', '.net': 'dotnet', 'asp.net': 'dotnet',
  'c++': 'cpp',
  python: 'python', django: 'django', flask: 'flask', fastapi: 'fastapi',
  git: 'git', github: 'git', gitlab: 'git',
  docker: 'docker', 'containerization': 'docker',
  linux: 'linux', bash: 'bash', shell: 'bash'
};

const EDUCATION_TIER = {
  phd: 4, doctorate: 4,
  master: 3, masters: 3, 'mtech': 3, 'm.tech': 3, 'm.e': 3, 'me': 3,
  ms: 3, 'mca': 3, 'mba': 3, 'pg': 3, 'postgraduate': 3,
  bachelor: 2, bachelors: 2, 'btech': 2, 'b.tech': 2, 'b.e': 2, 'be': 2,
  bs: 2, 'bca': 2, 'bsc': 2, 'b.sc': 2, 'ba': 2, 'bcom': 2,
  'undergraduate': 2, 'ug': 2, 'degree': 2,
  diploma: 1, 'polytechnic': 1,
  high_school: 0, 'hsc': 0, 'ssc': 0, '12th': 0, '10th': 0,
  any: 0
};

const JOB_EDU_TIER = {
  any: 0, high_school: 0, diploma: 1, bachelor: 2, master: 3, phd: 4
};

function normalizeSkill(skill) {
  if (!skill || typeof skill !== 'string') return '';
  const clean = skill.toLowerCase().trim().replace(/['"]/g, '');
  return SKILL_SYNONYMS[clean] || clean;
}

function skillsMatch(required, candidate) {
  const r = normalizeSkill(required);
  const c = normalizeSkill(candidate);
  if (!r || !c) return false;
  return r === c || c.includes(r) || r.includes(c);
}

function extractExperienceYears(experienceArray) {
  if (!Array.isArray(experienceArray) || experienceArray.length === 0) return 0;
  let totalMonths = 0;
  for (const exp of experienceArray) {
    try {
      const start = parseFlexibleDate(exp.startDate);
      const end = exp.endDate && String(exp.endDate).toLowerCase() !== 'present' && exp.endDate !== ''
        ? parseFlexibleDate(exp.endDate)
        : new Date();
      if (start && end && end >= start) {
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += Math.max(0, months);
      }
    } catch (_) { /* skip */ }
  }
  return parseFloat((totalMonths / 12).toFixed(1));
}

function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  const str = dateStr.toString().trim();
  if (/^\d{4}$/.test(str)) return new Date(parseInt(str), 0, 1);
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  const mmyyyy = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyy) return new Date(parseInt(mmyyyy[2]), parseInt(mmyyyy[1]) - 1, 1);
  return null;
}

function extractEducationTier(educationArray) {
  if (!Array.isArray(educationArray) || educationArray.length === 0) return 0;
  let highestTier = 0;
  for (const edu of educationArray) {
    const degreeStr = ((edu && edu.degree) || '').toLowerCase().trim();
    const tokens = degreeStr.split(/[\s,./()-]+/);
    for (const token of tokens) {
      const tier = EDUCATION_TIER[token];
      if (tier !== undefined && tier > highestTier) highestTier = tier;
    }
    for (const [phrase, tier] of Object.entries(EDUCATION_TIER)) {
      if (degreeStr.includes(phrase) && tier > highestTier) highestTier = tier;
    }
  }
  return highestTier;
}

function calcSkillScore(requiredSkills, candidateSkills) {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { pct: 100, matchedSkills: [], missingSkills: [] };
  }
  const matched = [];
  const missing = [];
  for (const req of requiredSkills) {
    const found = candidateSkills.some(cs => skillsMatch(req, cs));
    if (found) matched.push(req);
    else missing.push(req);
  }
  const pct = Math.round((matched.length / requiredSkills.length) * 100);
  return { pct, matchedSkills: matched, missingSkills: missing };
}

function calcExperienceScore(requiredYears, candidateYears) {
  if (!requiredYears || requiredYears <= 0) return 100;
  if (candidateYears >= requiredYears) return 100;
  return Math.round((candidateYears / requiredYears) * 100);
}

function calcEducationScore(requiredTier, candidateTier) {
  if (requiredTier <= 0) return 100;
  if (candidateTier >= requiredTier) return 100;
  const gap = requiredTier - candidateTier;
  if (gap === 1) return 70;
  if (gap === 2) return 40;
  return 20;
}

function calcOverallScore(skillPct, expPct, eduPct) {
  const score = (0.50 * skillPct) + (0.30 * expPct) + (0.20 * eduPct);
  return Math.round(score * 10) / 10;
}

async function scoreCandidate(application, job) {
  const profile = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(application.candidate_id || application.candidateId);
  if (!profile) {
    return {
      applicationId: application.id || application._id,
      skillMatchPct: 0, experienceMatchPct: 0, educationMatchPct: 0,
      overallMatchPct: 0, matchedSkills: [], missingSkills: [],
      candidateExperienceYears: 0, candidateEducationTier: 0
    };
  }

  const candidateSkills = safeParseJSON(profile.skills);
  const experienceArray = safeParseJSON(profile.experience);
  const educationArray = safeParseJSON(profile.education);

  const requiredSkills = safeParseJSON(job.required_skills || job.requiredSkills);
  const requiredExpYears = parseFloat(job.min_experience_years ?? job.minExperienceYears) || 0;
  const requiredEduTier = JOB_EDU_TIER[job.min_education ?? job.minEducation] ?? 0;

  const candidateExpYears = extractExperienceYears(experienceArray);
  const candidateEduTier = extractEducationTier(educationArray);

  const { pct: skillPct, matchedSkills, missingSkills } = calcSkillScore(requiredSkills, candidateSkills.map(String));
  const expPct = calcExperienceScore(requiredExpYears, candidateExpYears);
  const eduPct = calcEducationScore(requiredEduTier, candidateEduTier);
  const overallPct = calcOverallScore(skillPct, expPct, eduPct);

  return {
    applicationId: application.id,
    skillMatchPct: skillPct,
    experienceMatchPct: expPct,
    educationMatchPct: eduPct,
    overallMatchPct: overallPct,
    matchedSkills,
    missingSkills,
    candidateExperienceYears: candidateExpYears,
    candidateEducationTier: candidateEduTier,
    candidateName: profile.full_name,
    candidateSkills
  };
}

async function rankApplications(jobId) {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) throw new Error('Job not found');

  const applications = db.prepare('SELECT * FROM applications WHERE job_id = ?').all(jobId);
  if (!applications.length) return [];

  const scored = [];
  for (const app of applications) {
    scored.push(await scoreCandidate(app, job));
  }

  scored.sort((a, b) => {
    if (b.overallMatchPct !== a.overallMatchPct) return b.overallMatchPct - a.overallMatchPct;
    return b.skillMatchPct - a.skillMatchPct;
  });

  const now = new Date().toISOString();
  scored.forEach((result, idx) => {
    db.prepare(
      `UPDATE applications SET skill_match_pct=?, experience_match_pct=?, education_match_pct=?, overall_match_pct=?, rank_position=?, ai_analyzed_at=? WHERE id=?`
    ).run(result.skillMatchPct, result.experienceMatchPct, result.educationMatchPct, result.overallMatchPct, idx + 1, now, result.applicationId);
  });

  return scored.map((r, idx) => ({ ...r, rankPosition: idx + 1 }));
}

module.exports = { rankApplications, scoreCandidate };
