import type { ReactNode } from 'react';

export function Field({ label, children, hint, className = '' }: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-slate-400 leading-tight">{hint}</span>}
    </label>
  );
}

const inputBase =
  'h-7 w-full rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-800 shadow-inner outline-none transition-colors focus:border-teal-600 focus:ring-1 focus:ring-teal-600/30 disabled:bg-slate-100 disabled:text-slate-400';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...props} className={`${inputBase} !h-auto py-1 leading-snug ${props.className ?? ''}`} />;
}

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{title}</h3>
      {children}
    </div>
  );
}

export function CheckGroup<T extends string>({ options, values, onChange, columns = 2 }: {
  options: readonly T[];
  values: T[];
  onChange: (next: T[]) => void;
  columns?: number;
}) {
  const toggle = (opt: T) =>
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  return (
    <div className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((opt) => (
        <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={values.includes(opt)}
            onChange={() => toggle(opt)}
            className="h-3.5 w-3.5 accent-teal-700"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'red' | 'amber' | 'teal'; children: ReactNode }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-px text-[10px] font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}
