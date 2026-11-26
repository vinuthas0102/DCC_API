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
 * middleware). Falls back to a localStorage-backed in-browser store when the
 * API is unreachable (e.g. static preview), keeping runtime state synchronized
 * under the key below so Create / Update / Delete work during demos.
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

// ---- localStorage fallback store ----

function lsRead(): DccRule[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw).rules as DccRule[]) : null;
  } catch {
    return null;
  }
}

function lsWrite(rules: DccRule[]) {
  localStorage.setItem(LS_KEY, JSON.stringify({ updatedAt: new Date().toISOString(), rules }));
}

async function lsSeed(): Promise<DccRule[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/dcc-rules.json`);
  const json = await res.json();
  return (json.rules ?? []) as DccRule[];
}

async function localRequest(method: string, ruleNo: string | null, body?: unknown): Promise<Response> {
  let rules = lsRead();
  if (!rules) {
    rules = await lsSeed();
    lsWrite(rules);
  }
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  if (method === 'GET' && !ruleNo) return json({ data: rules, count: rules.length, total: rules.length });
  if (method === 'GET' && ruleNo) {
    const rule = rules.find((r) => r.generationRuleNo === ruleNo);
    return rule ? json({ data: rule }) : json({ error: `Rule ${ruleNo} not found` }, 404);
  }
  if (method === 'POST' && !ruleNo) {
    const payload = body as DccRule;
    if (rules.some((r) => r.generationRuleNo === payload.generationRuleNo))
      return json({ error: `Rule ${payload.generationRuleNo} already exists` }, 409);
    rules = [...rules, payload];
    lsWrite(rules);
    return json({ data: payload }, 201);
  }
  if (method === 'PUT' && ruleNo) {
    const idx = rules.findIndex((r) => r.generationRuleNo === ruleNo);
    if (idx === -1) return json({ error: `Rule ${ruleNo} not found` }, 404);
    rules[idx] = { ...rules[idx], ...(body as object), generationRuleNo: ruleNo };
    lsWrite(rules);
    return json({ data: rules[idx] });
  }
  if (method === 'DELETE' && ruleNo) {
    const removed = rules.find((r) => r.generationRuleNo === ruleNo);
    if (!removed) return json({ error: `Rule ${ruleNo} not found` }, 404);
    lsWrite(rules.filter((r) => r.generationRuleNo !== ruleNo));
    return json({ data: removed });
  }
  return json({ error: 'Unsupported operation' }, 405);
}

// ---- REST calls ----

async function request(method: string, ruleNo: string | null, body?: unknown): Promise<Response> {
  const url = `${API_BASE}/dcc/rules${ruleNo ? `/${encodeURIComponent(ruleNo)}` : ''}`;
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    record(method, url, res.status, body);
    // Trust the API's answer, including business errors like 409/404 — do not
    // shadow it with the local store. Fall back only when no server responds.
    return res;
  } catch {
    const local = await localRequest(method, ruleNo, body);
    record(`${method} (local)`, `local:${url}`, local.status, body);
    return local;
  }
}

export interface RuleQuery {
  search?: string;
}

export async function listRules(query?: RuleQuery): Promise<DccRule[]> {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  const qs = params.toString();
  const res = await request('GET', null);
  if (!res.ok) throw new Error(`GET rules failed (${res.status})`);
  const json = await res.json();
  let rules: DccRule[] = json.data ?? [];
  // Local filtering for search when the active endpoint does not filter.
  if (query?.search) {
    const s = query.search.toLowerCase();
    rules = rules.filter((r) =>
      [r.generationRuleNo, r.targetObject, r.targetObjectId, r.demandType, r.tpaUrlId]
        .some((v) => String(v ?? '').toLowerCase().includes(s)),
    );
  }
  void qs;
  return rules;
}

export async function getRule(ruleNo: string): Promise<DccRule> {
  const res = await request('GET', ruleNo);
  if (!res.ok) throw new Error(`GET rule failed (${res.status})`);
  const json = await res.json();
  return json.data as DccRule;
}

export async function createRule(rule: DccRule): Promise<DccRule> {
  const res = await request('POST', null, rule);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Create failed (${res.status})`);
  return json.data as DccRule;
}

export async function updateRule(ruleNo: string, rule: Partial<DccRule>): Promise<DccRule> {
  const res = await request('PUT', ruleNo, rule);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Update failed (${res.status})`);
  return json.data as DccRule;
}

export async function deleteRule(ruleNo: string): Promise<void> {
  const res = await request('DELETE', ruleNo);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `Delete failed (${res.status})`);
  }
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
    const body = await res.json().catch(() => null);
    record('POST (tester)', url, res.status, payload);
    return { ok: res.ok, status: res.status, body };
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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
  return res.json();
}

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
 * Loads dropdown option lists. Tries GET {API_BASE}/dcc/lookups first; when
 * unreachable, falls back to the bundled public/data/dcc-lookups.json; any key
 * missing from either source falls back to the built-in constants.
 */
export async function getLookups(): Promise<{ lookups: DccLookups; source: 'api' | 'file' | 'default' }> {
  try {
    const raw = await fetchJson(`${API_BASE}/dcc/lookups`);
    return { lookups: mergeLookups(raw), source: 'api' };
  } catch (apiErr) {
    record('GET (lookups)', `${API_BASE}/dcc/lookups`, 0);
    try {
      const raw = await fetchJson(`${import.meta.env.BASE_URL}data/dcc-lookups.json`);
      return { lookups: mergeLookups(raw), source: 'file' };
    } catch {
      console.error('Lookup loading fell back to built-in defaults:', apiErr);
      return { lookups: DEFAULT_LOOKUPS, source: 'default' };
    }
  }
}
