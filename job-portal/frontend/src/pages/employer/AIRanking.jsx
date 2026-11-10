import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { employerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Brain, ArrowLeft, Zap, BarChart3, Users, Star, TrendingUp,
  CheckCircle, XCircle, Clock, Eye, Download, ChevronDown,
  ChevronUp, MapPin, Briefcase, GraduationCap, Award,
  RefreshCw, Filter, Info, ExternalLink, User, AlertCircle
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColors = {
  pending:    'bg-yellow-100 text-yellow-800 border border-yellow-200',
  reviewed:   'bg-blue-100 text-blue-800 border border-blue-200',
  shortlisted:'bg-green-100 text-green-800 border border-green-200',
  rejected:   'bg-red-100 text-red-800 border border-red-200',
  hired:      'bg-purple-100 text-purple-800 border border-purple-200'
};

const getScoreColor = (pct) => {
  if (pct >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', light: 'bg-emerald-50' };
  if (pct >= 60) return { text: 'text-blue-600',    bg: 'bg-blue-500',    light: 'bg-blue-50'    };
  if (pct >= 40) return { text: 'text-amber-600',   bg: 'bg-amber-500',   light: 'bg-amber-50'   };
  return           { text: 'text-red-500',    bg: 'bg-red-400',     light: 'bg-red-50'     };
};

const getRankBadge = (rank) => {
  if (rank === 1) return 'bg-yellow-400 text-yellow-900';
  if (rank === 2) return 'bg-gray-300 text-gray-800';
  if (rank === 3) return 'bg-amber-600 text-white';
  return 'bg-gray-100 text-gray-600';
};

/** Circular score ring SVG */
function ScoreRing({ pct, size = 72, stroke = 6 }) {
  const r = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const { text, bg } = getScoreColor(pct);
  const strokeClass = bg.replace('bg-', 'stroke-');

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${strokeClass} transition-all duration-700`}
        />
      </svg>
      <span className={`absolute text-sm font-bold ${text}`}>{pct}%</span>
    </div>
  );
}

/** Horizontal score bar */
function ScoreBar({ label, pct, icon: Icon }) {
  const { text, bg } = getScoreColor(pct);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </span>
        <span className={`text-xs font-bold ${text}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bg}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIRanking() {
  const { jobId } = useParams();

  const [job,          setJob]          = useState(null);
  const [candidates,   setCandidates]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [ranking,      setRanking]      = useState(false);
  const [minScore,     setMinScore]     = useState(0);
  const [expanded,     setExpanded]     = useState(null);   // applicationId of expanded row
  const [updating,     setUpdating]     = useState(null);   // applicationId being status-updated

  const fetchRanking = useCallback(async () => {
    try {
      setLoading(true);
      const res = await employerAPI.getAIRanking(jobId);
      setJob(res.data.job);
      setCandidates(res.data.candidates || []);
    } catch (err) {
      toast.error('Failed to load AI ranking data.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  // Run AI analysis
  const handleRunAI = async () => {
    try {
      setRanking(true);
      toast.loading('🤖 AI is analyzing resumes…', { id: 'ai-rank' });
      await employerAPI.runAIRanking(jobId);
      toast.success('✅ AI analysis complete! Candidates ranked.', { id: 'ai-rank' });
      await fetchRanking();
    } catch (err) {
      toast.error('AI analysis failed: ' + (err.response?.data?.message || err.message), { id: 'ai-rank' });
    } finally {
      setRanking(false);
    }
  };

  // Update status from ranking table
  const handleStatus = async (applicationId, status) => {
    try {
      setUpdating(applicationId);
      await employerAPI.updateApplicationStatus(applicationId, status);
      const labels = {
        shortlisted: '⭐ Candidate shortlisted!',
        rejected:    'Application rejected.',
        hired:       '🎉 Candidate hired!'
      };
      toast.success(labels[status] || 'Status updated');
      setCandidates(prev =>
        prev.map(c => c.applicationId.toString() === applicationId.toString()
          ? { ...c, status }
          : c
        )
      );
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  // Filtered candidates
  const filtered = candidates.filter(c => c.overallMatchPct >= minScore);
  const analyzed  = candidates.filter(c => c.aiAnalyzedAt).length;
  const avgScore  = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + c.overallMatchPct, 0) / candidates.length)
    : 0;
  const top80     = candidates.filter(c => c.overallMatchPct >= 80).length;

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-200 animate-spin border-t-indigo-600" />
            <Brain className="absolute inset-0 m-auto h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading AI analysis…</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <Link
            to={`/employer/jobs/${jobId}/applicants`}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Applicants
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900">
                  AI Resume Ranking
                </h1>
              </div>
              {job && (
                <p className="text-gray-500 ml-13 pl-1">
                  <span className="font-semibold text-gray-700">{job.title}</span>
                  {job.requiredSkills?.length > 0 && (
                    <span className="ml-2 text-xs">
                      · Requires: {job.requiredSkills.slice(0, 4).join(', ')}
                      {job.requiredSkills.length > 4 && ` +${job.requiredSkills.length - 4} more`}
                    </span>
                  )}
                </p>
              )}
            </div>

            <button
              onClick={handleRunAI}
              disabled={ranking || candidates.length === 0}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {ranking ? (
                <><RefreshCw className="h-5 w-5 animate-spin" /> Analyzing…</>
              ) : (
                <><Zap className="h-5 w-5" /> Run AI Analysis</>
              )}
            </button>
          </div>
        </div>

        {/* ── No Applications ─────────────────────────────────────────── */}
        {candidates.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
            <Users className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No applications yet</h3>
            <p className="text-gray-500">Once candidates apply, click <strong>Run AI Analysis</strong> to rank them.</p>
          </div>
        )}

        {candidates.length > 0 && (
          <>
            {/* ── Stats Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Users,    label: 'Total Applicants', value: candidates.length,  color: 'indigo' },
                { icon: BarChart3,label: 'AI Analyzed',      value: analyzed,            color: 'purple' },
                { icon: TrendingUp,label:'Avg Match Score',  value: `${avgScore}%`,      color: 'blue'   },
                { icon: Star,     label: '≥80% Match',       value: top80,               color: 'emerald'}
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-lg bg-${color}-100 flex items-center justify-center mb-3`}>
                    <Icon className={`h-5 w-5 text-${color}-600`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* ── Filter bar ────────────────────────────────────────── */}
            {analyzed > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-4 shadow-sm">
                <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-600 shrink-0">Min match score:</span>
                <input
                  type="range" min={0} max={100} step={5}
                  value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className={`text-sm font-bold w-12 text-right ${getScoreColor(minScore).text}`}>
                  {minScore}%
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  ({filtered.length} shown)
                </span>
              </div>
            )}

            {/* ── Not yet analyzed notice ───────────────────────────── */}
            {analyzed === 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Click <strong>Run AI Analysis</strong> above to score and rank all candidates.
              </div>
            )}

            {/* ── Candidate Ranking Table ───────────────────────────── */}
            <div className="space-y-3">
              {filtered.map((c) => {
                const isExpanded = expanded === c.applicationId?.toString();
                const scoreColor = getScoreColor(c.overallMatchPct);
                const isUpdating = updating === c.applicationId?.toString();

                return (
                  <div
                    key={c.applicationId}
                    className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden
                      ${isExpanded ? 'border-indigo-300 shadow-indigo-100' : 'border-gray-200 hover:border-indigo-200 hover:shadow-md'}`}
                  >
                    {/* ── Row summary ── */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer select-none"
                      onClick={() => setExpanded(isExpanded ? null : c.applicationId?.toString())}
                    >
                      {/* Rank badge */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getRankBadge(c.rankPosition)}`}>
                        {c.rankPosition || '–'}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {c.fullName?.charAt(0)?.toUpperCase() || 'C'}
                      </div>

                      {/* Name & meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 truncate">{c.fullName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}>
                            {c.status}
                          </span>
                          {!c.aiAnalyzedAt && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                              Not analyzed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          {c.email && <span>{c.email}</span>}
                          {c.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{c.location}</span>}
                        </div>
                      </div>

                      {/* Score bars (desktop) */}
                      {c.aiAnalyzedAt && (
                        <div className="hidden lg:flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Skills</div>
                            <div className={`text-sm font-bold ${getScoreColor(c.skillMatchPct).text}`}>
                              {c.skillMatchPct}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Experience</div>
                            <div className={`text-sm font-bold ${getScoreColor(c.experienceMatchPct).text}`}>
                              {c.experienceMatchPct}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Education</div>
                            <div className={`text-sm font-bold ${getScoreColor(c.educationMatchPct).text}`}>
                              {c.educationMatchPct}%
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Overall score ring */}
                      <div className="shrink-0">
                        {c.aiAnalyzedAt ? (
                          <ScoreRing pct={c.overallMatchPct} size={64} stroke={5} />
                        ) : (
                          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <span className="text-xs text-gray-400">N/A</span>
                          </div>
                        )}
                      </div>

                      {/* Expand chevron */}
                      <div className="shrink-0 text-gray-400">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>

                    {/* ── Expanded detail panel ── */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gradient-to-b from-gray-50/50 to-white">

                        {/* Left: Score breakdown */}
                        {c.aiAnalyzedAt && (
                          <div className="lg:col-span-1 space-y-4">
                            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-indigo-500" />
                              Match Breakdown
                            </h4>
                            <div className={`rounded-xl p-4 ${scoreColor.light} border border-current/10`}>
                              <div className="text-center mb-3">
                                <ScoreRing pct={c.overallMatchPct} size={90} stroke={7} />
                                <div className="text-xs text-gray-500 mt-1 font-medium">Overall Match</div>
                              </div>
                              <div className="space-y-3">
                                <ScoreBar label="Skill Match (50%)"      pct={c.skillMatchPct}      icon={Award}          />
                                <ScoreBar label="Experience Match (30%)" pct={c.experienceMatchPct} icon={Briefcase}      />
                                <ScoreBar label="Education Match (20%)"  pct={c.educationMatchPct}  icon={GraduationCap}  />
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Scored: {c.aiAnalyzedAt ? new Date(c.aiAnalyzedAt).toLocaleString() : '—'}
                            </div>
                          </div>
                        )}

                        {/* Middle: Skills */}
                        <div className={c.aiAnalyzedAt ? 'lg:col-span-1' : 'lg:col-span-2'}>
                          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
                            <Award className="h-4 w-4 text-indigo-500" />
                            Skills
                          </h4>
                          {c.skills?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {c.skills.map((skill, i) => {
                                const jobSkills = (job?.requiredSkills || []).map(s => s.toLowerCase());
                                const isRequired = jobSkills.some(js =>
                                  js.includes(skill.toLowerCase()) || skill.toLowerCase().includes(js)
                                );
                                return (
                                  <span
                                    key={i}
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      isRequired
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {isRequired && <span className="mr-0.5">✓</span>}
                                    {skill}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No skills listed</p>
                          )}

                          {/* Experience */}
                          {c.experience?.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                                <Briefcase className="h-4 w-4 text-indigo-500" />
                                Experience
                              </h4>
                              <div className="space-y-2">
                                {c.experience.slice(0, 2).map((exp, i) => (
                                  <div key={i} className="text-sm border-l-2 border-indigo-200 pl-3">
                                    <div className="font-medium text-gray-800">{exp.title}</div>
                                    <div className="text-gray-500">{exp.company}</div>
                                    <div className="text-xs text-gray-400">
                                      {exp.startDate} – {exp.endDate || 'Present'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {c.education?.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                                <GraduationCap className="h-4 w-4 text-indigo-500" />
                                Education
                              </h4>
                              <div className="space-y-1.5">
                                {c.education.slice(0, 2).map((edu, i) => (
                                  <div key={i} className="text-sm border-l-2 border-purple-200 pl-3">
                                    <div className="font-medium text-gray-800">{edu.degree}</div>
                                    <div className="text-gray-500">{edu.institution}</div>
                                    {edu.year && <div className="text-xs text-gray-400">{edu.year}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="lg:col-span-1 flex flex-col gap-3">
                          <h4 className="text-sm font-bold text-gray-700">Actions</h4>

                          {/* Resume & Profile links */}
                          <div className="flex gap-2">
                            {c.resumePath && (
                              <a
                                href={`${c.resumePath}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                              >
                                <Download className="h-4 w-4" /> Resume
                              </a>
                            )}
                          </div>

                          {/* Status actions */}
                          <div className="space-y-2">
                            {c.status !== 'shortlisted' && c.status !== 'hired' && (
                              <button
                                onClick={() => handleStatus(c.applicationId, 'shortlisted')}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                              >
                                <Star className="h-4 w-4" />
                                {isUpdating ? 'Updating…' : 'Shortlist'}
                              </button>
                            )}
                            {c.status === 'shortlisted' && (
                              <button
                                onClick={() => handleStatus(c.applicationId, 'hired')}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
                              >
                                <CheckCircle className="h-4 w-4" />
                                {isUpdating ? 'Updating…' : 'Hire Candidate'}
                              </button>
                            )}
                            {c.status !== 'rejected' && c.status !== 'hired' && (
                              <button
                                onClick={() => handleStatus(c.applicationId, 'rejected')}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-60 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                                {isUpdating ? 'Updating…' : 'Reject'}
                              </button>
                            )}
                            {(c.status === 'rejected' || c.status === 'hired') && (
                              <div className={`w-full text-center py-2 rounded-lg text-sm font-medium ${statusColors[c.status]}`}>
                                {c.status === 'hired' ? '🎉 Hired' : '❌ Rejected'}
                              </div>
                            )}
                          </div>

                          {/* Cover letter */}
                          {c.coverLetter && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <h5 className="text-xs font-bold text-gray-600 mb-1">Cover Letter</h5>
                              <p className="text-xs text-gray-600 line-clamp-4">{c.coverLetter}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Formula Explainer ─────────────────────────────────── */}
            <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-indigo-500" />
                How AI Scoring Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Skill Match', weight: '50%', icon: Award,         color: 'indigo',  desc: 'Matched required skills vs total required. Synonym-aware (e.g. Node.js = NodeJS).' },
                  { label: 'Experience',  weight: '30%', icon: Briefcase,     color: 'purple',  desc: 'Candidate years of experience vs minimum required. Capped at 100%.' },
                  { label: 'Education',   weight: '20%', icon: GraduationCap, color: 'blue',    desc: 'Degree tier compared to minimum requirement (PhD > Master > Bachelor).' }
                ].map(({ label, weight, icon: Icon, color, desc }) => (
                  <div key={label} className={`bg-${color}-50 rounded-xl p-4 border border-${color}-100`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 text-${color}-600`} />
                      <span className="font-semibold text-gray-800 text-sm">{label}</span>
                      <span className={`ml-auto text-sm font-bold text-${color}-600`}>{weight}</span>
                    </div>
                    <p className="text-xs text-gray-600">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-emerald-400 text-center">
                Score = (0.50 × Skills) + (0.30 × Experience) + (0.20 × Education)
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
