import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Trash2, ArrowUpRight, Activity } from 'lucide-react';
import { ProxyLogEntry } from '@privacyfirst/proxy';
import { useAppStore } from '../stores/useAppStore';

export const ProxyLogView: React.FC = () => {
  const { proxyMode, setProxyMode, proxyLogs, clearProxyLogs } = useAppStore();
  const [selectedLog, setSelectedLog] = useState<ProxyLogEntry | null>(null);

  const handleToggleMode = async (newMode: 'SANITIZE' | 'PASSTHROUGH') => {
    setProxyMode(newMode);
    if (window.privacyFirst) {
      await window.privacyFirst.setProxyMode(newMode);
    }
  };

  const getCallerBadge = (caller: string) => {
    switch (caller) {
      case 'opencode':
        return 'bg-purple-950/60 border-purple-500/40 text-purple-300';
      case 'claude':
        return 'bg-amber-950/60 border-amber/40 text-amber';
      case 'codex':
        return 'bg-blue-950/60 border-blue-500/40 text-blue-300';
      default:
        return 'bg-[#1a1a1a] border-[#333333] text-[#a0a0a0]';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden max-w-6xl mx-auto w-full p-6 gap-5">
      {/* Top Header & Mode Toggle */}
      <div className="flex items-center justify-between border-b border-[#222222] pb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#ededed]">Live Proxy Gateway</h1>
            <span className="px-2 py-0.5 bg-green-950/60 border border-green-500/30 text-green-400 font-mono text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              127.0.0.1:4040 ONLINE
            </span>
          </div>
          <p className="text-xs text-[#888888] mt-0.5">
            Interception stream for local coding agents (opencode, Claude Code, Codex).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-[#2e2e2e] bg-[#121212] p-0.5">
            <button
              onClick={() => handleToggleMode('SANITIZE')}
              className={`px-3 py-1 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                proxyMode === 'SANITIZE'
                  ? 'bg-amber text-black font-semibold'
                  : 'text-[#888888] hover:text-[#ededed]'
              }`}
            >
              <ShieldCheck size={13} />
              SANITIZE
            </button>
            <button
              onClick={() => handleToggleMode('PASSTHROUGH')}
              className={`px-3 py-1 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                proxyMode === 'PASSTHROUGH'
                  ? 'bg-red-500 text-white font-semibold'
                  : 'text-[#888888] hover:text-[#ededed]'
              }`}
            >
              <ShieldAlert size={13} />
              PASSTHROUGH
            </button>
          </div>

          <button
            onClick={clearProxyLogs}
            className="p-1.5 bg-transparent hover:bg-[#161616] text-[#888888] hover:text-[#ededed] border border-[#282828] text-xs transition-colors"
            title="Clear logs"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Split Layout: Logs Table & Detail Drawer */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Table Container */}
        <div className="flex-1 border border-[#282828] bg-[#121212] flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-[#161616] border-b border-[#282828] flex items-center justify-between text-xs text-[#888888] font-mono">
            <span>REQUEST LOG ({proxyLogs.length})</span>
            <span>AUTO-SCROLL ON</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {proxyLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#666666]">
                <Activity size={32} className="mb-2 opacity-40 text-amber" />
                <p className="text-xs font-mono">Waiting for local tool requests on 127.0.0.1:4040...</p>
                <p className="text-[11px] text-[#555555] mt-1 max-w-sm">
                  Run opencode, Claude Code, or Codex configured with Auto-protect to see live intercepted calls.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#222222] text-[#666666] bg-[#0e0e0e] sticky top-0">
                    <th className="px-3 py-2">TIME</th>
                    <th className="px-3 py-2">CALLER</th>
                    <th className="px-3 py-2">ROUTE</th>
                    <th className="px-3 py-2">UPSTREAM</th>
                    <th className="px-3 py-2 text-center">MASKED</th>
                    <th className="px-3 py-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c1c]">
                  {proxyLogs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-950/30' : 'hover:bg-[#161616]'
                        }`}
                      >
                        <td className="px-3 py-2 text-[#888888]">{log.timestamp}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 border text-[10px] uppercase font-semibold ${getCallerBadge(
                              log.caller
                            )}`}
                          >
                            {log.caller}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#ededed]">{log.route}</td>
                        <td className="px-3 py-2 text-[#777777]">{log.upstream}</td>
                        <td className="px-3 py-2 text-center">
                          {log.findingsCount > 0 ? (
                            <span className="px-1.5 py-0.2 bg-amber-950/60 border border-amber/30 text-amber text-[10px] font-semibold">
                              {log.findingsCount} PII
                            </span>
                          ) : (
                            <span className="text-[#555555]">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={`font-semibold ${
                              log.status === 200 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Selected Log Detail Panel */}
        {selectedLog && (
          <div className="w-80 border border-[#282828] bg-[#121212] flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 bg-[#161616] border-b border-[#282828] flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#a0a0a0]">
                Request Detail
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#666666] hover:text-[#ededed] text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4 text-xs font-mono">
              <div>
                <span className="text-[#666666] block text-[10px] uppercase">Route & Target</span>
                <span className="text-[#ededed] font-medium">{selectedLog.route}</span>
                <span className="text-[#888888] block text-[11px]">→ {selectedLog.upstream}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 border-y border-[#222222] py-2">
                <div>
                  <span className="text-[#666666] block text-[10px] uppercase">Mode</span>
                  <span
                    className={selectedLog.mode === 'SANITIZE' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}
                  >
                    {selectedLog.mode}
                  </span>
                </div>
                <div>
                  <span className="text-[#666666] block text-[10px] uppercase">Duration</span>
                  <span className="text-[#ededed]">{selectedLog.durationMs} ms</span>
                </div>
              </div>

              <div>
                <span className="text-[#666666] block text-[10px] uppercase mb-1">
                  Masked Findings ({selectedLog.findings.length})
                </span>
                {selectedLog.findings.length === 0 ? (
                  <p className="text-[11px] text-[#555555]">No PII was present in this payload.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {selectedLog.findings.map((f, idx) => (
                      <div key={idx} className="p-2 bg-[#161616] border border-[#282828] text-[11px]">
                        <div className="flex items-center justify-between text-amber font-semibold">
                          <span>{f.type}</span>
                          <span className="text-green-400">{f.placeholder}</span>
                        </div>
                        <div className="text-[#888888] truncate mt-1">Value: {f.original}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
