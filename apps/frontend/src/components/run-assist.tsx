'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Pause, Play, RotateCcw } from 'lucide-react';

const resultActions = [
  { label: 'Пройден', shortcut: 'P', tone: 'from-emerald-500 to-green-600' },
  { label: 'Провален', shortcut: 'F', tone: 'from-rose-500 to-red-600' },
  { label: 'Заблокирован', shortcut: 'B', tone: 'from-amber-500 to-orange-600' },
  { label: 'Пропущен', shortcut: 'S', tone: 'from-slate-500 to-slate-600' },
  { label: 'Ретест', shortcut: 'R', tone: 'from-violet-500 to-purple-600' },
];

function format(total: number) {
  const hours = Math.floor(total / 3600), minutes = Math.floor(total % 3600 / 60), seconds = total % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : '', `${seconds}s`].filter(Boolean).join(' ');
}

function setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export function RunAssist({ runId }: { runId: string }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [hint, setHint] = useState('');
  const [recorded, setRecorded] = useState('');
  const lastCase = useRef('');

  function caseButtons() {
    return [...document.querySelectorAll<HTMLButtonElement>('aside.card button')]
      .filter((button) => button.querySelector('b')?.textContent?.includes('-TC-'));
  }
  function caseKey() {
    const active = caseButtons().find((button) => button.className.includes('bg-indigo-50'))?.querySelector('b')?.textContent ?? 'case';
    return `qh-run-draft:${runId}:${active}`;
  }
  function navigate(delta: number) {
    const buttons = caseButtons();
    const index = buttons.findIndex((button) => button.className.includes('bg-indigo-50'));
    buttons[index + delta]?.click();
  }
  function status(index: number) {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button[style*="background"]')]
      .filter((button) => ['rgb(22, 163, 74)', 'rgb(220, 38, 38)', 'rgb(217, 119, 6)', 'rgb(100, 116, 139)', 'rgb(124, 58, 237)'].includes(button.style.background) || button.style.background.startsWith('#'));
    const duration = [...document.querySelectorAll<HTMLInputElement>('input')].find((input) => input.placeholder.includes('1m'));
    const elapsed = duration?.value || format(seconds);
    if (duration && !duration.value) setValue(duration, elapsed);
    setRecorded(elapsed);
    setRunning(false);
    setTimeout(() => buttons[index]?.click(), 0);
  }
  function saveDraft() {
    const areas = [...document.querySelectorAll<HTMLTextAreaElement>('main textarea')];
    const duration = [...document.querySelectorAll<HTMLInputElement>('main input')].find((input) => input.placeholder.includes('1m'));
    if (areas.length) localStorage.setItem(caseKey(), JSON.stringify({ actual: areas[0]?.value ?? '', comment: areas[1]?.value ?? '', duration: duration?.value ?? '' }));
  }
  function restore() {
    const key = caseKey();
    if (key === lastCase.current) return;
    saveDraft();
    lastCase.current = key;
    setSeconds(0);
    setRecorded('');
    setRunning(true);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw), areas = [...document.querySelectorAll<HTMLTextAreaElement>('main textarea')];
      const duration = [...document.querySelectorAll<HTMLInputElement>('main input')].find((input) => input.placeholder.includes('1m'));
      if (areas[0] && !areas[0].value) setValue(areas[0], draft.actual ?? '');
      if (areas[1] && !areas[1].value) setValue(areas[1], draft.comment ?? '');
      if (duration && !duration.value) setValue(duration, draft.duration ?? '');
      setHint('Черновик восстановлен');
      setTimeout(() => setHint(''), 2500);
    } catch {}
  }

  useEffect(() => {
    const timer = setInterval(() => { if (running) setSeconds((value) => value + 1); }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const observer = new MutationObserver(() => setTimeout(restore, 50));
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    setTimeout(restore, 300);
    const input = () => saveDraft();
    document.addEventListener('input', input);
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches('input,textarea,select')) return;
      if (event.key === 'ArrowLeft') navigate(-1);
      if (event.key === 'ArrowRight') navigate(1);
      if (event.key.toLowerCase() === 'p') status(0);
      if (event.key.toLowerCase() === 'f') status(1);
      if (event.key.toLowerCase() === 'b') status(2);
      if (event.key.toLowerCase() === 's') status(3);
      if (event.key.toLowerCase() === 'r') status(4);
    };
    addEventListener('keydown', key);
    return () => { observer.disconnect(); document.removeEventListener('input', input); removeEventListener('keydown', key); saveDraft(); };
  }, []);

  return <>
  <aside className="fixed bottom-6 right-6 z-40 card p-3 shadow-2xl min-w-72" aria-label="Таймер тестирования">
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-2 items-center"><Clock3 className="text-brand" size={18} /><b className="font-mono">{format(seconds)}</b></div>
      <div className="flex">
        <button className="icon-btn" title="Предыдущий кейс (←)" onClick={() => navigate(-1)}><ChevronLeft size={17} /></button>
        <button className="icon-btn" title={running ? 'Пауза' : 'Продолжить'} onClick={() => setRunning(!running)}>{running ? <Pause size={17} /> : <Play size={17} />}</button>
        <button className="icon-btn" title="Сбросить таймер" onClick={() => setSeconds(0)}><RotateCcw size={17} /></button>
        <button className="icon-btn" title="Следующий кейс (→)" onClick={() => navigate(1)}><ChevronRight size={17} /></button>
      </div>
    </div>
    <div className="flex justify-between gap-3 text-[10px] text-muted mt-2"><span>P/F/B/S/R — статус · ← → навигация</span>{recorded && <b className="text-brand">Факт: {recorded}</b>}</div>
    {hint && <div className="text-xs text-green-600 mt-1">{hint}</div>}
  </aside>
  <aside className="fixed right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 w-44" aria-label="Статус тест-кейса">
    <span className="text-[11px] font-semibold text-muted text-center mb-1">РЕЗУЛЬТАТ ТЕСТА</span>
    {resultActions.map((action, index) => <button type="button" key={action.label} onClick={() => status(index)} className={`group text-white border-0 rounded-xl px-4 py-3 bg-gradient-to-r ${action.tone} shadow-lg hover:-translate-x-1 hover:shadow-xl transition-all cursor-pointer flex items-center justify-between gap-3`}><span className="font-semibold">{action.label}</span><kbd className="bg-white/20 rounded-md px-2 py-1 text-[10px]">{action.shortcut}</kbd></button>)}
  </aside>
  </>;
}
