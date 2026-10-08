import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

export const RawModeBanner: React.FC = () => {
  const { proxyMode, setProxyMode } = useAppStore();

  if (proxyMode !== 'PASSTHROUGH') {
    return null;
  }

  const handleEnableProtection = async () => {
    setProxyMode('SANITIZE');
    if (window.privacyFirst) {
      await window.privacyFirst.setProxyMode('SANITIZE');
    }
  };

  return (
    <div className="bg-red-950/80 border-b border-red-500/40 px-4 py-2 flex items-center justify-between text-xs text-red-200 select-none z-30">
      <div className="flex items-center gap-2 font-mono">
        <AlertTriangle size={14} className="text-red-400 animate-pulse" />
        <span className="font-bold tracking-wider text-red-400">RAW MODE ACTIVE:</span>
        <span>All AI requests pass through 127.0.0.1:4040 unmasked. Nothing is being sanitized.</span>
      </div>
      <button
        onClick={handleEnableProtection}
        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-black font-semibold uppercase tracking-wider text-[11px] transition-colors"
      >
        Re-enable Protection
      </button>
    </div>
  );
};
