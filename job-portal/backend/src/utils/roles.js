// Role helpers — canonical role is 'employer' (job poster) and 'candidate' (job seeker).
// We accept 'institution' / 'company' as aliases for 'employer' so old + new clients keep working,
// but everything is stored as 'employer' in SQLite. UI should display "Institution / Company".

const EMPLOYER_ALIASES = new Set(['employer', 'institution', 'company']);

function normalizeRole(role) {
  if (!role) return role;
  const r = String(role).toLowerCase().trim();
  if (EMPLOYER_ALIASES.has(r)) return 'employer';
  if (r === 'candidate' || r === 'jobseeker' || r === 'job_seeker' || r === 'seeker') return 'candidate';
  return r;
}

function isEmployerRole(role) {
  return normalizeRole(role) === 'employer';
}

function isCandidateRole(role) {
  return normalizeRole(role) === 'candidate';
}

// User-facing labels — use these in all API messages / UI copy.
const ROLE_LABELS = {
  employer: 'Institution / Company',
  candidate: 'Job Seeker (Candidate)',
};

function roleLabel(role) {
  const n = normalizeRole(role);
  return ROLE_LABELS[n] || role;
}

module.exports = { normalizeRole, isEmployerRole, isCandidateRole, ROLE_LABELS, roleLabel };
