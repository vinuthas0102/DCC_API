import type { DccRule } from '@/types/dcc';
import {
  COLLECTION_METHODS,
  COLLECTION_MODES,
  DEMAND_TYPES,
  DUE_DATE_REF_SOURCES,
  EXCEPTION_TYPES,
  FREQUENCIES,
  PERCENT_BASES,
  TARGET_OBJECTS,
  type DemandType,
  type CollectionMethod,
  type CollectionMode,
  type DueDateRefSource,
  type ExceptionType,
  type PercentBasis,
  type RuleStatus,
  type TargetObject,
} from '@/types/dcc';

/**
 * JSON API service layer for DCC rules.
 *
 * Talks REST-style JSON to `${VITE_API_BASE_URL}/dcc/rules` (the Vite dev-server
 * middleware or an external ngrok backend). On a published static build the
 * `/api` path has no server behind it: responses are 404 or the SPA's own
 * HTML. Those cases are detected safely (never parsed as JSON) and fall back
 * to a localStorage-backed store seeded from the bundled JSON files.
 */

const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';
const LS_KEY = 'dcc.rules.state.v1';

export interface ApiStatus {
  mode: 'api' | 'local';
  baseUrl: string;
  lastPayload: { method: string; url: string; status: number; at: string; body?: unknown } | null;
}

let lastPayload: ApiStatus['lastPayload'] = null;
const listeners = new Set<(s: ApiStatus) => void>();

function notify() {
  const snapshot = getStatus();
  listeners.forEach((l) => l(snapshot));
}

export function getStatus(): ApiStatus {
  return { mode: localStorage.getItem(LS_KEY) ? 'local' : 'api', baseUrl: API_BASE, lastPayload };
}

export function subscribeStatus(listener: (s: ApiStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function record(method: string, url: string, status: number, body?: unknown) {
  lastPayload = { method, url, status, at: new Date().toISOString(), body };
  notify();
}

// ---- Safe response parsing ----

type ParsedJson = { ok: true; data: unknown } | { ok: false };

/**
 * Reads a response as text first and detects HTML / non-JSON payloads (what a
 * static host returns for /api routes) instead of letting JSON.parse throw
 * "Unexpected token '<'". Anything not confidently JSON reports `ok: false`.
 */
async function parseJsonOrDetectHtml(res: Response): Promise<ParsedJson> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return { ok: false };
  const head = trimmed.slice(0, 64).toLowerCase();
  if (head.startsWith('<')) return { ok: false };
  const ctype = (res.headers.get('content-type') ?? '').toLowerCase();
  if (ctype.includes('text/html')) return { ok: false };
  try {
    return { ok: true, data: JSON.parse(trimmed) };
  } catch {
    return { ok: false };
  }
}

function errorOf(data: unknown): string | null {
  if (data && typeof data === 'object' && 'error' in data) {
    const msg = (data as { error: unknown }).error;
    if (typeof msg === 'string') return msg;
  }
  return null;
}

/** Fetches a bundled JSON file under the app's base path, safely parsed. */
async function fetchStaticJson(path: string): Promise<unknown> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
  const parsed = await parseJsonOrDetectHtml(res);
  if (!res.ok || !parsed.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return parsed.data;
}

// ---- localStorage fallback store ----

function lsRead(): DccRule[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? (JSON.parse(raw) as { rules?: DccRule[] }) : null;
    return parsed && Array.isArray(parsed.rules) ? parsed.rules : null;
  } catch {
    return null;
  }
}

function lsWrite(rules: DccRule[]) {
  localStorage.setItem(LS_KEY, JSON.stringify({ updatedAt: new Date().toISOString(), rules }));
}

/** localStorage rules if present; otherwise seeds it from the bundled JSON file. */
async function lsLoad(): Promise<DccRule[]> {
  const existing = lsRead();
  if (existing) return existing;
  let seeded: DccRule[] = [];
  try {
    const json = (await fetchStaticJson('data/dcc-rules.json')) as { rules?: DccRule[] };
    seeded = json.rules ?? [];
  } catch {
    seeded = [];
  }
  lsWrite(seeded);
  return seeded;
}

// ---- REST calls ----

/**
 * Performs one API call. Returns `{ status, data }` when the endpoint answered
 * with parseable JSON, or `null` when there is no backend behind the path
 * (network failure, 404 HTML page, non-JSON body).
 */
async function apiFetch(method: string, path: string, body?: unknown): Promise<{ status: number; data: unknown } | null> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const parsed = await parseJsonOrDetectHtml(res);
    record(method, url, parsed.ok ? res.status : 0, body);
    return parsed.ok ? { status: res.status, data: parsed.data } : null;
  } catch {
    record(method, url, 0, body);
    return null;
  }
}

function filterBySearch(rules: DccRule[], search?: string): DccRule[] {
  if (!search) return rules;
  const s = search.toLowerCase();
  return rules.filter((r) =>
    [r.generationRuleNo, r.targetObject, r.targetObjectId, r.demandType, r.tpaUrlId]
      .some((v) => String(v ?? '').toLowerCase().includes(s)),
  );
}

export interface RuleQuery {
  search?: string;
}

export async function listRules(query?: RuleQuery): Promise<DccRule[]> {
  const qs = query?.search ? `?search=${encodeURIComponent(query.search)}` : '';
  const res = await apiFetch('GET', `/dcc/rules${qs}`);
  if (!res || res.status === 404) {
    record('GET (local)', 'local:/dcc/rules', 200);
    return filterBySearch(await lsLoad(), query?.search);
  }
  if (res.status >= 400) throw new Error(errorOf(res.data) ?? `GET rules failed (${res.status})`);
  const data = (res.data as { data?: DccRule[] }).data ?? [];
  return filterBySearch(data, query?.search);
}

export async function getRule(ruleNo: string): Promise<DccRule> {
  const res = await apiFetch('GET', `/dcc/rules/${encodeURIComponent(ruleNo)}`);
  if (!res) {
    record('GET (local)', `local:/dcc/rules/${ruleNo}`, 200);
    const rule = (await lsLoad()).find((r) => r.generationRuleNo === ruleNo);
    if (!rule) throw new Error(`Rule ${ruleNo} not found`);
    return rule;
  }
  if (res.status >= 400) throw new Error(errorOf(res.data) ?? `GET rule failed (${res.status})`);
  return (res.data as { data: DccRule }).data;
}

export async function createRule(rule: DccRule): Promise<DccRule> {
  const res = await apiFetch('POST', '/dcc/rules', rule);
  if (!res) {
    const rules = await lsLoad();
    if (rules.some((r) => r.generationRuleNo === rule.generationRuleNo))
      throw new Error(`Rule ${rule.generationRuleNo} already exists`);
    lsWrite([...rules, rule]);
    record('POST (local)', 'local:/dcc/rules', 201, rule);
    return rule;
  }
  if (res.status >= 400) throw new Error(errorOf(res.data) ?? `Create failed (${res.status})`);
  return (res.data as { data: DccRule }).data;
}

export async function updateRule(ruleNo: string, rule: Partial<DccRule>): Promise<DccRule> {
  const res = await apiFetch('PUT', `/dcc/rules/${encodeURIComponent(ruleNo)}`, rule);
  if (!res) {
    const rules = await lsLoad();
    const idx = rules.findIndex((r) => r.generationRuleNo === ruleNo);
    if (idx === -1) throw new Error(`Rule ${ruleNo} not found`);
    const updated = { ...rules[idx], ...rule, generationRuleNo: ruleNo };
    rules[idx] = updated;
    lsWrite(rules);
    record('PUT (local)', `local:/dcc/rules/${ruleNo}`, 200, rule);
    return updated;
  }
  if (res.status >= 400) throw new Error(errorOf(res.data) ?? `Update failed (${res.status})`);
  return (res.data as { data: DccRule }).data;
}

export async function deleteRule(ruleNo: string): Promise<void> {
  const res = await apiFetch('DELETE', `/dcc/rules/${encodeURIComponent(ruleNo)}`);
  if (!res) {
    const rules = await lsLoad();
    if (!rules.some((r) => r.generationRuleNo === ruleNo)) throw new Error(`Rule ${ruleNo} not found`);
    lsWrite(rules.filter((r) => r.generationRuleNo !== ruleNo));
    record('DELETE (local)', `local:/dcc/rules/${ruleNo}`, 200);
    return;
  }
  if (res.status >= 400) throw new Error(errorOf(res.data) ?? `Delete failed (${res.status})`);
}

export function nextRuleSuggestion(rules: DccRule[]): string {
  const max = rules.reduce((m, r) => Math.max(m, Number(r.generationRuleNo.replace(/\D/g, '')) || 0), 0);
  return `DCC-R-${String(max + 1).padStart(4, '0')}`;
}

/** Sends an arbitrary JSON payload to the active API base URL (used by the tester panel). */
export async function sendExternalPayload(payload: unknown, targetPath = '/dcc/rules'): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `${API_BASE}${targetPath}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const parsed = await parseJsonOrDetectHtml(res);
    record('POST (tester)', url, parsed.ok ? res.status : 0, payload);
    return { ok: res.ok && parsed.ok, status: parsed.ok ? res.status : 0, body: parsed.ok ? parsed.data : { error: 'Non-JSON response (no API at this path)' } };
  } catch (e) {
    record('POST (tester)', url, 0, payload);
    return { ok: false, status: 0, body: { error: String(e) } };
  }
}

// ---- Lookup options ----

export interface DccLookups {
  statuses: RuleStatus[];
  targetObjects: TargetObject[];
  demandTypes: DemandType[];
  frequencies: { code: string; label: string; group: 'periodic' | 'adhoc_instalment'; detail?: string; nextRunHint: string }[];
  dueDateRefSources: { value: DueDateRefSource; hint: string }[];
  collectionModes: CollectionMode[];
  collectionMethods: CollectionMethod[];
  exceptionTypes: ExceptionType[];
  percentBases: PercentBasis[];
}

export const DEFAULT_LOOKUPS: DccLookups = {
  statuses: ['Active', 'Inactive'],
  targetObjects: [...TARGET_OBJECTS],
  demandTypes: [...DEMAND_TYPES],
  frequencies: FREQUENCIES.map((f) => ({
    code: f.code,
    label: f.label,
    group: ['99', '98', '95'].includes(f.code) ? 'adhoc_instalment' : 'periodic',
    detail: f.detail,
    nextRunHint: f.nextRunHint,
  })),
  dueDateRefSources: DUE_DATE_REF_SOURCES.map((d) => ({ value: d.value, hint: d.hint })),
  collectionModes: [...COLLECTION_MODES],
  collectionMethods: [...COLLECTION_METHODS],
  exceptionTypes: [...EXCEPTION_TYPES],
  percentBases: [...PERCENT_BASES],
};

function mergeLookups(raw: unknown): DccLookups {
  const j = (raw ?? {}) as Record<string, unknown>;
  const arr = (key: keyof DccLookups): unknown[] => (Array.isArray(j[key]) ? (j[key] as unknown[]) : []);
  const freqs = arr('frequencies').filter(
    (f): f is DccLookups['frequencies'][number] =>
      !!f && typeof f === 'object' && typeof (f as { code?: unknown }).code === 'string',
  );
  const dueRefs = arr('dueDateRefSources').filter(
    (d): d is DccLookups['dueDateRefSources'][number] =>
      !!d && typeof d === 'object' && typeof (d as { value?: unknown }).value === 'string',
  );
  const str = (key: keyof DccLookups): string[] => arr(key).filter((v): v is string => typeof v === 'string');
  return {
    statuses: (str('statuses') as RuleStatus[]) || DEFAULT_LOOKUPS.statuses,
    targetObjects: (str('targetObjects') as TargetObject[]) || DEFAULT_LOOKUPS.targetObjects,
    demandTypes: (str('demandTypes') as DemandType[]) || DEFAULT_LOOKUPS.demandTypes,
    frequencies: freqs.length ? freqs : DEFAULT_LOOKUPS.frequencies,
    dueDateRefSources: dueRefs.length ? dueRefs : DEFAULT_LOOKUPS.dueDateRefSources,
    collectionModes: (str('collectionModes') as CollectionMode[]) || DEFAULT_LOOKUPS.collectionModes,
    collectionMethods: (str('collectionMethods') as CollectionMethod[]) || DEFAULT_LOOKUPS.collectionMethods,
    exceptionTypes: (str('exceptionTypes') as ExceptionType[]) || DEFAULT_LOOKUPS.exceptionTypes,
    percentBases: (str('percentBases') as PercentBasis[]) || DEFAULT_LOOKUPS.percentBases,
  };
}

/**
 * Loads dropdown option lists. Tries GET {API_BASE}/dcc/lookups first; a 404,
 * HTML or non-JSON answer (static build) or network failure falls back to the
 * bundled public/data/dcc-lookups.json; any key still missing falls back to
 * the built-in constants.
 */
export async function getLookups(): Promise<{ lookups: DccLookups; source: 'api' | 'file' | 'default' }> {
  const res = await apiFetch('GET', '/dcc/lookups');
  if (res && res.status === 200) return { lookups: mergeLookups(res.data), source: 'api' };
  try {
    const raw = await fetchStaticJson('data/dcc-lookups.json');
    return { lookups: mergeLookups(raw), source: 'file' };
  } catch (err) {
    console.error('Lookup loading fell back to built-in defaults:', err);
    return { lookups: DEFAULT_LOOKUPS, source: 'default' };
  }
}
