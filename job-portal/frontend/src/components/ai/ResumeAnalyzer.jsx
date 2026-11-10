import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { aiAPI } from '../../services/api';
import AIStatusBadge from './AIStatusBadge';

// Mock AI resume analysis card. Call with profile data; renders sample output.
export default function ResumeAnalyzer({ skills = [], experience = [], education = [], fullName = 'Candidate', jobSkills = [] }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await aiAPI.analyzeResume({ skills, experience, education, fullName, jobSkills });
      setResult(res.data);
      setOpen(true);
    } catch (e) {
      toast.error('AI analysis failed (offline demo)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card border-l-4 border-l-purple-500">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Resume Check
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Instant feedback on skills, ATS readiness, and missing keywords. Demo output — no API key needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AIStatusBadge />
          <button type="button" onClick={analyze} disabled={loading} className="btn-primary text-sm">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
              </span>
            ) : (
              'Analyze my resume'
            )}
          </button>
        </div>
      </div>

      {open && result && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 border border-purple-100">
            <div className="text-4xl font-bold text-purple-700">{result.overallScore}</div>
            <div>
              <div className="font-semibold text-gray-900">Overall score · Grade {result.grade}</div>
              <p className="text-sm text-gray-600 mt-1">{result.summary}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Strengths
              </h4>
              <ul className="text-sm text-emerald-900 space-y-1 list-disc list-inside">
                {result.strengths?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> To improve
              </h4>
              <ul className="text-sm text-amber-900 space-y-1 list-disc list-inside">
                {result.improvements?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(result.keywords?.found || []).map((k, i) => (
              <span key={`f-${i}`} className="badge badge-success">{k}</span>
            ))}
            {(result.keywords?.missing || []).map((k, i) => (
              <span key={`m-${i}`} className="badge badge-warning">missing: {k}</span>
            ))}
          </div>

          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer font-medium text-gray-800">ATS checklist</summary>
            <ul className="mt-2 space-y-1">
              {result.atsChecklist?.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={c.pass ? 'text-emerald-600' : 'text-red-500'}>{c.pass ? '✓' : '✗'}</span>
                  {c.item}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
