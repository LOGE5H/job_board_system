import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { aiAPI } from '../../services/api';
import AIStatusBadge from './AIStatusBadge';

// Mock AI job-description generator for the Post-a-Job form.
export default function JobDescriptionHelper({ title, skills = [], location, jobType, onUse }) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!title) {
      toast.error('Enter a job title first');
      return;
    }
    setLoading(true);
    try {
      const res = await aiAPI.generateJobDescription({ title, skills, location, jobType });
      setDraft(res.data.description || '');
    } catch (e) {
      toast.error('AI generation failed (offline demo)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-indigo-600" />
          <div>
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              AI Job Description Assistant <AIStatusBadge />
            </div>
            <p className="text-xs text-gray-500">Generates a sample description from your title + skills. Edit before posting.</p>
          </div>
        </div>
        <button type="button" onClick={generate} disabled={loading} className="btn-outline text-sm">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Generate with AI
            </span>
          )}
        </button>
      </div>

      {draft && (
        <div className="mt-3">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-white rounded-xl border border-indigo-100 p-4 max-h-64 overflow-y-auto">
            {draft}
          </pre>
          {onUse && (
            <button
              type="button"
              onClick={() => onUse(draft)}
              className="btn-secondary text-sm mt-3"
            >
              Use this description
            </button>
          )}
        </div>
      )}
    </div>
  );
}
