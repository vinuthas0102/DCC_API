import { useEffect, useState } from 'react';
import { PlugZap, Send, Radio, CircleCheck, CircleAlert, FileCode2 } from 'lucide-react';
import { getStatus, subscribeStatus, sendExternalPayload, type ApiStatus } from '@/services/dccApiService';
import { ApiSpecModal } from '@/components/ApiSpecModal';

export function ConnectionPanel() {
  const [status, setStatus] = useState<ApiStatus>(getStatus());
  const [payload, setPayload] = useState(
    JSON.stringify(
      {
        generationRuleNo: 'DCC-R-EXTERNAL-01',
        status: 'Active',
        targetObject: 'Property',
        targetObjectId: 'PROP-EXT-01',
        demandType: 'Rent',
        generationFrequencyCode: '01',
        demandAmount: 10000,
        gstPercent: 18,
        dueDateRefSource: 'TPA',
        gracePeriodDays: 5,
        increaseApplicationMonths: null,
        increasePercent: null,
        increaseMin: null,
        increaseMax: null,
        increaseAlertCriteria: '',
        lastRunDate: null,
        nextRunDate: '2026-12-01',
        nextInstalmentSeq: null,
        tpaUrlId: 'TPA-EXTERNAL-POST',
        allowedCollectionModes: ['E-pay'],
        collectionMethods: ['Full'],
        exceptions: [],
      },
      null,
      2,
    ),
  );
  const [result, setResult] = useState<{ ok: boolean; status: number; body: unknown } | null>(null);
  const [sending, setSending] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);

  useEffect(() => subscribeStatus(setStatus), []);

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      const parsed = JSON.parse(payload);
      const res = await sendExternalPayload(parsed);
      setResult(res);
    } catch (e) {
      setResult({ ok: false, status: 0, body: { error: `Invalid JSON: ${String(e)}` } });
    } finally {
      setSending(false);
    }
  };

  const isNgrok = /^https?:\/\//.test(status.baseUrl);

  return (
    <div className="space-y-2 p-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-slate-300 bg-white p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <PlugZap size={12} /> Active API Base URL
          </div>
          <code className="block break-all rounded bg-slate-100 px-1.5 py-1 text-[11px] text-slate-800">{status.baseUrl}</code>
          <p className="mt-1 text-[11px] text-slate-500">
            {isNgrok
              ? 'External endpoint (e.g. ngrok tunnel) — JSON posts sent here are reflected in the rule list.'
              : 'Relative to this app (built-in dev JSON API). Set VITE_API_BASE_URL to an ngrok HTTPS URL to post externally.'}
          </p>
        </div>
        <div className="rounded border border-slate-300 bg-white p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Radio size={12} /> Payload Receiver Status
          </div>
          {status.lastPayload ? (
            <div className="space-y-0.5 text-[11px] text-slate-700">
              <div className="flex items-center gap-1">
                {status.lastPayload.status >= 200 && status.lastPayload.status < 300 ? (
                  <CircleCheck size={12} className="text-emerald-600" />
                ) : (
                  <CircleAlert size={12} className="text-rose-600" />
                )}
                <span className="font-mono font-semibold">{status.lastPayload.method}</span>
                <span className="font-mono">{status.lastPayload.status || 'ERR'}</span>
                <span className="ml-auto text-slate-400">{new Date(status.lastPayload.at).toLocaleTimeString()}</span>
              </div>
              <code className="block break-all text-[10px] text-slate-500">{status.lastPayload.url}</code>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">No JSON payload exchanged yet this session.</p>
          )}
        </div>
      </div>

      <div className="rounded border border-slate-300 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2 py-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">JSON Payload Tester — POST to API</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSpecOpen(true)}
              className="inline-flex h-6 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              title="View the OpenAPI 3.0 specification for this API"
            >
              <FileCode2 size={11} /> API Spec
            </button>
            <button
              onClick={send}
              disabled={sending}
              className="inline-flex h-6 items-center gap-1 rounded bg-teal-800 px-2 text-[11px] font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Send size={11} /> {sending ? 'Sending…' : 'Send POST'}
            </button>
          </div>
        </div>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full resize-y bg-slate-50 p-2 font-mono text-[11px] text-slate-800 outline-none"
        />
        {result && (
          <div className={`border-t px-2 py-1.5 text-[11px] ${result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            <span className="font-semibold">HTTP {result.status || 'error'}</span>
            <pre className="mt-0.5 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px]">
              {JSON.stringify(result.body, null, 2)}
            </pre>
          </div>
        )}
      </div>
      <ApiSpecModal open={specOpen} onClose={() => setSpecOpen(false)} />
    </div>
  );
}
