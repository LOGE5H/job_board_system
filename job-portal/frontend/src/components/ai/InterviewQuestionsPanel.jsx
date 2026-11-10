import { useState } from 'react';
import { aiAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ClipboardList, Loader2, Sparkles, ChevronDown, ChevronUp, Brain, MessageSquare, Users, Zap } from 'lucide-react';

const typeColors = {
  Technical: 'bg-blue-100 text-blue-800',
  Behavioral: 'bg-green-100 text-green-800',
  Situational: 'bg-orange-100 text-orange-800',
  'Culture Fit': 'bg-purple-100 text-purple-800',
};

const typeIcons = {
  Technical: Brain,
  Behavioral: MessageSquare,
  Situational: Zap,
  'Culture Fit': Users,
};

export default function InterviewQuestionsPanel({ jobId, candidateId, jobTitle, candidateName, matchedSkills = [], missingSkills = [] }) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const generate = async () => {
    setLoading(true);
    try {
      const res = await aiAPI.interviewQuestions({
        jobId, candidateId, jobTitle,
        candidateSkills: matchedSkills,
        missingSkills,
        experienceYears: 0
      });
      setQuestions(res.data);
    } catch (err) {
      toast.error('Failed to generate interview questions');
    } finally {
      setLoading(false);
    }
  };

  const allQuestions = questions ? [
    ...(questions.technical || []),
    ...(questions.behavioral || []),
    ...(questions.situational || []),
    ...(questions.culturefit || [])
  ] : [];

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50/50 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <ClipboardList className="h-4 w-4 text-indigo-700" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">AI Interview Kit</h4>
            {candidateName && <p className="text-xs text-gray-500">Tailored for {candidateName}</p>}
          </div>
        </div>
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : questions ? 'Regenerate' : 'Generate Questions'}
        </button>
      </div>

      {questions && (
        <div className="mt-4 space-y-2">
          {questions.focusArea && (
            <p className="text-xs text-indigo-700 bg-indigo-100 rounded-lg px-3 py-2">
              💡 {questions.focusArea}
            </p>
          )}
          {allQuestions.map((q, i) => {
            const Icon = typeIcons[q.type] || Brain;
            return (
              <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="w-full text-left p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${typeColors[q.type] || 'bg-gray-100 text-gray-700'}`}>
                    <Icon className="h-3 w-3" />
                    {q.type}
                  </span>
                  <span className="text-sm text-gray-800 font-medium flex-1">{q.question}</span>
                  {expanded[i] ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                </button>
                {expanded[i] && q.rubric && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 border-l-2 border-indigo-400">
                      <span className="font-semibold text-gray-700">Rubric: </span>{q.rubric}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
