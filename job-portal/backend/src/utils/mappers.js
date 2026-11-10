// Mappers: SQLite snake_case rows -> API objects with BOTH camelCase + snake_case
// and BOTH _id + id, so every existing frontend usage keeps working.

function safeParseJSON(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function toISO(v) {
  if (!v) return v;
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toISOString();
  } catch {
    return v;
  }
}

function mapUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    email: row.email,
    role: row.role,
    emailVerified: !!row.email_verified,
    email_verified: !!row.email_verified,
    verificationToken: row.verification_token,
    verification_token: row.verification_token,
    createdAt: toISO(row.created_at),
    created_at: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
    updated_at: toISO(row.updated_at),
  };
}

function mapEmployerProfile(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    user_id: row.user_id,
    companyName: row.company_name,
    company_name: row.company_name,
    companyDescription: row.company_description || '',
    company_description: row.company_description || '',
    industry: row.industry || '',
    companySize: row.company_size || '',
    company_size: row.company_size || '',
    website: row.website || '',
    location: row.location || '',
    phone: row.phone || '',
    logoPath: row.logo_path || null,
    logo_path: row.logo_path || null,
    isVerified: !!row.is_verified,
    is_verified: !!row.is_verified,
    createdAt: toISO(row.created_at),
    created_at: toISO(row.created_at),
  };
}

function mapCandidateProfile(row) {
  if (!row) return null;
  const skills = safeParseJSON(row.skills);
  const education = safeParseJSON(row.education);
  const experience = safeParseJSON(row.experience);
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    user_id: row.user_id,
    fullName: row.full_name || '',
    full_name: row.full_name || '',
    phone: row.phone || '',
    location: row.location || '',
    headline: row.headline || '',
    bio: row.bio || '',
    skills,
    education,
    experience,
    // raw string forms for backward compat
    skillsRaw: row.skills,
    linkedinUrl: row.linkedin_url || '',
    linkedin_url: row.linkedin_url || '',
    githubUrl: row.github_url || '',
    github_url: row.github_url || '',
    portfolioUrl: row.portfolio_url || '',
    portfolio_url: row.portfolio_url || '',
    resumePath: row.resume_path || null,
    resume_path: row.resume_path || null,
    profilePicture: row.profile_picture || null,
    profile_picture: row.profile_picture || null,
    createdAt: toISO(row.created_at),
    created_at: toISO(row.created_at),
  };
}

function mapJob(row, companyProfile = null) {
  if (!row) return null;
  const requiredSkills = safeParseJSON(row.required_skills);
  const base = {
    _id: row.id,
    id: row.id,
    employerId: row.employer_id,
    employer_id: row.employer_id,
    title: row.title,
    description: row.description,
    location: row.location,
    salaryMin: row.salary_min,
    salary_min: row.salary_min,
    salaryMax: row.salary_max,
    salary_max: row.salary_max,
    jobType: row.job_type,
    job_type: row.job_type,
    category: row.category || '',
    requiredSkills,
    required_skills: requiredSkills,
    // legacy string form some code paths used
    requiredSkillsRaw: row.required_skills,
    experienceLevel: row.experience_level || '',
    experience_level: row.experience_level || '',
    minExperienceYears: row.min_experience_years != null ? Number(row.min_experience_years) : 0,
    min_experience_years: row.min_experience_years != null ? Number(row.min_experience_years) : 0,
    minEducation: row.min_education || 'any',
    min_education: row.min_education || 'any',
    status: row.status,
    reportCount: row.report_count || 0,
    report_count: row.report_count || 0,
    applicationCount: row.application_count || 0,
    application_count: row.application_count || 0,
    createdAt: toISO(row.created_at),
    created_at: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
    updated_at: toISO(row.updated_at),
  };
  if (companyProfile) {
    base.companyName = companyProfile.companyName || companyProfile.company_name;
    base.company_name = base.companyName;
    base.logoPath = companyProfile.logoPath ?? companyProfile.logo_path ?? null;
    base.logo_path = base.logoPath;
    base.companyLocation = companyProfile.location;
    base.company_location = companyProfile.location;
    base.companyDescription = companyProfile.companyDescription ?? companyProfile.company_description;
    base.company_description = base.companyDescription;
    base.website = companyProfile.website;
    base.industry = companyProfile.industry;
  }
  return base;
}

function mapApplication(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    jobId: row.job_id,
    job_id: row.job_id,
    candidateId: row.candidate_id,
    candidate_id: row.candidate_id,
    employerId: row.employer_id,
    employer_id: row.employer_id,
    resumePath: row.resume_path,
    resume_path: row.resume_path,
    coverLetter: row.cover_letter || '',
    cover_letter: row.cover_letter || '',
    status: row.status,
    skillMatchPct: Number(row.skill_match_pct || 0),
    skill_match_pct: Number(row.skill_match_pct || 0),
    experienceMatchPct: Number(row.experience_match_pct || 0),
    experience_match_pct: Number(row.experience_match_pct || 0),
    educationMatchPct: Number(row.education_match_pct || 0),
    education_match_pct: Number(row.education_match_pct || 0),
    overallMatchPct: Number(row.overall_match_pct || 0),
    overall_match_pct: Number(row.overall_match_pct || 0),
    rankPosition: Number(row.rank_position || 0),
    rank_position: Number(row.rank_position || 0),
    aiAnalyzedAt: row.ai_analyzed_at ? toISO(row.ai_analyzed_at) : null,
    ai_analyzed_at: row.ai_analyzed_at ? toISO(row.ai_analyzed_at) : null,
    createdAt: toISO(row.created_at),
    created_at: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
    updated_at: toISO(row.updated_at),
  };
}

function mapNotification(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedId: row.related_id,
    related_id: row.related_id,
    isRead: !!row.is_read,
    is_read: row.is_read ? 1 : 0,
    createdAt: toISO(row.created_at),
    created_at: toISO(row.created_at),
  };
}

module.exports = {
  safeParseJSON,
  mapUser,
  mapEmployerProfile,
  mapCandidateProfile,
  mapJob,
  mapApplication,
  mapNotification,
};
