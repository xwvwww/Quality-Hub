'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, Bug, CheckCircle2, Clock3, Gauge, PlayCircle } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/auth';

type Project = { id: string; code: string; name: string };
type Plan = { id: string; name: string; projectId: string; project: { code: string } };
type Analytics = {
  metrics: { testCases: number; executions: number; passed: number; failed: number; blocked: number; passRate: number; duration: number; averageDuration: number; runs: number; defects: number; openDefects: number };
  daily: Array<{ date: string; total: number; passed: number; failed: number; blocked: number; duration: number }>;
  testers: Array<{ id: string; name: string; total: number; passed: number; failed: number; blocked: number; duration: number; passRate: number }>;
  runTrends: Array<{ id: string; name: string; projectCode: string; date: string; total: number; executed: number; passRate: number }>;
  problematicCases: Array<{ id: string; displayId: string; title: string; failed: number; total: number }>;
  defectSeverities: Record<string, number>;
  defectStatuses: Record<string, number>;
};

const severityNames: Record<string, string> = { BLOCKER: 'Блокирующий', CRITICAL: 'Критический', MAJOR: 'Значительный', MINOR: 'Незначительный', TRIVIAL: 'Тривиальный' };
const severityColors: Record<string, string> = { BLOCKER: 'bg-red-700', CRITICAL: 'bg-red-500', MAJOR: 'bg-orange-500', MINOR: 'bg-amber-400', TRIVIAL: 'bg-slate-400' };

function duration(seconds: number) {
  if (!seconds) return '0с';
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), rest = seconds % 60;
  return [hours && `${hours}ч`, minutes && `${minutes}м`, rest && `${rest}с`].filter(Boolean).join(' ');
}

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [projectId, setProjectId] = useState('');
  const [planId, setPlanId] = useState('');
  const [days, setDays] = useState('30');
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ items: Project[] }>('/projects?page=1&pageSize=100'),
      api<{ items: Plan[] }>('/test-plans?page=1&pageSize=100'),
    ]).then(([projectResponse, planResponse]) => {
      setProjects(projectResponse.items); setPlans(planResponse.items);
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить фильтры'));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ days });
    if (projectId) params.set('projectId', projectId);
    if (planId) params.set('testPlanId', planId);
    setLoading(true); setError('');
    api<Analytics>(`/analytics?${params}`).then(setData).catch(reason => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить аналитику')).finally(() => setLoading(false));
  }, [projectId, planId, days]);

  const availablePlans = useMemo(() => projectId ? plans.filter(plan => plan.projectId === projectId) : plans, [plans, projectId]);
  const activeDays = data?.daily.filter(day => day.total) ?? [];
  const maxDaily = Math.max(1, ...activeDays.map(day => day.total));
  const maxSeverity = Math.max(1, ...Object.values(data?.defectSeverities ?? {}));
  const latestRuns = data?.runTrends.slice(-8).reverse() ?? [];

  function changeProject(value: string) {
    setProjectId(value);
    if (planId && !plans.some(plan => plan.id === planId && (!value || plan.projectId === value))) setPlanId('');
  }

  return <AppShell><main className="p-7 max-w-7xl mx-auto">
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
      <div><p className="text-muted text-sm m-0">Динамика качества и работы команды</p><h1 className="text-3xl m-0 mt-1">Аналитика</h1></div>
      <div className="grid sm:grid-cols-3 gap-3 w-full xl:w-auto xl:min-w-[700px]">
        <select className="field" value={projectId} onChange={event => changeProject(event.target.value)}><option value="">Все проекты</option>{projects.map(project => <option value={project.id} key={project.id}>{project.code} — {project.name}</option>)}</select>
        <select className="field" value={planId} onChange={event => setPlanId(event.target.value)}><option value="">Все тест-планы</option>{availablePlans.map(plan => <option value={plan.id} key={plan.id}>{plan.project.code} · {plan.name}</option>)}</select>
        <select className="field" value={days} onChange={event => setDays(event.target.value)}><option value="7">Последние 7 дней</option><option value="30">Последние 30 дней</option><option value="90">Последние 90 дней</option><option value="365">Последний год</option></select>
      </div>
    </div>
    {error && <p className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</p>}
    {loading && <section className="card p-12 text-center text-muted">Собираем аналитику…</section>}
    {!loading && data && <>
      <section className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[[Activity, 'Выполнено', data.metrics.executions, `${data.metrics.testCases} кейсов`], [CheckCircle2, 'Успешность', `${data.metrics.passRate}%`, `${data.metrics.passed} успешно`], [Clock3, 'Затрачено', duration(data.metrics.duration), `Среднее ${duration(data.metrics.averageDuration)}`], [PlayCircle, 'Тест-раны', data.metrics.runs, `${data.metrics.failed} провалено`], [Bug, 'Дефекты', data.metrics.defects, `${data.metrics.openDefects} открыто`]].map(([Icon, label, value, hint]: any) => <article className="card p-5" key={label}><Icon className="text-brand" size={22}/><span className="block text-sm text-muted mt-4">{label}</span><b className="text-3xl block mt-1">{value}</b><span className="text-xs text-muted">{hint}</span></article>)}
      </section>
      <section className="grid xl:grid-cols-[1.6fr_1fr] gap-5 mt-5">
        <article className="card p-6 min-w-0"><div className="flex justify-between items-start"><div><h2 className="m-0 text-xl">Динамика выполнения</h2><p className="text-sm text-muted mt-1">Результаты по дням, в которых запускались тесты</p></div><div className="text-xs flex gap-3"><span className="text-green-600">● Успешно</span><span className="text-red-600">● Провалено</span><span className="text-amber-600">● Блокировано</span></div></div>
          {activeDays.length ? <div className="h-64 flex items-end gap-2 mt-5 border-b border-[var(--line)] overflow-x-auto">{activeDays.map(day => <div className="h-full min-w-8 flex-1 flex flex-col justify-end group" title={`${day.date}: ${day.total}`} key={day.date}><div className="flex flex-col justify-end min-h-1 rounded-t overflow-hidden" style={{ height: `${Math.max(3, day.total / maxDaily * 88)}%` }}><div className="bg-green-500" style={{ flex: day.passed }}/><div className="bg-red-500" style={{ flex: day.failed }}/><div className="bg-amber-400" style={{ flex: day.blocked }}/></div><span className="text-[10px] text-muted text-center py-2 whitespace-nowrap">{new Date(`${day.date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span></div>)}</div> : <div className="h-64 grid place-items-center text-muted">За выбранный период выполнений нет</div>}
        </article>
        <article className="card p-6"><h2 className="m-0 text-xl">Дефекты по серьёзности</h2><p className="text-sm text-muted mt-1">Созданные за выбранный период</p><div className="mt-5 space-y-4">{Object.entries(severityNames).map(([key, name]) => { const value = data.defectSeverities[key] ?? 0; return <div key={key}><div className="flex justify-between text-sm mb-1"><span>{name}</span><b>{value}</b></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${severityColors[key]}`} style={{ width: `${value / maxSeverity * 100}%` }}/></div></div>})}</div></article>
      </section>
      <section className="grid xl:grid-cols-2 gap-5 mt-5">
        <article className="card overflow-hidden"><div className="p-6 pb-3"><h2 className="m-0 text-xl">Эффективность тестировщиков</h2><p className="text-sm text-muted mt-1">Количество и результат выполнений</p></div><div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr className="bg-slate-50 text-left text-muted"><th className="p-3">Тестировщик</th><th className="p-3">Выполнено</th><th className="p-3">Успешность</th><th className="p-3">Время</th></tr></thead><tbody>{data.testers.map(tester => <tr className="border-t border-[var(--line)]" key={tester.id}><td className="p-3 font-semibold">{tester.name}</td><td className="p-3">{tester.total}</td><td className="p-3"><span className={tester.passRate >= 80 ? 'text-green-600' : tester.passRate >= 50 ? 'text-amber-600' : 'text-red-600'}>{tester.passRate}%</span></td><td className="p-3">{duration(tester.duration)}</td></tr>)}{!data.testers.length && <tr><td className="p-10 text-center text-muted" colSpan={4}>Нет данных</td></tr>}</tbody></table></div></article>
        <article className="card p-6"><h2 className="m-0 text-xl">Проблемные тест-кейсы</h2><p className="text-sm text-muted mt-1">Кейсы с наибольшим числом провалов</p><div className="mt-3">{data.problematicCases.map(item => <Link href={`/test-cases/${item.id}`} key={item.id} className="flex justify-between gap-4 py-3 border-t border-[var(--line)] text-current no-underline hover:text-brand"><div><b className="text-brand text-xs">{item.displayId}</b><span className="block text-sm mt-1">{item.title}</span></div><span className="text-sm text-red-600 whitespace-nowrap">{item.failed} из {item.total}</span></Link>)}{!data.problematicCases.length && <div className="py-10 text-center text-muted"><Gauge className="mx-auto mb-2"/>Проблемных кейсов нет</div>}</div></article>
      </section>
      <article className="card p-6 mt-5"><h2 className="m-0 text-xl">Последние тест-раны</h2><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">{latestRuns.map(run => <Link href={`/test-runs/${run.id}`} key={run.id} className="border border-[var(--line)] rounded-xl p-4 text-current no-underline hover:border-brand"><span className="text-xs text-muted">{run.projectCode} · {new Date(run.date).toLocaleDateString('ru-RU')}</span><b className="block mt-1 truncate">{run.name}</b><div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-4"><div className="h-full bg-green-500" style={{ width: `${run.passRate}%` }}/></div><span className="text-xs text-muted">{run.executed}/{run.total} · {run.passRate}%</span></Link>)}{!latestRuns.length && <p className="text-muted">Тест-ранов нет</p>}</div></article>
    </>}
  </main></AppShell>;
}
