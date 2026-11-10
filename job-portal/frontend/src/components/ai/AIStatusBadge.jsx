import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { aiAPI } from '../../services/api';

// Small badge showing AI mode (mock/offline). Fails silently offline.
export default function AIStatusBadge() {
  const [mode, setMode] = useState('mock');

  useEffect(() => {
    aiAPI.getStatus()
      .then((res) => setMode(res.data?.mode || 'mock'))
      .catch(() => setMode('offline'));
  }, []);

  return (
    <span
      className="badge badge-purple"
      title="AI runs in offline demo mode until API keys are added"
    >
      <Sparkles className="h-3 w-3 mr-1" />
      AI: {mode === 'mock' ? 'Demo mode' : mode}
    </span>
  );
}
