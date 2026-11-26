import { useEffect, useState } from 'react';
import { Copy, Check, X, FileCode2 } from 'lucide-react';
import specYaml from '@/../docs/dcc-rules-openapi.yaml?raw';

export function ApiSpecModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(specYaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — user can select the text manually
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded border border-slate-300 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <FileCode2 size={16} className="text-teal-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">OpenAPI 3.0 Specification — DCC Rules API</h3>
              <p className="text-[10px] text-slate-500">docs/dcc-rules-openapi.yaml</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="inline-flex h-7 items-center gap-1.5 rounded bg-teal-700 px-2.5 text-xs font-semibold text-white hover:bg-teal-600"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy YAML'}
            </button>
            <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-100">
          {specYaml}
        </pre>
      </div>
    </div>
  );
}
