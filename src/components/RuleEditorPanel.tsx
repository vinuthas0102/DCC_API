import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import type {
  CollectionException,
  DccRule,
  DueDateRefSource,
  ExceptionType,
  PercentBasis,
  RuleStatus,
  TargetObject,
  DemandType,
} from '@/types/dcc';
import {
  EXCEPTION_OFFSET_HINT,
  emptyException,
  frequencyByCode,
  isAdHoc,
} from '@/types/dcc';
import { useLookups } from '@/services/lookupsContext';
import { Badge, CheckGroup, Field, NumberInput, SectionHeader, Select, TextArea, TextInput } from '@/components/ui';

export type EditorMode = 'create' | 'edit' | 'view';

const num = (v: string): number | null => (v === '' ? null : Number(v));

function ExceptionRow({ ex, onChange, onRemove, editable, exceptionTypes, percentBases }: {
  ex: CollectionException;
  onChange: (next: CollectionException) => void;
  onRemove: () => void;
  editable: boolean;
  exceptionTypes: ExceptionType[];
  percentBases: PercentBasis[];
}) {
  const set = <K extends keyof CollectionException>(key: K, value: CollectionException[K]) =>
    onChange({ ...ex, [key]: value });

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="px-1 py-1">
        {editable ? (
          <Select value={ex.exceptionType} onChange={(e) => onChange({ ...ex, exceptionType: e.target.value as ExceptionType })} className="!w-24">
            {exceptionTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        ) : (
          <span className="text-[11px]">{ex.exceptionType}</span>
        )}
      </td>
      <td className="px-1 py-1">
        <NumberInput
          value={ex.seq}
          min={1}
          disabled={!editable}
          onChange={(e) => set('seq', num(e.target.value) ?? 1)}
          className="!w-12"
        />
      </td>
      <td className="px-1 py-1">
        <div className="flex items-center gap-1">
          <NumberInput value={ex.demandSlabMin ?? ''} placeholder="Min" disabled={!editable} onChange={(e) => set('demandSlabMin', num(e.target.value))} className="!w-16" />
          <span className="text-slate-400">–</span>
          <NumberInput value={ex.demandSlabMax ?? ''} placeholder="Max" disabled={!editable} onChange={(e) => set('demandSlabMax', num(e.target.value))} className="!w-16" />
        </div>
      </td>
      <td className="px-1 py-1">
        <NumberInput
          value={ex.offsetDays ?? ''}
          disabled={!editable}
          onChange={(e) => set('offsetDays', num(e.target.value))}
          className="!w-14"
          title={EXCEPTION_OFFSET_HINT[ex.exceptionType]}
        />
      </td>
      <td className="px-1 py-1">
        <div className="flex items-center gap-1">
          <NumberInput value={ex.applicablePercent ?? ''} placeholder="%" disabled={!editable} onChange={(e) => set('applicablePercent', num(e.target.value))} className="!w-14" />
          <Select value={ex.applicablePercentBasis ?? ''} disabled={!editable} onChange={(e) => set('applicablePercentBasis', (e.target.value || null) as PercentBasis | null)} className="!w-20">
            <option value="">basis</option>
            {percentBases.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
        </div>
      </td>
      <td className="px-1 py-1">
        <div className="flex items-center gap-1">
          <NumberInput value={ex.applicableMin ?? ''} placeholder="Min" disabled={!editable} onChange={(e) => set('applicableMin', num(e.target.value))} className="!w-16" />
          <span className="text-slate-400">–</span>
          <NumberInput value={ex.applicableMax ?? ''} placeholder="Max" disabled={!editable} onChange={(e) => set('applicableMax', num(e.target.value))} className="!w-16" />
        </div>
      </td>
      <td className="px-1 py-1">
        <NumberInput value={ex.actualAmount ?? ''} placeholder="Override" disabled={!editable} onChange={(e) => set('actualAmount', num(e.target.value))} className="!w-20" />
      </td>
      <td className="px-1 py-1">
        <TextInput value={ex.messageHook} disabled={!editable} onChange={(e) => set('messageHook', e.target.value)} className="!w-24" />
      </td>
      <td className="px-1 py-1">
        <TextArea
          value={ex.legalNotices}
          disabled={!editable}
          onChange={(e) => set('legalNotices', e.target.value)}
          placeholder="Template with {{tenantName}}, {{department}}, {{demandNo}}, {{amount}}, {{dueDate}}…"
          className="!w-64 !text-[11px]"
        />
      </td>
      <td className="px-1 py-1 text-center">
        {editable && (
          <button onClick={onRemove} title="Remove row" className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-700">
            <Trash2 size={13} />
          </button>
        )}
        {!editable && <span className="text-slate-300">·</span>}
      </td>
    </tr>
  );
}

export function RuleEditorPanel({ open, mode, rule, onClose, onSave, saving, error }: {
  open: boolean;
  mode: EditorMode;
  rule: DccRule | null;
  onClose: () => void;
  onSave: (rule: DccRule) => void;
  saving: boolean;
  error: string | null;
}) {
  const [draft, setDraft] = useState<DccRule | null>(rule);
  const { lookups } = useLookups();

  useEffect(() => setDraft(rule), [rule]);

  if (!open || !draft) return null;

  const editable = mode !== 'view';
  const set = <K extends keyof DccRule>(key: K, value: DccRule[K]) => setDraft({ ...draft, [key]: value });
  const freq = frequencyByCode(draft.generationFrequencyCode);
  const isInstalment = draft.generationFrequencyCode === '95';
  const adHoc = isAdHoc(draft.generationFrequencyCode);
  const fixedDate = draft.generationFrequencyCode === '89';
  const periodic = !adHoc && !isInstalment;

  const addException = (type: ExceptionType) => {
    const seq = draft.exceptions.filter((e) => e.exceptionType === type).reduce((m, e) => Math.max(m, e.seq), 0) + 1;
    set('exceptions', [...draft.exceptions, emptyException(type, seq)]);
  };

  const title = mode === 'create' ? 'New DCC Rule' : mode === 'edit' ? `Edit Rule ${draft.generationRuleNo}` : `Rule ${draft.generationRuleNo}`;

  return (
    <div className="flex h-full w-full flex-col border-l border-slate-300 bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">{title}</h2>
            {mode === 'view' && <Badge tone="slate">Read-only</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {editable && (
              <button
                onClick={() => onSave(draft)}
                disabled={saving}
                className="inline-flex h-7 items-center gap-1.5 rounded bg-teal-800 px-3 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
              >
                <Save size={13} /> {saving ? 'Saving…' : 'Save Rule'}
              </button>
            )}
            <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <X size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-medium text-rose-700">{error}</div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {/* A1. Generation & identification */}
          <section className="rounded border border-slate-300 bg-white">
            <SectionHeader title="A. Demand Generation & Schedule" />
            <div className="grid grid-cols-4 gap-2 p-3">
              <Field label="Generation Rule #">
                <TextInput value={draft.generationRuleNo} disabled={!editable || mode === 'edit'} onChange={(e) => set('generationRuleNo', e.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={draft.status} disabled={!editable} onChange={(e) => set('status', e.target.value as RuleStatus)}>
                  {lookups.statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Target Object">
                <Select value={draft.targetObject} disabled={!editable} onChange={(e) => set('targetObject', e.target.value as TargetObject)}>
                  {lookups.targetObjects.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Target Object ID" hint={isInstalment ? 'Keyed at target object id (e.g. Loan #)' : undefined}>
                <TextInput value={draft.targetObjectId} disabled={!editable} onChange={(e) => set('targetObjectId', e.target.value)} placeholder="e.g. PROP-10021" />
              </Field>
              <Field label="Demand Type">
                <Select value={draft.demandType} disabled={!editable} onChange={(e) => set('demandType', e.target.value as DemandType)}>
                  {lookups.demandTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Generation Frequency" className="col-span-2">
                <Select value={draft.generationFrequencyCode} disabled={!editable} onChange={(e) => set('generationFrequencyCode', e.target.value)}>
                  <optgroup label="Ad hoc / Instalment">
                    {lookups.frequencies.filter((f) => f.group === 'adhoc_instalment').map((f) => (
                      <option key={f.code} value={f.code}>{f.code} — {f.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Periodic (< 90)">
                    {lookups.frequencies.filter((f) => f.group === 'periodic').map((f) => (
                      <option key={f.code} value={f.code}>{f.code} — {f.label}</option>
                    ))}
                  </optgroup>
                </Select>
              </Field>
              <Field label="TPA URL Id" className="col-span-1">
                <TextInput value={draft.tpaUrlId} disabled={!editable} onChange={(e) => set('tpaUrlId', e.target.value)} placeholder="TPA-…-POST" />
              </Field>
              {freq && (
                <div className="col-span-4 -mb-1 text-[11px] text-slate-500">
                  {freq.detail && <span className="mr-3">{freq.detail}</span>}
                  Next run: <span className="font-semibold text-slate-700">{freq.nextRunHint}</span>
                  {adHoc && ' — managed by TPA / Excel routine, not the scheduler'}
                </div>
              )}
            </div>
          </section>

          {/* A2. Amounts & due-date rules */}
          <section className="rounded border border-slate-300 bg-white">
            <SectionHeader title="Amount, GST & Demand Due Date Rules" />
            <div className="grid grid-cols-4 items-start gap-2 p-3">
              <Field label="Default Demand Amount" hint={isInstalment ? 'Not applicable for code 95' : 'Used when missing from TPA JSON'}>
                <NumberInput value={draft.demandAmount ?? ''} disabled={!editable || isInstalment} onChange={(e) => set('demandAmount', num(e.target.value))} />
              </Field>
              <Field label="Default GST %" hint="Applied if missing from TPA JSON">
                <NumberInput value={draft.gstPercent ?? ''} disabled={!editable} onChange={(e) => set('gstPercent', num(e.target.value))} />
              </Field>
              <Field label="Ref Date Flag" hint={lookups.dueDateRefSources.find((d) => d.value === draft.dueDateRefSource)?.hint}>
                <Select value={draft.dueDateRefSource} disabled={!editable} onChange={(e) => set('dueDateRefSource', e.target.value as DueDateRefSource)}>
                  {lookups.dueDateRefSources.map((d) => (
                    <option key={d.value} value={d.value}>{d.value} — {d.hint}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Grace Period (days)" hint="Due = Ref date + grace">
                <NumberInput value={draft.gracePeriodDays} min={0} disabled={!editable} onChange={(e) => set('gracePeriodDays', num(e.target.value) ?? 0)} />
              </Field>
            </div>
          </section>

          {/* A3. Escalation */}
          <section className="rounded border border-slate-300 bg-white">
            <SectionHeader title="Demand Increase % (Periodic Escalation)" />
            <div className="grid grid-cols-5 items-start gap-2 p-3">
              <Field label="Increase Application (months)" hint="Months after base/acquisition date; e.g. 11 = every 11 months">
                <NumberInput value={draft.increaseApplicationMonths ?? ''} disabled={!editable} onChange={(e) => set('increaseApplicationMonths', num(e.target.value))} />
              </Field>
              <Field label="Increase %">
                <NumberInput value={draft.increasePercent ?? ''} disabled={!editable} onChange={(e) => set('increasePercent', num(e.target.value))} />
              </Field>
              <Field label="Min %">
                <NumberInput value={draft.increaseMin ?? ''} disabled={!editable} onChange={(e) => set('increaseMin', num(e.target.value))} />
              </Field>
              <Field label="Max %">
                <NumberInput value={draft.increaseMax ?? ''} disabled={!editable} onChange={(e) => set('increaseMax', num(e.target.value))} />
              </Field>
              <Field label="Increase Alert Criteria" hint="Initial alert & reminder policy">
                <TextInput value={draft.increaseAlertCriteria} disabled={!editable} onChange={(e) => set('increaseAlertCriteria', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* A4. Run tracking */}
          <section className="rounded border border-slate-300 bg-white">
            <SectionHeader title="Run Tracking & Integration" />
            <div className="grid grid-cols-4 items-start gap-2 p-3">
              <Field label="Last Run Date">
                <TextInput type="date" value={draft.lastRunDate ?? ''} disabled={!editable || adHoc} onChange={(e) => set('lastRunDate', e.target.value || null)} />
              </Field>
              <Field label="Next Run Date" hint={adHoc ? '999999 / 999998 for ad hoc' : fixedDate ? 'Holds the fixed date for code 89' : undefined}>
                {adHoc ? (
                  <TextInput value={draft.nextRunDate ?? ''} disabled onChange={(e) => set('nextRunDate', e.target.value || null)} className="font-mono" />
                ) : (
                  <TextInput type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(draft.nextRunDate ?? '') ? draft.nextRunDate! : ''} disabled={!editable} onChange={(e) => set('nextRunDate', e.target.value || null)} />
                )}
              </Field>
              <Field label="Next Instalment Seq #" hint={isInstalment ? 'Linked to instalment grid' : 'Only relevant for code 95'}>
                <NumberInput value={draft.nextInstalmentSeq ?? ''} disabled={!editable || !isInstalment} onChange={(e) => set('nextInstalmentSeq', num(e.target.value))} />
              </Field>
              <div className="col-span-1 self-end text-[11px] text-slate-500">
                {periodic && freq && `Schedule: ${freq.nextRunHint}`}
                {adHoc && 'Ad hoc — scheduler bypassed'}
                {isInstalment && 'Driven by instalment grid sequence'}
              </div>
            </div>
          </section>

          {/* B. Collection controls */}
          <section className="rounded border border-slate-300 bg-white">
            <SectionHeader title="B. Collection Controls" />
            <div className="grid grid-cols-2 gap-3 p-3">
              <Field label="Allowed Collection Modes">
                <CheckGroup options={lookups.collectionModes} values={draft.allowedCollectionModes} onChange={(v) => set('allowedCollectionModes', v)} columns={2} />
              </Field>
              <Field label="Collection Methods">
                <CheckGroup options={lookups.collectionMethods} values={draft.collectionMethods} onChange={(v) => set('collectionMethods', v)} columns={2} />
              </Field>
            </div>
          </section>

          {/* C. Collection exception grid */}
          <section className="rounded border border-slate-300 bg-white">
            <SectionHeader title="C. Collection Exception Grid">
              {editable && (
                <div className="flex gap-1">
                  {lookups.exceptionTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => addException(t)}
                      className="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-teal-600 hover:text-teal-800"
                    >
                      <Plus size={10} /> {t}
                    </button>
                  ))}
                </div>
              )}
            </SectionHeader>
            {draft.exceptions.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-slate-400">No exception rows. Use the buttons above to add Installment, Discount, Penalty or Alert rules.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-left text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="px-1 py-1 font-semibold">Exception</th>
                      <th className="px-1 py-1 font-semibold">Seq</th>
                      <th className="px-1 py-1 font-semibold">Demand Slab</th>
                      <th className="px-1 py-1 font-semibold" title="Discount: Ref date + offset · Penalty: Due date + offset · Alert: (today + offset) >= due">Offset Days</th>
                      <th className="px-1 py-1 font-semibold">Applicable % / Basis</th>
                      <th className="px-1 py-1 font-semibold">Min / Max</th>
                      <th className="px-1 py-1 font-semibold">Actual Amount</th>
                      <th className="px-1 py-1 font-semibold">Message Hook</th>
                      <th className="px-1 py-1 font-semibold">Legal Notices Template</th>
                      <th className="px-1 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.exceptions.map((ex, i) => (
                      <ExceptionRow
                        key={i}
                        ex={ex}
                        editable={editable}
                        exceptionTypes={lookups.exceptionTypes}
                        percentBases={lookups.percentBases}
                        onChange={(next) => {
                          const list = [...draft.exceptions];
                          list[i] = next;
                          set('exceptions', list);
                        }}
                        onRemove={() => set('exceptions', draft.exceptions.filter((_, j) => j !== i))}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
    </div>
  );
}
