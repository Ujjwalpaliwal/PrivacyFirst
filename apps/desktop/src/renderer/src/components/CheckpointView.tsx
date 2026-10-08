import React, { useState } from 'react';
import { Send, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Finding, SanitizeResult } from '@privacyfirst/engine';
import { useAppStore, SendMode } from '../stores/useAppStore';

const PRESETS = {
  tax: `My name is Rahul Sharma, PAN ABCDE1234F, Aadhaar 2345 6789 0124, email rahul@acme.in. My salary is 18,00,000 INR. Help me calculate my tax liability under the new regime.`,
  env: `DATABASE_URL=postgres://admin:p@ssw0rd@prod.db.internal:5432/app\nOPENAI_API_KEY=sk-proj-1234567890abcdef12345678\nSTRIPE_SECRET_KEY=sk_live_abc123xyz456789\nREDIS_URL=redis://:redispassword@cache.internal:6379`,
  support: `Customer: Priya Menon, priya@example.com\nCard: 4111 1111 1111 1111\nPhone: +91 98765 43210\nIssue: Payment declined on order #ORD-8821`,
  invalidAadhaar: `My Aadhaar is 1234 5678 9012. This is an invalid number and should NOT be masked.`
};

export const CheckpointView: React.FC = () => {
  const { allowList, defaultSendMode, memoryApiKeys } = useAppStore();
  const [inputText, setInputText] = useState(PRESETS.tax);
  const [isScanning, setIsScanning] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [sanitizedText, setSanitizedText] = useState('');
  const [hasScanned, setHasScanned] = useState(false);

  const [sendMode, setSendMode] = useState<SendMode>(defaultSendMode);
  const [isSending, setIsSending] = useState(false);
  const [rawReply, setRawReply] = useState('');
  const [restoredReply, setRestoredReply] = useState('');
  const [replyViewMode, setReplyViewMode] = useState<'restored' | 'raw'>('restored');

  const handleSanitize = async () => {
    if (!inputText.trim()) return;

    setIsScanning(true);
    setRawReply('');
    setRestoredReply('');

    setTimeout(async () => {
      if (window.privacyFirst) {
        const result: SanitizeResult = await window.privacyFirst.sanitize(inputText, allowList);
        setFindings(result.findings);
        setSanitizedText(result.sanitized);
        setHasScanned(true);
      }
      setIsScanning(false);
    }, 150);
  };

  const handleClear = async () => {
    setInputText('');
    setFindings([]);
    setSanitizedText('');
    setHasScanned(false);
    setRawReply('');
    setRestoredReply('');
    if (window.privacyFirst) {
      await window.privacyFirst.clearVault();
    }
  };

  const handleSendToAI = async () => {
    if (!inputText.trim()) return;

    setIsSending(true);
    const textToSend = sendMode === 'SANITIZED' ? sanitizedText || inputText : inputText;

    try {
      // If user provided an OpenAI key in Settings, make real call; otherwise generate rich mock reply
      if (memoryApiKeys.openai) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${memoryApiKeys.openai}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: textToSend }]
          })
        });
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || 'No response from model.';
        setRawReply(content);
        if (window.privacyFirst) {
          const restored = await window.privacyFirst.restore(content);
          setRestoredReply(restored);
        } else {
          setRestoredReply(content);
        }
      } else {
        // Canned mock fallback that mirrors placeholders
        await new Promise((r) => setTimeout(r, 600));
        const phs = [...textToSend.matchAll(/\[([A-Z_]+_\d+)\]/g)].map((m) => m[0]);
        const personPh = phs.find((p) => p.startsWith('[PERSON')) || null;
        const greeting = personPh ? `Hello ${personPh},` : 'Hello,';

        const mock = `${greeting} I have analyzed your request under the latest tax guidelines.\n\nSummary of received inputs:\n${phs
          .map((ph) => `• Identified parameter: ${ph}`)
          .join('\n')}\n\nFor a gross salary of 18,00,000 INR under the New Tax Regime (FY 2024-25):\n• Standard deduction: ₹75,000\n• Taxable income: ₹17,25,000\n• Estimated tax liability: ₹2,17,500 (plus 4% cess).\n\n(Local simulated reply — configure an API key in Settings for live models).`;

        setRawReply(mock);
        if (window.privacyFirst) {
          const restored = await window.privacyFirst.restore(mock);
          setRestoredReply(restored);
        } else {
          setRestoredReply(mock);
        }
      }
    } catch (err: any) {
      setRawReply(`Error communicating with AI: ${err.message}`);
      setRestoredReply(`Error communicating with AI: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 max-w-5xl mx-auto w-full gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#ededed]">Chat Checkpoint</h1>
          <p className="text-xs text-[#888888] mt-0.5">
            Inspect, sanitize, and restore AI prompts locally before anything leaves your machine.
          </p>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center gap-2">
          <div className="flex border border-[#2e2e2e] bg-[#121212] p-0.5">
            <button
              onClick={() => setSendMode('SANITIZED')}
              className={`px-3 py-1 text-xs font-mono font-medium transition-colors ${
                sendMode === 'SANITIZED' ? 'bg-amber text-black font-semibold' : 'text-[#888888] hover:text-[#ededed]'
              }`}
            >
              SANITIZED
            </button>
            <button
              onClick={() => setSendMode('ORIGINAL')}
              className={`px-3 py-1 text-xs font-mono font-medium transition-colors ${
                sendMode === 'ORIGINAL' ? 'bg-red-500 text-white font-semibold' : 'text-[#888888] hover:text-[#ededed]'
              }`}
            >
              ORIGINAL
            </button>
          </div>

          {sendMode === 'ORIGINAL' && (
            <span className="px-2 py-1 bg-amber-950/60 border border-amber/40 text-amber text-[10px] font-mono flex items-center gap-1">
              <AlertCircle size={12} />
              Sending original — unmasked
            </span>
          )}
        </div>
      </div>

      {/* Preset Toolbar */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-[#666666] font-mono uppercase text-[10px]">Presets:</span>
        <button
          onClick={() => {
            setInputText(PRESETS.tax);
            setHasScanned(false);
          }}
          className="px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#282828] hover:border-amber/40 text-[#a0a0a0] hover:text-amber text-xs transition-colors"
        >
          Tax Prompt
        </button>
        <button
          onClick={() => {
            setInputText(PRESETS.env);
            setHasScanned(false);
          }}
          className="px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#282828] hover:border-amber/40 text-[#a0a0a0] hover:text-amber text-xs transition-colors"
        >
          .env Secrets
        </button>
        <button
          onClick={() => {
            setInputText(PRESETS.support);
            setHasScanned(false);
          }}
          className="px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#282828] hover:border-amber/40 text-[#a0a0a0] hover:text-amber text-xs transition-colors"
        >
          Customer Support
        </button>
        <button
          onClick={() => {
            setInputText(PRESETS.invalidAadhaar);
            setHasScanned(false);
          }}
          className="px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#282828] hover:border-amber/40 text-[#a0a0a0] hover:text-amber text-xs transition-colors"
        >
          Invalid Aadhaar Test
        </button>
      </div>

      {/* Textarea Input */}
      <div className="flex flex-col gap-2">
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setHasScanned(false);
          }}
          placeholder="Paste or type sensitive prompt here..."
          rows={5}
          className="w-full bg-[#111111] border border-[#282828] focus:border-amber text-[#ededed] font-mono text-sm p-4 outline-none resize-none transition-colors"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSanitize}
              disabled={isScanning || !inputText.trim()}
              className="px-5 py-2 bg-amber hover:bg-[#b88b13] text-black font-semibold text-xs tracking-wider uppercase flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              {isScanning ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-black border-t-transparent animate-spin rounded-full" />
                  Scanning...
                </>
              ) : (
                'Sanitize Prompt'
              )}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 bg-transparent hover:bg-[#161616] text-[#888888] hover:text-[#ededed] border border-[#282828] text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} />
              Clear
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#666666]">
            {inputText.length} characters &middot; 100% offline detection
          </span>
        </div>
      </div>

      {/* Findings Table */}
      {hasScanned && (
        <div className="border border-[#282828] bg-[#121212]">
          <div className="px-4 py-2.5 bg-[#161616] border-b border-[#282828] flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#a0a0a0]">
              Detection Findings ({findings.length})
            </span>
            {findings.length > 0 ? (
              <span className="text-[11px] font-mono text-amber">
                ● {findings.length} sensitive items masked
              </span>
            ) : (
              <span className="text-[11px] font-mono text-green-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> No sensitive PII detected
              </span>
            )}
          </div>

          {findings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#222222] text-[#666666] bg-[#0e0e0e]">
                    <th className="px-4 py-2">TYPE</th>
                    <th className="px-4 py-2">ORIGINAL VALUE</th>
                    <th className="px-4 py-2">PLACEHOLDER</th>
                    <th className="px-4 py-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                  {findings.map((f, i) => (
                    <tr key={i} className="hover:bg-[#161616] transition-colors">
                      <td className="px-4 py-2 text-amber font-semibold">{f.type}</td>
                      <td className="px-4 py-2 text-[#cccccc] max-w-xs truncate">{f.original}</td>
                      <td className="px-4 py-2 text-green-400">{f.placeholder}</td>
                      <td className="px-4 py-2 text-right">
                        <span className="px-1.5 py-0.5 bg-amber-950/60 border border-amber/30 text-amber text-[10px]">
                          MASK
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[#666666] font-mono">
              Input clean. No Aadhaar, PAN, card numbers, or secrets identified.
            </div>
          )}
        </div>
      )}

      {/* Sanitized Preview */}
      {hasScanned && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#a0a0a0]">
              {sendMode === 'SANITIZED' ? 'Sanitized Payload (Outbound)' : 'Original Payload (Outbound)'}
            </span>
            <button
              onClick={handleSendToAI}
              disabled={isSending}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-black font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Send size={12} />
              {isSending ? 'Sending...' : 'Send to Model'}
            </button>
          </div>

          <div className="p-4 bg-[#111111] border border-[#282828] font-mono text-xs text-[#cccccc] leading-relaxed whitespace-pre-wrap">
            {sendMode === 'SANITIZED' ? sanitizedText : inputText}
          </div>
        </div>
      )}

      {/* AI Reply & Restored View */}
      {(rawReply || restoredReply) && (
        <div className="border border-[#282828] bg-[#121212] flex flex-col">
          <div className="px-4 py-2.5 bg-[#161616] border-b border-[#282828] flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#a0a0a0]">
              Model Response
            </span>

            {/* Restored vs As AI Saw It Toggle */}
            <div className="flex border border-[#2e2e2e] bg-[#0e0e0e] p-0.5">
              <button
                onClick={() => setReplyViewMode('restored')}
                className={`px-2.5 py-0.5 text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  replyViewMode === 'restored'
                    ? 'bg-amber text-black font-bold'
                    : 'text-[#888888] hover:text-[#ededed]'
                }`}
              >
                <Eye size={12} />
                Restored
              </button>
              <button
                onClick={() => setReplyViewMode('raw')}
                className={`px-2.5 py-0.5 text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  replyViewMode === 'raw'
                    ? 'bg-[#2a2a2a] text-[#ededed] font-bold'
                    : 'text-[#888888] hover:text-[#ededed]'
                }`}
              >
                <EyeOff size={12} />
                As AI Saw It
              </button>
            </div>
          </div>

          <div className="p-4 font-mono text-xs text-[#ededed] leading-relaxed whitespace-pre-wrap">
            {replyViewMode === 'restored' ? restoredReply : rawReply}
          </div>
        </div>
      )}
    </div>
  );
};
