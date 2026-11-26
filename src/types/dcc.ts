export type DemandType =
  | 'Rent'
  | 'Deposit'
  | 'Lease'
  | 'Maint fees'
  | 'Loan'
  | 'Purchase'
  | 'Tax'
  | 'Insurance';

export type TargetObject = 'Property' | 'Apartment' | 'Loan #' | 'Purchase Order' | 'Other';

export type DueDateRefSource = 'TPA' | 'Run' | 'Next';

export type CollectionMode = 'E-pay' | 'Manual' | 'Salary Adjusted' | 'Challan' | 'DD';

export type CollectionMethod = 'Full' | 'Partial' | 'Installment Full' | 'Installment Partial';

export type ExceptionType = 'Installment' | 'Discount' | 'Penalty' | 'Alert';

export type PercentBasis = 'Daily' | 'Monthly' | 'Yearly';

export type RuleStatus = 'Active' | 'Inactive';

export interface CollectionException {
  exceptionType: ExceptionType;
  seq: number;
  demandSlabMin: number | null;
  demandSlabMax: number | null;
  offsetDays: number | null;
  applicablePercent: number | null;
  applicablePercentBasis: PercentBasis | null;
  applicableMin: number | null;
  applicableMax: number | null;
  actualAmount: number | null;
  messageHook: string;
  legalNotices: string;
}

export interface DccRule {
  generationRuleNo: string;
  status: RuleStatus;
  targetObject: TargetObject;
  targetObjectId: string;
  demandType: DemandType;
  generationFrequencyCode: string;
  demandAmount: number | null;
  gstPercent: number | null;
  dueDateRefSource: DueDateRefSource;
  gracePeriodDays: number;
  increaseApplicationMonths: number | null;
  increasePercent: number | null;
  increaseMin: number | null;
  increaseMax: number | null;
  increaseAlertCriteria: string;
  lastRunDate: string | null;
  nextRunDate: string | null;
  nextInstalmentSeq: number | null;
  tpaUrlId: string;
  allowedCollectionModes: CollectionMode[];
  collectionMethods: CollectionMethod[];
  exceptions: CollectionException[];
}

export type FrequencyFamily = 'adhoc-tpa' | 'adhoc-excel' | 'instalment' | 'monthly' | 'daily' | 'weekly' | 'fortnightly' | 'quarterly' | 'yearly' | 'fixed';

export interface FrequencyDef {
  code: string;
  label: string;
  family: FrequencyFamily;
  nextRunHint: string;
  /** Field key enabled for this frequency */
  detail?: string;
}

export const FREQUENCIES: FrequencyDef[] = [
  { code: '99', label: 'Ad hoc by TPA', family: 'adhoc-tpa', nextRunHint: '999999', detail: 'Real-time TPA API post' },
  { code: '98', label: 'Ad hoc by Excel', family: 'adhoc-excel', nextRunHint: '999998', detail: 'Excel upload template' },
  { code: '95', label: 'Instalment demand', family: 'instalment', nextRunHint: 'per instalment grid', detail: 'Keyed at target object id, linked to instalment grid' },
  { code: '01', label: 'Monthly — 1st', family: 'monthly', nextRunHint: '1st of month' },
  { code: '05', label: 'Monthly — 5th', family: 'monthly', nextRunHint: '5th of month' },
  { code: '10', label: 'Monthly — 10th', family: 'monthly', nextRunHint: '10th of month' },
  { code: '15', label: 'Monthly — 15th', family: 'monthly', nextRunHint: '15th of month' },
  { code: '20', label: 'Monthly — 20th', family: 'monthly', nextRunHint: '20th of month' },
  { code: '25', label: 'Monthly — 25th', family: 'monthly', nextRunHint: '25th of month' },
  { code: '30', label: 'Monthly — EOM', family: 'monthly', nextRunHint: 'EOM (28/30/31)' },
  { code: '41', label: 'Daily — Monday', family: 'daily', nextRunHint: 'next Monday' },
  { code: '42', label: 'Daily — Tuesday', family: 'daily', nextRunHint: 'next Tuesday' },
  { code: '43', label: 'Daily — Wednesday', family: 'daily', nextRunHint: 'next Wednesday' },
  { code: '44', label: 'Daily — Thursday', family: 'daily', nextRunHint: 'next Thursday' },
  { code: '45', label: 'Daily — Friday', family: 'daily', nextRunHint: 'next Friday' },
  { code: '46', label: 'Daily — Saturday', family: 'daily', nextRunHint: 'next Saturday' },
  { code: '47', label: 'Daily — Sunday', family: 'daily', nextRunHint: 'next Sunday' },
  { code: '51', label: 'Weekly — Monday', family: 'weekly', nextRunHint: 'next Monday' },
  { code: '52', label: 'Weekly — Tuesday', family: 'weekly', nextRunHint: 'next Tuesday' },
  { code: '53', label: 'Weekly — Wednesday', family: 'weekly', nextRunHint: 'next Wednesday' },
  { code: '54', label: 'Weekly — Thursday', family: 'weekly', nextRunHint: 'next Thursday' },
  { code: '55', label: 'Weekly — Friday', family: 'weekly', nextRunHint: 'next Friday' },
  { code: '56', label: 'Weekly — Saturday', family: 'weekly', nextRunHint: 'next Saturday' },
  { code: '57', label: 'Weekly — Sunday', family: 'weekly', nextRunHint: 'next Sunday' },
  { code: '70', label: 'Fortnightly', family: 'fortnightly', nextRunHint: '15th and EOM' },
  { code: '75', label: 'Quarterly', family: 'quarterly', nextRunHint: '1st of quarter' },
  { code: '80', label: 'Yearly (fiscal)', family: 'yearly', nextRunHint: '1st of fiscal year' },
  { code: '81', label: 'Yearly (calendar)', family: 'yearly', nextRunHint: '1st of calendar year' },
  { code: '89', label: 'Fixed date', family: 'fixed', nextRunHint: 'stored in Next Run Date' },
];

export function frequencyByCode(code: string): FrequencyDef | undefined {
  return FREQUENCIES.find((f) => f.code === code);
}

export function isAdHoc(code: string): boolean {
  const fam = frequencyByCode(code)?.family;
  return fam === 'adhoc-tpa' || fam === 'adhoc-excel';
}

export const DEMAND_TYPES: DemandType[] = ['Rent', 'Deposit', 'Lease', 'Maint fees', 'Loan', 'Purchase', 'Tax', 'Insurance'];

export const TARGET_OBJECTS: TargetObject[] = ['Property', 'Apartment', 'Loan #', 'Purchase Order', 'Other'];

export const DUE_DATE_REF_SOURCES: { value: DueDateRefSource; label: string; hint: string }[] = [
  { value: 'TPA', label: 'TPA', hint: 'TPA date from JSON' },
  { value: 'Run', label: 'Run', hint: 'Actual BTM run date' },
  { value: 'Next', label: 'Next', hint: 'Next Run Date even if BTM run delayed' },
];

export const COLLECTION_MODES: CollectionMode[] = ['E-pay', 'Manual', 'Salary Adjusted', 'Challan', 'DD'];

export const COLLECTION_METHODS: CollectionMethod[] = ['Full', 'Partial', 'Installment Full', 'Installment Partial'];

export const EXCEPTION_TYPES: ExceptionType[] = ['Installment', 'Discount', 'Penalty', 'Alert'];

export const PERCENT_BASES: PercentBasis[] = ['Daily', 'Monthly', 'Yearly'];

export const EXCEPTION_OFFSET_HINT: Record<ExceptionType, string> = {
  Installment: 'Instalment cut-off reference',
  Discount: 'Ref date + Offset days',
  Penalty: 'Due date + Offset days',
  Alert: '(current date + Offset days) >= due date',
};

export function emptyException(type: ExceptionType, seq: number): CollectionException {
  return {
    exceptionType: type,
    seq,
    demandSlabMin: null,
    demandSlabMax: null,
    offsetDays: null,
    applicablePercent: null,
    applicablePercentBasis: null,
    applicableMin: null,
    applicableMax: null,
    actualAmount: null,
    messageHook: '',
    legalNotices: '',
  };
}

export function emptyRule(ruleNo: string): DccRule {
  return {
    generationRuleNo: ruleNo,
    status: 'Active',
    targetObject: 'Property',
    targetObjectId: '',
    demandType: 'Rent',
    generationFrequencyCode: '01',
    demandAmount: null,
    gstPercent: null,
    dueDateRefSource: 'TPA',
    gracePeriodDays: 0,
    increaseApplicationMonths: null,
    increasePercent: null,
    increaseMin: null,
    increaseMax: null,
    increaseAlertCriteria: '',
    lastRunDate: null,
    nextRunDate: null,
    nextInstalmentSeq: null,
    tpaUrlId: '',
    allowedCollectionModes: [],
    collectionMethods: [],
    exceptions: [],
  };
}

export function formatFrequencyLabel(code: string): string {
  const f = frequencyByCode(code);
  return f ? `${code} — ${f.label}` : code;
}
