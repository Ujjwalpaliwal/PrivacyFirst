import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Key, Undo2, PowerOff, Shield } from 'lucide-react';
import { ToolDetectionResult, ConfigPreview, SupportedTool } from '@privacyfirst/connect';
import { useAppStore } from '../stores/useAppStore';

export const SettingsView: React.FC = () => {
  const { memoryApiKeys, setApiKey } = useAppStore();
  const [tools, setTools] = useState<ToolDetectionResult[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [previews, setPreviews] = useState<ConfigPreview[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchTools = async () => {
    setIsDetecting(true);
    if (window.privacyFirst) {
      const detected = await window.privacyFirst.detectTools();
      setTools(detected);
    }
    setIsDetecting(false);
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handlePreview = async (selected: SupportedTool[]) => {
    if (window.privacyFirst) {
      const generatedPreviews = await window.privacyFirst.previewAutoProtect(selected);
      setPreviews(generatedPreviews);
      setShowPreviewModal(true);
    }
  };

  const handleApply = async () => {
    if (window.privacyFirst) {
      const targetTools = tools.filter((t) => t.isInstalled).map((t) => t.tool);
      await window.privacyFirst.applyAutoProtect(targetTools);
      setShowPreviewModal(false);
      setStatusMessage('Auto-protect applied successfully with timestamped backup!');
      fetchTools();
    }
  };

  const handleUndo = async () => {
    if (window.privacyFirst) {
      const restored = await window.privacyFirst.undoAutoProtect();
      if (restored) {
        setStatusMessage('Restored previous configuration from backup.');
      } else {
        setStatusMessage('No previous backup available.');
      }
      fetchTools();
    }
  };

  const handleDisconnectAll = async () => {
    if (window.privacyFirst) {
      await window.privacyFirst.disconnectAutoProtect();
      setStatusMessage('All coding tools disconnected from local proxy.');
      fetchTools();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto max-w-4xl mx-auto w-full p-6 gap-6">
      {/* Header */}
      <div className="border-b border-[#222222] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#ededed]">App Settings & Gateway</h1>
        <p className="text-xs text-[#888888] mt-0.5">
          One-click Auto-protect configuration, memory API credentials, and gateway preferences.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-amber-950/40 border border-amber/40 text-amber text-xs font-mono flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-[#888888] hover:text-[#ededed]">
            ✕
          </button>
        </div>
      )}

      {/* Auto-Protect Section */}
      <div className="border border-[#282828] bg-[#121212] flex flex-col">
        <div className="p-5 border-b border-[#282828] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber flex items-center gap-2">
              <Shield size={16} /> Auto-Protect Coding Tools
            </h2>
            <p className="text-xs text-[#888888] mt-1">
              Automatically routes opencode, Claude Code, and Codex to 127.0.0.1:4040. Never clobbers existing keys.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePreview(tools.filter((t) => t.isInstalled).map((t) => t.tool))}
              disabled={tools.every((t) => !t.isInstalled)}
              className="px-3.5 py-1.5 bg-amber hover:bg-[#b88b13] text-black font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-40"
            >
              Configure All
            </button>
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 bg-transparent hover:bg-[#181818] border border-[#2e2e2e] text-[#a0a0a0] hover:text-[#ededed] text-xs font-mono flex items-center gap-1 transition-colors"
              title="Undo last changes"
            >
              <Undo2 size={13} /> Undo
            </button>
            <button
              onClick={handleDisconnectAll}
              className="px-3 py-1.5 bg-transparent hover:bg-[#181818] border border-[#2e2e2e] text-[#a0a0a0] hover:text-red-400 text-xs font-mono flex items-center gap-1 transition-colors"
              title="Disconnect all tools"
            >
              <PowerOff size={13} /> Disconnect
            </button>
          </div>
        </div>

        {/* Tools List */}
        <div className="p-4 divide-y divide-[#1e1e1e]">
          {tools.map((tool) => (
            <div key={tool.tool} className="py-3 flex items-center justify-between font-mono text-xs">
              <div className="flex flex-col gap-1 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="text-[#ededed] font-semibold">{tool.displayName}</span>
                  {tool.isConfigured ? (
                    <span className="px-1.5 py-0.2 bg-green-950/60 border border-green-500/40 text-green-400 text-[10px]">
                      ROUTED TO 4040
                    </span>
                  ) : tool.isInstalled ? (
                    <span className="px-1.5 py-0.2 bg-yellow-950/60 border border-yellow-500/40 text-yellow-300 text-[10px]">
                      INSTALLED
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 bg-[#1a1a1a] border border-[#333333] text-[#666666] text-[10px]">
                      NOT DETECTED
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#666666] truncate">{tool.configPath}</span>
              </div>

              {tool.isInstalled && (
                <button
                  onClick={() => handlePreview([tool.tool])}
                  className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] border border-[#2a2a2a] text-[#cccccc] text-xs transition-colors"
                >
                  Preview Diff
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Memory API Credentials */}
      <div className="border border-[#282828] bg-[#121212] p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber flex items-center gap-2">
            <Key size={16} /> Mode A Memory API Keys
          </h2>
          <p className="text-xs text-[#888888] mt-1">
            Held in active RAM only. Never written to disk, never stored in localStorage, never sent to PrivacyFirst servers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-mono text-[#888888] block mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={memoryApiKeys.openai || ''}
              onChange={(e) => setApiKey('openai', e.target.value)}
              placeholder="sk-proj-..."
              className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-amber text-xs font-mono px-3 py-2 text-[#ededed] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#888888] block mb-1">Anthropic API Key</label>
            <input
              type="password"
              value={memoryApiKeys.anthropic || ''}
              onChange={(e) => setApiKey('anthropic', e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-amber text-xs font-mono px-3 py-2 text-[#ededed] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#888888] block mb-1">Gemini API Key</label>
            <input
              type="password"
              value={memoryApiKeys.gemini || ''}
              onChange={(e) => setApiKey('gemini', e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-amber text-xs font-mono px-3 py-2 text-[#ededed] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#888888] block mb-1">Custom / Ollama Endpoint</label>
            <input
              type="text"
              value={memoryApiKeys.customEndpoint || ''}
              onChange={(e) => setApiKey('customEndpoint', e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-amber text-xs font-mono px-3 py-2 text-[#ededed] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Diff Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="bg-[#121212] border border-[#333333] max-w-2xl w-full flex flex-col max-h-[80vh] shadow-2xl">
            <div className="px-5 py-3.5 bg-[#161616] border-b border-[#282828] flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-amber">
                Auto-Protect Configuration Preview
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[#888888] hover:text-[#ededed] font-mono text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 font-mono text-xs">
              <div className="p-3 bg-amber-950/30 border border-amber/30 text-amber text-[11px]">
                Safe Merge: Existing settings and environment configurations are retained intact. A backup will be created in ~/.privacyfirst/backups/
              </div>

              {previews.map((prev) => (
                <div key={prev.tool} className="flex flex-col gap-1.5">
                  <span className="text-[#a0a0a0] font-semibold">{prev.tool} → {prev.configPath}</span>
                  <pre className="p-3 bg-[#0a0a0a] border border-[#222222] text-green-400 text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {prev.proposedContent}
                  </pre>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-[#161616] border-t border-[#282828] flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-3 py-1.5 bg-transparent hover:bg-[#202020] border border-[#2a2a2a] text-[#888888] hover:text-[#ededed] text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-1.5 bg-amber hover:bg-[#b88b13] text-black font-semibold text-xs font-mono uppercase tracking-wider"
              >
                Apply Changes & Backup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
