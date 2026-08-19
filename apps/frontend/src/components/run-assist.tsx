'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Clock3, Pause, Play, RotateCcw } from 'lucide-react';

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
    if (duration && !duration.value) setValue(duration, format(seconds));
    buttons[index]?.click();
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

  return <aside className="fixed right-4 top-1/2 -translate-y-1/2 z-40 card p-2 shadow-2xl w-16 flex flex-col items-center gap-2" aria-label="Таймер тестирования">
    <div className="w-12 min-h-12 rounded-xl bg-indigo-50 text-brand grid place-items-center px-1" title="Время выполнения текущего кейса">
      <Clock3 size={16} />
      <b className="font-mono text-[11px] whitespace-nowrap">{format(seconds)}</b>
    </div>
    <button className="icon-btn" title="Предыдущий кейс (←)" onClick={() => navigate(-1)}><ChevronUp size={19} /></button>
    <button className="icon-btn bg-indigo-50 text-brand" title={running ? 'Пауза' : 'Продолжить'} onClick={() => setRunning(!running)}>{running ? <Pause size={19} /> : <Play size={19} />}</button>
    <button className="icon-btn" title="Сбросить таймер" onClick={() => setSeconds(0)}><RotateCcw size={18} /></button>
    <button className="icon-btn" title="Следующий кейс (→)" onClick={() => navigate(1)}><ChevronDown size={19} /></button>
    {hint && <div className="absolute right-20 top-1/2 -translate-y-1/2 card px-3 py-2 text-xs text-green-600 whitespace-nowrap shadow-xl">{hint}</div>}
  </aside>;
}
