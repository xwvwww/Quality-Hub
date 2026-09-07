"use client";

import { useId, useState } from "react";

type Day = { date: string; total: number; passed: number; failed: number; blocked: number };
const bars = [
  { key: "passed" as const, label: "Успешно", color: "#10b981" },
  { key: "failed" as const, label: "Провалено", color: "#f43f5e" },
  { key: "blocked" as const, label: "Заблокировано", color: "#f59e0b" },
];

export function QualityTrendChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId().replaceAll(":", "");
  const width = 820, height = 300, left = 38, right = 34, top = 26, bottom = 42;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const max = Math.max(1, ...days.map((day) => day.total));
  const x = (index: number) => left + (index + 0.5) * (plotWidth / Math.max(1, days.length));
  const passY = (value: number) => top + plotHeight * (1 - value / 100);
  const passRate = (day: Day) => {
    const executed = day.passed + day.failed + day.blocked;
    return executed ? day.passed / executed * 100 : 0;
  };
  if (!days.length) return <div className="h-64 grid place-items-center text-muted">Недостаточно данных для графика</div>;
  const activeDays = days.map((day, index) => ({ day, index })).filter(({ day }) => day.total > 0);
  const passPath = activeDays.map(({ day, index }, point) => `${point ? "L" : "M"}${x(index).toFixed(1)},${passY(passRate(day)).toFixed(1)}`).join(" ");
  const passArea = activeDays.length > 1 ? `${passPath} L${x(activeDays.at(-1)!.index)},${height - bottom} L${x(activeDays[0].index)},${height - bottom} Z` : "";
  const activeDay = active === null ? null : days[active];
  const labelStep = Math.max(1, Math.ceil(days.length / 10));
  return <div className="relative mt-5">
    <div className="flex items-center justify-between mb-2 px-1">
      <span className="text-xs text-muted">Объём выполнения</span>
      <span className="text-xs text-muted"><i className="inline-block w-2 h-2 rounded-full bg-brand mr-1" />Успешность</span>
    </div>
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-72 overflow-visible" role="img" aria-label="Объём результатов и динамика успешности тестирования">
      <defs>
        <linearGradient id={`${gradientId}-pass`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6366f1" stopOpacity=".22" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" /></linearGradient>
        <linearGradient id={`${gradientId}-bar`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6366f1" stopOpacity=".16" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" /></linearGradient>
        <filter id={`${gradientId}-glow`}><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line x1={left} x2={width - right} y1={top + plotHeight * ratio} y2={top + plotHeight * ratio} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="3 8" /><text x={left - 8} y={top + plotHeight * ratio + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{Math.round(max * (1 - ratio))}</text></g>)}
      {passArea && <path d={passArea} fill={`url(#${gradientId}-pass)`} />}
      {days.map((day, index) => {
        const barWidth = Math.min(30, Math.max(10, plotWidth / days.length * .52));
        let offset = 0;
        return <g key={day.date} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
          <rect x={x(index) - Math.max(14, plotWidth / days.length / 2)} y={top} width={Math.max(28, plotWidth / days.length)} height={plotHeight} fill="transparent" />
          {active === index && <rect x={x(index) - Math.max(14, plotWidth / days.length / 2)} y={top} width={Math.max(28, plotWidth / days.length)} height={plotHeight} rx="8" fill={`url(#${gradientId}-bar)`} />}
          {bars.map(({ key, color }) => { const value = day[key]; const segmentHeight = plotHeight * value / max; const segmentY = height - bottom - offset - segmentHeight; offset += segmentHeight; return <rect key={key} x={x(index) - barWidth / 2} y={segmentY} width={barWidth} height={Math.max(value ? 2 : 0, segmentHeight)} rx="4" fill={color} className="quality-trend-bar" opacity={active === null || active === index ? 1 : .72} />; })}
          {active === index && <line x1={x(index)} x2={x(index)} y1={top} y2={height - bottom} stroke="#6366f1" strokeDasharray="3 5" />}
        </g>;
      })}
      {passPath && <path d={passPath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="quality-trend-line" filter={`url(#${gradientId}-glow)`} />}
      {activeDays.map(({ day, index }) => <circle key={`${day.date}-rate`} cx={x(index)} cy={passY(passRate(day))} r={active === index ? 5 : 3.5} fill="#6366f1" stroke="white" strokeWidth="2" className={active === index ? "quality-trend-point-active" : ""} />)}
      {days.map((day, index) => index % labelStep === 0 || index === days.length - 1 ? <text key={`${day.date}-label`} x={x(index)} y={height - 14} textAnchor="middle" className="fill-slate-400 text-[10px]">{new Date(`${day.date}T00:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}</text> : null)}
    </svg>
    {activeDay && <div className="absolute top-7 right-3 card px-4 py-3 shadow-xl pointer-events-none text-xs z-10 min-w-44">
      <b className="block mb-2">{new Date(`${activeDay.date}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</b>
      <span className="flex justify-between gap-8 text-brand"><i>● Успешность</i><b>{Math.round(passRate(activeDay))}%</b></span>
      {bars.map(({ key, label, color }) => <span className="flex justify-between gap-8 mt-1" key={key}><i style={{ color }}>● {label}</i><b>{activeDay[key]}</b></span>)}
      <span className="flex justify-between gap-8 mt-2 pt-2 border-t border-[var(--line)]"><span className="text-muted">Всего</span><b>{activeDay.total}</b></span>
    </div>}
    <div className="flex flex-wrap justify-center gap-5 text-xs text-muted -mt-3">{bars.map(({ key, label, color }) => <span key={key}><i style={{ color }}>●</i> {label}</span>)}<span><i className="text-brand">━</i> Успешность</span></div>
  </div>;
}
