import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle, Shield } from 'lucide-react';
import { useAppStore, SendMode } from '../stores/useAppStore';

export const RulesView: React.FC = () => {
  const { allowList, addAllowItem, removeAllowItem, defaultSendMode, setDefaultSendMode } = useAppStore();
  const [newItem, setNewItem] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    addAllowItem(newItem.trim());
    setNewItem('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto max-w-4xl mx-auto w-full p-6 gap-6">
      {/* Header */}
      <div className="border-b border-[#222222] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#ededed]">Privacy Rules & Allow-Lists</h1>
        <p className="text-xs text-[#888888] mt-0.5">
          Configure detection exemptions and default session preferences.
        </p>
      </div>

      {/* Default Outbound Action */}
      <div className="border border-[#282828] bg-[#121212] p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber">
            Default Session Send Mode
          </h2>
          <p className="text-xs text-[#888888] mt-1">
            Choose what Mode A sends by default. You can always override this on a per-prompt basis.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => setDefaultSendMode('SANITIZED')}
            className={`p-3 border text-left flex flex-col gap-1 transition-colors ${
              defaultSendMode === 'SANITIZED'
                ? 'bg-amber-950/40 border-amber text-amber font-semibold'
                : 'bg-[#161616] border-[#2a2a2a] text-[#888888] hover:text-[#ededed]'
            }`}
          >
            <span className="text-xs font-mono font-bold">SANITIZED (Recommended)</span>
            <span className="text-[11px] text-[#a0a0a0]">Only placeholder tokens are transmitted.</span>
          </button>

          <button
            onClick={() => setDefaultSendMode('ORIGINAL')}
            className={`p-3 border text-left flex flex-col gap-1 transition-colors ${
              defaultSendMode === 'ORIGINAL'
                ? 'bg-red-950/40 border-red-500 text-red-300 font-semibold'
                : 'bg-[#161616] border-[#2a2a2a] text-[#888888] hover:text-[#ededed]'
            }`}
          >
            <span className="text-xs font-mono font-bold">ORIGINAL</span>
            <span className="text-[11px] text-[#a0a0a0]">Transmits raw unmasked prompt text.</span>
          </button>
        </div>
      </div>

      {/* Allow-List Configuration */}
      <div className="border border-[#282828] bg-[#121212] flex flex-col">
        <div className="p-5 border-b border-[#282828] flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber">
            Global Allow-List (Exemptions)
          </h2>
          <p className="text-xs text-[#888888]">
            Values added here will bypass detector masking (e.g. your public company support email or non-sensitive test tokens).
          </p>

          <form onSubmit={handleAdd} className="flex gap-2 mt-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="e.g. support@acme.com, 192.168.1.1"
              className="flex-1 bg-[#161616] border border-[#2a2a2a] focus:border-amber text-xs font-mono px-3 py-2 text-[#ededed] outline-none"
            />
            <button
              type="submit"
              disabled={!newItem.trim()}
              className="px-4 py-2 bg-amber hover:bg-[#b88b13] text-black font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Plus size={14} /> Add Exemption
            </button>
          </form>
        </div>

        <div className="p-4">
          {allowList.length === 0 ? (
            <div className="text-center py-6 text-[#666666] font-mono text-xs">
              No exemptions configured. All 12 entity detectors are operating at 100% strictness.
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e1e]">
              {allowList.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2 text-[#cccccc]">
                    <Shield size={13} className="text-amber" />
                    <span>{item}</span>
                  </div>
                  <button
                    onClick={() => removeAllowItem(item)}
                    className="text-[#666666] hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
