'use client';

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';

export type EditableStep = { action: string; expectedResult: string };

export function StepSectionEditor({ title, hint, steps, onChange, disabled = false }: { title: string; hint: string; steps: EditableStep[]; onChange: (steps: EditableStep[]) => void; disabled?: boolean }) {
  const update = (index: number, field: keyof EditableStep, value: string) => onChange(steps.map((step, position) => position === index ? { ...step, [field]: value } : step));
  const move = (index: number, offset: number) => { const target = index + offset; if (target < 0 || target >= steps.length) return; const next = [...steps]; [next[index], next[target]] = [next[target], next[index]]; onChange(next); };
  return <section className="border border-[var(--line)] rounded-xl p-4">
    <div className="flex justify-between gap-3"><div><h3 className="m-0 text-base">{title}</h3><p className="text-muted text-sm mt-1 mb-0">{hint}</p></div>{!disabled && <button type="button" className="btn-secondary flex gap-2 items-center" onClick={() => onChange([...steps, { action: '', expectedResult: '' }])}><Plus size={16} />Добавить</button>}</div>
    <div className="space-y-3 mt-4">{steps.map((step, index) => <div className="grid grid-cols-[32px_1fr_1fr_auto] gap-2 items-start" key={index}><span className="w-8 h-8 bg-indigo-50 text-brand rounded-full grid place-items-center font-bold text-sm">{index + 1}</span><textarea className="field min-h-20" required disabled={disabled} placeholder="Действие" value={step.action} onChange={event => update(index, 'action', event.target.value)} /><textarea className="field min-h-20" required disabled={disabled} placeholder="Ожидаемый результат" value={step.expectedResult} onChange={event => update(index, 'expectedResult', event.target.value)} />{!disabled && <div className="grid grid-cols-2"><button type="button" className="icon-btn" title="Выше" onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button type="button" className="icon-btn" title="Ниже" onClick={() => move(index, 1)}><ArrowDown size={15} /></button><button type="button" className="icon-btn" title="Дублировать" onClick={() => onChange([...steps.slice(0, index + 1), { ...step }, ...steps.slice(index + 1)])}><Copy size={15} /></button><button type="button" className="icon-btn text-red-600" title="Удалить" onClick={() => onChange(steps.filter((_, position) => position !== index))}><Trash2 size={15} /></button></div>}</div>)}{!steps.length && <p className="text-center text-muted text-sm p-4 m-0">Шаги пока не добавлены.</p>}</div>
  </section>;
}
