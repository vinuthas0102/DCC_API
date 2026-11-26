import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Plus, Plug, Cable, X } from 'lucide-react';
import type { DccRule } from '@/types/dcc';
import { emptyRule } from '@/types/dcc';
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  nextRuleSuggestion,
  getStatus,
  subscribeStatus,
  type ApiStatus,
} from '@/services/dccApiService';import { RuleSummaryTable, type Filters } from '@/components/RuleSummaryTable';
import { RuleEditorPanel, type EditorMode } from '@/components/RuleEditorPanel';
import { ConnectionPanel } from '@/components/ConnectionPanel';
import { LookupsProvider } from '@/services/lookupsContext';
import { Badge } from '@/components/ui';

const EMPTY_FILTERS: Filters = { search: '', frequency: '', demandType: '', collectionMethod: '', status: '' };

export default function App() {
  return (
    <LookupsProvider>
      <AppInner />
    </LookupsProvider>
  );
}

function AppInner() {
  const [rules, setRules] = useState<DccRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editorRule, setEditorRule] = useState<DccRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DccRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showConnection, setShowConnection] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>(getStatus());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => subscribeStatus(setApiStatus), []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listRules();
      setRules(data);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load rules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditorMode('create');
    setEditorRule(emptyRule(nextRuleSuggestion(rules)));
    setEditorError(null);
    setEditorOpen(true);
  };

  const openEdit = (r: DccRule) => {
    setEditorMode('edit');
    setEditorRule(structuredClone(r));
    setEditorError(null);
    setEditorOpen(true);
  };

  const openView = (r: DccRule) => {
    setEditorMode('view');
    setEditorRule(structuredClone(r));
    setEditorError(null);
    setEditorOpen(true);
  };

  const openDuplicate = (r: DccRule) => {
    const copy: DccRule = structuredClone(r);
    copy.generationRuleNo = nextRuleSuggestion(rules);
    copy.status = 'Inactive';
    copy.lastRunDate = null;
    setEditorMode('create');
    setEditorRule(copy);
    setEditorError(null);
    setEditorOpen(true);
  };

  const handleSave = async (draft: DccRule) => {
    setSaving(true);
    setEditorError(null);
    try {
      if (editorMode === 'create') {
        await createRule(draft);
      } else if (editorMode === 'edit') {
        await updateRule(draft.generationRuleNo, draft);
      }
      setEditorOpen(false);
      setEditorRule(null);
      await refresh();
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRule(deleteTarget.generationRuleNo);
      setDeleteTarget(null);
      if (editorRule?.generationRuleNo === deleteTarget.generationRuleNo) {
        setEditorOpen(false);
        setEditorRule(null);
      }
      await refresh();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Delete failed');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.status === 'Active').length;
    const exceptions = rules.reduce((m, r) => m + r.exceptions.length, 0);
    const adHoc = rules.filter((r) => ['99', '98'].includes(r.generationFrequencyCode)).length;
    return [
      { label: 'Total Rules', value: rules.length },
      { label: 'Active', value: active },
      { label: 'Ad Hoc (99/98)', value: adHoc },
      { label: 'Exception Rows', value: exceptions },
    ];
  }, [rules]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="relative flex items-center gap-3 border-b border-slate-950/40 bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-2 text-white shadow-sm">
        <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
        <div className="flex items-center gap-2">
          <Cable size={18} className="text-teal-300" />
          <div>
            <h1 className="text-sm font-bold leading-tight tracking-wide">Demand & Collection Center — Rule Setup & Management</h1>
            <p className="text-[10px] leading-tight text-slate-400">JSON rule store · no external database</p>
          </div>
        </div>
        <div className="ml-4 flex items-center gap-2 border-l border-slate-700/80 pl-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-center transition-colors hover:border-teal-500/40 hover:bg-slate-700/60"
            >
              <div className="text-base font-bold leading-none tabular-nums text-teal-300 transition-all hover:text-teal-200">{s.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowConnection((v) => !v)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
              showConnection
                ? 'border-teal-400/60 bg-teal-600 text-white shadow-sm'
                : 'border-slate-600 bg-slate-700/70 text-slate-200 hover:border-slate-500 hover:bg-slate-600'
            }`}
            title="API connection & JSON payload tester"
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${showConnection ? 'bg-teal-200' : 'bg-emerald-400'}`} />
            <Plug size={13} />
            <span className="font-mono">{apiStatus.baseUrl}</span>
          </button>
          <button
            onClick={() => void refresh()}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-600 bg-slate-700/70 px-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-600"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-teal-600 px-3 text-xs font-bold text-white shadow-sm shadow-teal-900/40 ring-1 ring-inset ring-teal-400/30 transition-colors hover:bg-teal-500"
          >
            <Plus size={14} /> New Rule
          </button>
        </div>
      </header>

      {/* Body — summary (60%) and editor (40%) share a proportional split */}
      <div className="relative flex min-h-0 flex-1">
        <main className={`flex min-w-0 flex-col bg-white ${editorOpen ? 'w-[60%] flex-shrink-0' : 'flex-1'}`}>
          {loadError && (
            <div className="border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">{loadError}</div>
          )}
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading rules…</div>
          ) : (
            <RuleSummaryTable
              rules={rules}
              filters={filters}
              onFilters={setFilters}
              onView={openView}
              onEdit={openEdit}
              onDuplicate={openDuplicate}
              onDelete={setDeleteTarget}
              activeRuleNo={editorOpen && editorMode !== 'create' ? editorRule?.generationRuleNo ?? null : null}
              compact={editorOpen || showConnection}
            />
          )}
          <footer className="border-t border-slate-200 bg-slate-50 px-3 py-1 text-[10px] text-slate-400">
            Frequencies: 99 = Ad hoc TPA (next run 999999) · 98 = Ad hoc Excel (999998) · 95 = Instalment · 01–30 Monthly · 41–47 Daily · 51–57 Weekly · 70 Fortnightly · 75 Quarterly · 80/81 Yearly · 89 Fixed date
          </footer>
        </main>

        {/* Rule editor split panel — fixed 40% of the viewport */}
        {editorOpen && (
          <section className="flex w-[40%] flex-shrink-0 flex-col dcc-slide-in">
            <RuleEditorPanel
              open={editorOpen}
              mode={editorMode}
              rule={editorRule}
              onClose={() => {
                setEditorOpen(false);
                setEditorRule(null);
              }}
              onSave={handleSave}
              saving={saving}
              error={editorError}
            />
          </section>
        )}

        {/* Connection side panel — floats over the editor to keep the 60:40 split */}
        {showConnection && (
          <aside className={`flex flex-col border-l border-slate-300 bg-slate-50 ${editorOpen ? 'absolute bottom-0 right-0 top-0 z-20 w-72 shadow-2xl' : 'w-96 flex-shrink-0'}`}>
            <div className="flex items-center justify-between border-b border-slate-300 bg-white px-3 py-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">API Connection & JSON Tester</h2>
              <button onClick={() => setShowConnection(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X size={14} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ConnectionPanel />
            </div>
          </aside>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40" onClick={() => setDeleteTarget(null)}>
          <div className="w-96 rounded border border-slate-300 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-4 py-2">
              <h3 className="text-sm font-bold text-slate-800">Delete rule {deleteTarget.generationRuleNo}?</h3>
            </div>
            <div className="px-4 py-3 text-xs text-slate-600">
              <p>
                This permanently removes the <span className="font-semibold">{deleteTarget.demandType}</span> rule for{' '}
                <span className="font-semibold">{deleteTarget.targetObject} {deleteTarget.targetObjectId}</span> and its{' '}
                {deleteTarget.exceptions.length} exception row(s).
              </p>
              <div className="mt-1 flex items-center gap-1">
                <Badge tone="red">Irreversible</Badge>
                <Badge tone="slate">{deleteTarget.status}</Badge>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2">
              <button onClick={() => setDeleteTarget(null)} className="h-7 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-7 rounded bg-rose-700 px-3 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
