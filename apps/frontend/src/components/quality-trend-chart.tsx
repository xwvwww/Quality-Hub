"use client";

import { useId, useState } from "react";

type Day = { date: string; total: number; passed: number; failed: number; blocked: number };
const series = [
  { key: "passed" as const, label: "Успешно", color: "#10b981" },
  { key: "failed" as const, label: "Провалено", color: "#f43f5e" },
  { key: "blocked" as const, label: "Заблокировано", color: "#f59e0b" },
];

export function QualityTrendChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId().replaceAll(":", "");
  const width = 820, height = 280, left = 38, right = 28, top = 24, bottom = 40;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const max = Math.max(1, ...days.flatMap((day) => [day.passed, day.failed, day.blocked]));
  const x = (index: number) => left + index * (plotWidth / Math.max(1, days.length - 1));
  const y = (value: number) => top + plotHeight * (1 - value / max);
  const labelStep = Math.max(1, Math.ceil(days.length / 10));
  const pathFor = (key: keyof Pick<Day, "passed" | "failed" | "blocked">) => days.map((day, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(day[key]).toFixed(1)}`).join(" ");
  if (!days.length) return <div className="h-64 grid place-items-center text-muted">Недостаточно данных для графика</div>;
  const activeDay = active === null ? null : days[active];
  return <div className="relative mt-5">
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-72 overflow-visible" role="img" aria-label="Динамика результатов тестирования">
      <defs>
        <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6366f1" stopOpacity=".16" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" /></linearGradient>
        <filter id={`${gradientId}-glow`}><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line x1={left} x2={width - right} y1={top + plotHeight * ratio} y2={top + plotHeight * ratio} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="2 8" /><text x={left - 8} y={top + plotHeight * ratio + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{Math.round(max * (1 - ratio))}</text></g>)}
      <path d={`${pathFor("passed")} L${x(days.length - 1)},${height - bottom} L${x(0)},${height - bottom} Z`} fill={`url(#${gradientId}-area)`} />
  {days.map((day, index) => <g key={day.date} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}><rect x={x(index) - Math.max(12, plotWidth / Math.max(1, days.length - 1) / 2)} y={top} width={Math.max(24, plotWidth / Math.max(1, days.length - 1))} height={plotHeight} fill="transparent" />{active === index && <line x1={x(index)} x2={x(index)} y1={top} y2={height - bottom} stroke="#6366f1" strokeDasharray="3 5" />}</g>)}
  {series.map(({ key, color }) => <path key={key} d={pathFor(key)} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="quality-trend-line" filter={`url(#${gradientId}-glow)`} />)}
  {series.map(({ key, color }) => days.map((day, index) => <circle key={`${key}-${day.date}`} cx={x(index)} cy={y(day[key])} r={active === index ? 5 : 3} fill={color} stroke="white" strokeWidth="2" className={active === index ? "quality-trend-point-active" : ""} />))}
  {days.map((day, index) => index % labelStep === 0 || index === days.length - 1 ? <text key={`${day.date}-label`} x={x(index)} y={height - 14} textAnchor="middle" className="fill-slate-400 text-[10px]">{new Date(`${day.date}T00:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}</text> : null)}
    </svg>
    {activeDay && <div className="absolute top-2 right-3 card px-4 py-3 shadow-xl pointer-events-none text-xs z-10 min-w-44">
      <b className="block mb-2">{new Date(`${activeDay.date}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</b>
      {series.map(({ key, label, color }) => <span className="flex justify-between gap-8 mt-1" key={key}><i style={{ color }}>● {label}</i><b>{activeDay[key]}</b></span>)}
      <span className="flex justify-between gap-8 mt-2 pt-2 border-t border-[var(--line)]"><span className="text-muted">Всего</span><b>{activeDay.total}</b></span>
    </div>}
  </div>;
}
