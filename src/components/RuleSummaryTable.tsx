import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Pencil, Copy, Trash2, MoreVertical, SlidersHorizontal, Search } from 'lucide-react';
import type { DccRule } from '@/types/dcc';
import { frequencyByCode, isAdHoc } from '@/types/dcc';
import { useLookups } from '@/services/lookupsContext';
import { Badge } from '@/components/ui';

export interface Filters {
  search: string;
  frequency: string;
  demandType: string;
  collectionMethod: string;
  status: string;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  if (d === '999999') return '999999 (TPA ad hoc)';
  if (d === '999998') return '999998 (Excel ad hoc)';
  return d;
}

function fmtAmount(n: number | null): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('en-IN');
}

export function RuleSummaryTable({ rules, filters, onFilters, onView, onEdit, onDuplicate, onDelete, activeRuleNo, compact }: {
  rules: DccRule[];
  filters: Filters;
  onFilters: (f: Filters) => void;
  onView: (r: DccRule) => void;
  onEdit: (r: DccRule) => void;
  onDuplicate: (r: DccRule) => void;
  onDelete: (r: DccRule) => void;
  activeRuleNo: string | null;
  compact: boolean;
}) {
  const { lookups } = useLookups();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [menuAbove, setMenuAbove] = useState(false);
  const menuRowRef = useRef<HTMLTableCellElement | null>(null);

  const dropdownFilterCount =
    (filters.frequency ? 1 : 0) +
    (filters.demandType ? 1 : 0) +
    (filters.collectionMethod ? 1 : 0) +
    (filters.status ? 1 : 0);

  const frequencies = useMemo(() => {
    const set = new Map<string, string>();
    rules.forEach((r) => set.set(r.generationFrequencyCode, frequencyByCode(r.generationFrequencyCode)?.label ?? ''));
    return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rules]);

  const filtered = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    return rules.filter((r) => {
      if (filters.frequency && r.generationFrequencyCode !== filters.frequency) return false;
      if (filters.demandType && r.demandType !== filters.demandType) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.collectionMethod && !r.collectionMethods.includes(filters.collectionMethod as never)) return false;
      if (s) {
        const hay = [r.generationRuleNo, r.targetObject, r.targetObjectId, r.demandType, r.tpaUrlId]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rules, filters]);

  const activeFilter =
    filters.search || filters.frequency || filters.demandType || filters.collectionMethod || filters.status;

  const clearAll = () =>
    onFilters({ search: '', frequency: '', demandType: '', collectionMethod: '', status: '' });

  // Keep the filter section visible whenever dropdown filters are in effect.
  useEffect(() => {
    if (dropdownFilterCount > 0) setFiltersOpen(true);
  }, [dropdownFilterCount]);

  // Close the actions menu on outside click or Escape.
  useEffect(() => {
    if (!openMenuFor) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (menuRowRef.current?.contains(e.target)) return;
      setOpenMenuFor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuFor(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenuFor]);

  const toggleMenu = (ruleNo: string, cell: HTMLTableCellElement | null) => {
    if (openMenuFor === ruleNo) {
      setOpenMenuFor(null);
      return;
    }
    if (cell) {
      const rect = cell.getBoundingClientRect();
      setMenuAbove(window.innerHeight - rect.bottom < 190);
    }
    menuRowRef.current = cell;
    setOpenMenuFor(ruleNo);
  };

  const menuItems = (r: DccRule) => [
    { key: 'view', icon: Eye, label: 'View', danger: false, action: () => onView(r) },
    { key: 'edit', icon: Pencil, label: 'Edit', danger: false, action: () => onEdit(r) },
    { key: 'duplicate', icon: Copy, label: 'Duplicate', danger: false, action: () => onDuplicate(r) },
    { key: 'delete', icon: Trash2, label: 'Delete', danger: true, action: () => onDelete(r) },
  ];

  const selectCls =
    'h-6 min-w-[120px] rounded border border-slate-300 bg-white px-1 text-xs outline-none transition-colors focus:border-teal-600 focus:ring-1 focus:ring-teal-600/30';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar — search + filter toggle */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-1.5">
        <div className="relative">
          <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => onFilters({ ...filters, search: e.target.value })}
            placeholder="Search rule #, target, TPA URL…"
            className="h-6 w-56 rounded border border-slate-300 bg-white pl-6 pr-2 text-xs outline-none transition-colors focus:border-teal-600 focus:ring-1 focus:ring-teal-600/30"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={`inline-flex h-6 items-center gap-1 rounded border px-2 text-[11px] font-semibold transition-colors ${
            filtersOpen
              ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
              : 'border-slate-300 bg-white text-slate-700 hover:border-teal-600 hover:text-teal-800'
          }`}
          title="Toggle filters (Esc to close)"
        >
          <SlidersHorizontal size={12} />
          Filter
          {dropdownFilterCount > 0 && (
            <span
              className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                filtersOpen ? 'bg-white/20 text-white' : 'bg-teal-600 text-white'
              }`}
            >
              {dropdownFilterCount}
            </span>
          )}
        </button>
        {activeFilter && (
          <button
            onClick={clearAll}
            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[11px] font-medium text-slate-500">
          {filtered.length} of {rules.length} rules
        </span>
      </div>

      {/* Collapsible filter row */}
      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100/70 px-3 py-1.5">
          <select
            value={filters.frequency}
            onChange={(e) => onFilters({ ...filters, frequency: e.target.value })}
            className={selectCls}
          >
            <option value="">All frequencies</option>
            {frequencies.map(([code, label]) => (
              <option key={code} value={code}>{code} — {label}</option>
            ))}
          </select>
          <select
            value={filters.demandType}
            onChange={(e) => onFilters({ ...filters, demandType: e.target.value })}
            className={selectCls}
          >
            <option value="">All demand types</option>
            {lookups.demandTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filters.collectionMethod}
            onChange={(e) => onFilters({ ...filters, collectionMethod: e.target.value })}
            className={selectCls}
          >
            <option value="">All collection methods</option>
            {lookups.collectionMethods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => onFilters({ ...filters, status: e.target.value })}
            className={selectCls}
          >
            <option value="">Any status</option>
            {lookups.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {dropdownFilterCount > 0 && (
            <button
              onClick={() => onFilters({ ...filters, frequency: '', demandType: '', collectionMethod: '', status: '' })}
              className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline"
            >
              Clear filters
            </button>
          )}
          <span className="text-[10px] text-slate-400">Esc to close</span>
        </div>
      )}

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-0 border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
              <th className="px-2 py-1.5 font-semibold">Rule #</th>
              <th className="px-2 py-1.5 font-semibold">Target / Demand</th>
              <th className="px-2 py-1.5 font-semibold">Frequency</th>
              <th className="px-2 py-1.5 text-right font-semibold">Amount</th>
              <th className="px-2 py-1.5 text-right font-semibold">GST %</th>
              {!compact && <th className="px-2 py-1.5 font-semibold">Last Run</th>}
              <th className="px-2 py-1.5 font-semibold">Next Run</th>
              {!compact && <th className="px-2 py-1.5 font-semibold">Due Date Rule</th>}
              {!compact && <th className="px-2 py-1.5 font-semibold">Collection</th>}
              <th className="px-2 py-1.5 font-semibold">Exceptions</th>
              <th className="px-2 py-1.5 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={compact ? 7 : 11} className="px-3 py-8 text-center text-slate-400">
                  No rules match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((r, i) => {
              const freq = frequencyByCode(r.generationFrequencyCode);
              const isActive = r.generationRuleNo === activeRuleNo;
              const rowCls = isActive
                ? 'border-b border-amber-200 border-l-[3px] border-l-amber-500 bg-amber-100/90'
                : i % 2
                  ? 'border-b border-slate-100 border-l-[3px] border-l-transparent bg-white hover:bg-teal-50/70'
                  : 'border-b border-slate-100 border-l-[3px] border-l-transparent bg-slate-100/90 hover:bg-teal-50/70';
              return (
                <tr key={r.generationRuleNo} className={`${rowCls} transition-colors`}>
                  <td className="whitespace-nowrap px-2 py-1 align-top">
                    <button onClick={() => onView(r)} className={`font-semibold hover:underline ${isActive ? 'text-amber-900' : 'text-teal-800 hover:text-teal-600'}`}>
                      {r.generationRuleNo}
                    </button>
                    <div className="mt-0.5">
                      <Badge tone={r.status === 'Active' ? 'green' : 'slate'}>{r.status}</Badge>
                    </div>
                  </td>
                  <td className="px-2 py-1 align-top">
                    <div className="font-medium text-slate-800">{r.demandType}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.targetObject} · {r.targetObjectId || '—'}
                    </div>
                  </td>
                  <td className="px-2 py-1 align-top">
                    <div className="font-mono text-[11px] font-semibold text-slate-700">{r.generationFrequencyCode}</div>
                    <div className="text-[11px] text-slate-500">{freq?.label ?? 'Unknown'}</div>
                  </td>
                  <td className="px-2 py-1 text-right align-top tabular-nums">{fmtAmount(r.demandAmount)}</td>
                  <td className="px-2 py-1 text-right align-top tabular-nums">{r.gstPercent ?? '—'}</td>
                  {!compact && <td className="whitespace-nowrap px-2 py-1 align-top tabular-nums">{fmtDate(r.lastRunDate)}</td>}
                  <td className={`whitespace-nowrap px-2 py-1 align-top tabular-nums ${isAdHoc(r.generationFrequencyCode) ? 'font-semibold text-amber-700' : ''}`}>
                    {fmtDate(r.nextRunDate)}
                  </td>
                  {!compact && <td className="px-2 py-1 align-top">
                    <Badge tone="teal">{r.dueDateRefSource}</Badge>
                    <span className="ml-1 text-[11px] text-slate-500">+{r.gracePeriodDays}d</span>
                  </td>}
                  {!compact && <td className="px-2 py-1 align-top">
                    <div className="flex flex-wrap gap-0.5">
                      {r.allowedCollectionModes.map((m) => (
                        <Badge key={m} tone="slate">{m}</Badge>
                      ))}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{r.collectionMethods.join(', ') || '—'}</div>
                  </td>}
                  <td className="px-2 py-1 align-top">
                    {r.exceptions.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-0.5">
                        {r.exceptions.map((ex, idx) => (
                          <Badge key={idx} tone={ex.exceptionType === 'Penalty' ? 'red' : ex.exceptionType === 'Discount' ? 'amber' : 'teal'}>
                            {ex.exceptionType}#{ex.seq}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="relative px-2 py-1 align-top">
                    <div className="flex items-center justify-center">
                      <button
                        title="Actions"
                        onClick={(e) => toggleMenu(r.generationRuleNo, e.currentTarget.closest('td'))}
                        className={`rounded p-1 transition-colors ${
                          openMenuFor === r.generationRuleNo
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                        }`}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    {openMenuFor === r.generationRuleNo && (
                      <div
                        className={`absolute right-1 z-30 w-36 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-slate-900/5 ${
                          menuAbove ? 'bottom-full mb-1' : 'top-full mt-1'
                        }`}
                      >
                        {menuItems(r).map((item) => (
                          <button
                            key={item.key}
                            onClick={() => {
                              setOpenMenuFor(null);
                              item.action();
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                              item.danger
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-slate-700 hover:bg-teal-50 hover:text-teal-900'
                            }`}
                          >
                            <item.icon size={13} />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
