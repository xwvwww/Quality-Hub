"use client";

import { useMemo, useState } from "react";

type Day = { date: string; total: number; passed: number; failed: number; blocked: number };
const series = [
  { key: "passed" as const, label: "Успешно", color: "#10b981" },
  { key: "failed" as const, label: "Провалено", color: "#f43f5e" },
  { key: "blocked" as const, label: "Заблокировано", color: "#f59e0b" },
];

export function QualityTrendChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 760, height = 250, left = 24, right = 18, top = 20, bottom = 30;
  const max = Math.max(1, ...days.flatMap((day) => [day.passed, day.failed, day.blocked]));
  const x = (index: number) => left + index * ((width - left - right) / Math.max(1, days.length - 1));
  const y = (value: number) => top + (height - top - bottom) * (1 - value / max);
  const paths = useMemo(() => Object.fromEntries(series.map(({ key }) => [key, days.map((day, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(day[key]).toFixed(1)}`).join(" ")])), [days, max]);
  if (!days.length) return <div className="h-64 grid place-items-center text-muted">Недостаточно данных для графика</div>;
  return <div className="relative mt-5">
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 overflow-visible" role="img" aria-label="Динамика результатов тестирования">
      <defs>
        <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6366f1" stopOpacity=".18"/><stop offset="1" stopColor="#6366f1" stopOpacity="0"/></linearGradient>
        <filter id="trend-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} x1={left} x2={width-right} y1={top+(height-top-bottom)*ratio} y2={top+(height-top-bottom)*ratio} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="4 7"/>) }
      <path d={`${paths.passed} L${x(days.length-1)},${height-bottom} L${x(0)},${height-bottom} Z`} fill="url(#trend-area)"/>
      {series.map(({ key, color }) => <path key={key} d={paths[key]} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="quality-trend-line" filter="url(#trend-glow)"/>)}
      {days.map((day, index) => <g key={day.date} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
        <rect x={x(index)-Math.max(8,(width-left-right)/days.length/2)} y={top} width={Math.max(16,(width-left-right)/days.length)} height={height-top-bottom} fill="transparent"/>
        {active===index&&<line x1={x(index)} x2={x(index)} y1={top} y2={height-bottom} stroke="#6366f1" strokeDasharray="3 4"/>}
        {series.map(({key,color})=><circle key={key} cx={x(index)} cy={y(day[key])} r={active===index?5:3} fill={color} stroke="white" strokeWidth="2"/>)}
      </g>)}
    </svg>
    {active!==null&&<div className="absolute top-3 right-3 card px-4 py-3 shadow-xl pointer-events-none text-xs z-10">
      <b className="block mb-2">{new Date(days[active].date+"T00:00:00").toLocaleDateString("ru-RU")}</b>
      {series.map(({key,label,color})=><span className="flex justify-between gap-8 mt-1" key={key}><i style={{color}}>● {label}</i><b>{days[active][key]}</b></span>)}
    </div>}
    <div className="flex flex-wrap justify-center gap-5 text-xs text-muted -mt-2">{series.map(({key,label,color})=><span key={key}><i style={{color}}>●</i> {label}</span>)}</div>
  </div>;
}
