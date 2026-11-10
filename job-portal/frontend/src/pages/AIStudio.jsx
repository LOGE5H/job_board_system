import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Sparkles, MessageCircle, Map, Target, ClipboardCheck, ShieldCheck,
  Send, Loader2, CheckCircle, AlertTriangle, Briefcase, Users
} from 'lucide-react';

const candidateTools = [
  { id: 'copilot', title: 'Career Copilot', description: 'Ask for practical guidance about jobs, resumes, skills, or interviews.', icon: MessageCircle },
  { id: 'career', title: 'Career Path Planner', description: 'Turn a target role into a realistic learning and project roadmap.', icon: Map },
  { id: 'fit', title: 'Job Fit Simulator', description: 'See what matches, what is missing, and what to improve before applying.', icon: Target },
  { id: 'interview', title: 'Interview Kit', description: 'Generate role-specific questions and a clear practice rubric.', icon: ClipboardCheck }
];

const employerTools = [
  { id: 'copilot', title: 'Hiring Copilot', description: 'Get structured help with sourcing, screening, and hiring decisions.', icon: MessageCircle },
  { id: 'quality', title: 'Job Quality Audit', description: 'Check clarity, transparency, inclusiveness, and unnecessary barriers.', icon: ShieldCheck },
  { id: 'fit', title: 'Candidate Fit Review', description: 'Explain a candidate match using skills and experience, not a black-box score.', icon: Target },
  { id: 'interview', title: 'Interview Kit', description: 'Create consistent technical, behavioral, and scenario questions.', icon: ClipboardCheck }
];

function Result({ result }) {
  if (!result) return null;
  return (
    <div className="mt-6 rounded-xl border border-primary-100 bg-primary-50 p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary-800">
        <Sparkles className="h-4 w-4" /> AI result <span className="font-normal text-primary-600">Review before using</span>
      </div>
      {result.answer && <p className="whitespace-pre-wrap text-gray-800">{result.answer}</p>}
      {result.summary && <p className="text-gray-800">{result.summary}</p>}
      {result.explanation && <p className="text-gray-800">{result.explanation}</p>}
      {result.score !== undefined && <div className="text-3xl font-bold text-primary-700">{result.score}% <span className="text-sm font-normal text-gray-600">estimated fit</span></div>}
      {result.qualityScore !== undefined && <div className="text-3xl font-bold text-primary-700">{result.qualityScore}/100 <span className="text-sm font-normal text-gray-600">job quality</span></div>}
      {result.matched?.length > 0 && <div><h4 className="font-semibold text-emerald-800 mb-1">Matched</h4><div className="flex flex-wrap gap-2">{result.matched.map(item => <span className="badge badge-success" key={item}>{item}</span>)}</div></div>}
      {result.missing?.length > 0 && <div><h4 className="font-semibold text-amber-800 mb-1">Needs attention</h4><div className="flex flex-wrap gap-2">{result.missing.map(item => <span className="badge badge-warning" key={item}>{item}</span>)}</div></div>}
      {result.findings?.map(item => <div key={item.message} className="flex gap-2 text-sm text-gray-700"><AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />{item.message}</div>)}
      {result.inclusiveSuggestions?.map(item => <div key={item} className="flex gap-2 text-sm text-gray-700"><CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />{item}</div>)}
      {result.milestones?.map(item => <div key={item.title} className="rounded-lg bg-white p-3 border border-primary-100"><div className="font-semibold text-gray-900">{item.title} <span className="text-xs font-normal text-gray-500">{item.weeks} weeks</span></div><ul className="list-disc list-inside text-sm text-gray-700 mt-1">{item.actions.map(action => <li key={action}>{action}</li>)}</ul></div>)}
      {result.questions?.map((item, index) => <div key={`${item.type}-${index}`} className="rounded-lg bg-white p-3 border border-primary-100"><div className="text-xs font-semibold uppercase text-primary-600">{item.type}</div><div className="font-medium text-gray-900 mt-1">{item.question}</div><div className="text-sm text-gray-600 mt-1">Look for: {item.rubric}</div></div>)}
      {result.suggestions?.length > 0 && <div className="text-sm text-gray-600">Try next: {result.suggestions.join(' | ')}</div>}
    </div>
  );
}

export default function AIStudio() {
  const { isEmployer, user } = useAuth();
  const [tool, setTool] = useState('copilot');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [form, setForm] = useState({ message: '', targetRole: '', skills: '', jobTitle: '', jobDescription: '', jobSkills: '', candidateSkills: '', experienceYears: '0', requiredExperience: '0', requirements: '' });
  const tools = isEmployer ? employerTools : candidateTools;

  useEffect(() => {
    aiAPI.getStatus().then(response => setAiStatus(response.data)).catch(() => setAiStatus(null));
  }, []);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const list = value => value.split(',').map(item => item.trim()).filter(Boolean);

  const run = async event => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      let response;
      if (tool === 'copilot') response = await aiAPI.copilot({ message: form.message, context: { skills: list(form.skills), role: user?.role } });
      if (tool === 'career') response = await aiAPI.careerPlan({ targetRole: form.targetRole, currentSkills: list(form.skills), experienceLevel: 'early career' });
      if (tool === 'interview') response = await aiAPI.interviewKit({ jobTitle: form.jobTitle, jobDescription: form.jobDescription, difficulty: 'balanced' });
      if (tool === 'quality') response = await aiAPI.jobQuality({ title: form.jobTitle, description: form.jobDescription, requirements: list(form.requirements) });
      if (tool === 'fit') response = await aiAPI.candidateFit({ candidateSkills: list(form.candidateSkills || form.skills), jobSkills: list(form.jobSkills), experienceYears: form.experienceYears, requiredExperience: form.requiredExperience });
      setResult(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'AI feature is unavailable right now');
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    if (tool === 'copilot') return <textarea value={form.message} onChange={event => update('message', event.target.value)} className="input min-h-32" placeholder="Ask: How can I improve my profile for backend roles?" required />;
    if (tool === 'career') return <><input value={form.targetRole} onChange={event => update('targetRole', event.target.value)} className="input" placeholder="Target role, e.g. Full-Stack Developer" required /><input value={form.skills} onChange={event => update('skills', event.target.value)} className="input" placeholder="Current skills, comma separated" /></>;
    if (tool === 'interview') return <><input value={form.jobTitle} onChange={event => update('jobTitle', event.target.value)} className="input" placeholder="Job title" required /><textarea value={form.jobDescription} onChange={event => update('jobDescription', event.target.value)} className="input min-h-28" placeholder="Paste the job description or key responsibilities" /></>;
    if (tool === 'quality') return <><input value={form.jobTitle} onChange={event => update('jobTitle', event.target.value)} className="input" placeholder="Job title" required /><textarea value={form.jobDescription} onChange={event => update('jobDescription', event.target.value)} className="input min-h-28" placeholder="Paste the job description" required /><input value={form.requirements} onChange={event => update('requirements', event.target.value)} className="input" placeholder="Requirements, comma separated" /></>;
    return <><input value={form.candidateSkills} onChange={event => update('candidateSkills', event.target.value)} className="input" placeholder="Candidate skills, comma separated" required /><input value={form.jobSkills} onChange={event => update('jobSkills', event.target.value)} className="input" placeholder="Required job skills, comma separated" required /><div className="grid grid-cols-2 gap-3"><input type="number" min="0" value={form.experienceYears} onChange={event => update('experienceYears', event.target.value)} className="input" placeholder="Candidate years" /><input type="number" min="0" value={form.requiredExperience} onChange={event => update('requiredExperience', event.target.value)} className="input" placeholder="Required years" /></div></>;
  };

  return <div className="min-h-screen bg-mesh py-10"><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="mb-8"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600"><Sparkles className="h-7 w-7 text-white" /></div><div><h1 className="text-3xl font-bold text-gray-900">{isEmployer ? 'AI Hiring Studio' : 'AI Career Studio'}</h1><p className="text-gray-600 mt-1">Practical, explainable help for your next hiring or career decision.</p></div></div>{aiStatus && <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${aiStatus.mode === 'gemini' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><strong>{aiStatus.mode === 'gemini' ? 'Live Gemini AI' : 'Demo AI mode'}</strong> · {aiStatus.message}</div>}</div>
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start"><aside className="card p-3"><div className="text-xs uppercase tracking-wide text-gray-500 px-3 py-2">Choose a tool</div>{tools.map(item => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => { setTool(item.id); setResult(null); }} className={`w-full text-left p-3 rounded-lg flex gap-3 transition-colors ${tool === item.id ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50 text-gray-700'}`}><Icon className="h-5 w-5 shrink-0 mt-0.5" /><span><span className="block font-semibold">{item.title}</span><span className="block text-xs text-gray-500 mt-1">{item.description}</span></span></button>; })}</aside>
      <main className="card"><div className="flex items-start gap-3 mb-6"><div className="p-2 rounded-lg bg-primary-100 text-primary-700">{tool === 'fit' ? <Target className="h-5 w-5" /> : isEmployer ? <Users className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}</div><div><h2 className="text-xl font-semibold text-gray-900">{tools.find(item => item.id === tool)?.title}</h2><p className="text-sm text-gray-500 mt-1">{tools.find(item => item.id === tool)?.description}</p></div></div><form onSubmit={run} className="space-y-3">{renderFields()}<button disabled={loading} className="btn-primary inline-flex items-center gap-2">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Working...</> : <><Send className="h-4 w-4" /> Generate result</>}</button></form><Result result={result} /></main></div>
    <p className="text-xs text-gray-500 mt-5 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> AI output is a decision-support draft. Review it before publishing, sending, or making a hiring decision.</p>
  </div></div>;
}
