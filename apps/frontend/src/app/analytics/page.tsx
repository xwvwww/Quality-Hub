"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bug,
  CheckCircle2,
  Clock3,
  Gauge,
  PlayCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/auth";
import { formatDuration } from "@/lib/duration";
type Project = { id: string; code: string; name: string };
type Plan = {
  id: string;
  name: string;
  projectId: string;
  project: { code: string };
};
type Data = {
  metrics: {
    testCases: number;
    executions: number;
    passed: number;
    failed: number;
    blocked: number;
    passRate: number;
    duration: number;
    averageDuration: number;
    runs: number;
    defects: number;
    openDefects: number;
  };
  daily: Array<{
    date: string;
    total: number;
    passed: number;
    failed: number;
    blocked: number;
  }>;
  testers: Array<{
    id: string;
    name: string;
    total: number;
    failed: number;
    duration: number;
    passRate: number;
  }>;
  runTrends: Array<{
    id: string;
    name: string;
    projectCode: string;
    date: string;
    total: number;
    executed: number;
    passRate: number;
  }>;
  problematicCases: Array<{
    id: string;
    displayId: string;
    title: string;
    failed: number;
    total: number;
  }>;
};
export default function Analytics() {
  const [projects, setProjects] = useState<Project[]>([]),
    [plans, setPlans] = useState<Plan[]>([]),
    [project, setProject] = useState(""),
    [plan, setPlan] = useState(""),
    [days, setDays] = useState("30"),
    [data, setData] = useState<Data | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<{ items: Project[] }>("/projects?page=1&pageSize=100"),
      api<{ items: Plan[] }>("/test-plans?page=1&pageSize=100"),
    ])
      .then(([p, t]) => {
        setProjects(p.items);
        setPlans(t.items);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const q = new URLSearchParams({ days });
    if (project) q.set("projectId", project);
    if (plan) q.set("testPlanId", plan);
    setLoading(true);
    api<Data>(`/analytics?${q}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [project, plan, days]);
  const shownPlans = useMemo(
    () => (project ? plans.filter((p) => p.projectId === project) : plans),
    [plans, project],
  );
  const max = Math.max(1, ...(data?.daily ?? []).map((x) => x.total));
  const cards = data
    ? [
        [
          Activity,
          "Выполнено",
          data.metrics.executions,
          `${data.metrics.testCases} кейсов`,
          "text-indigo-600",
        ],
        [
          CheckCircle2,
          "Успешность",
          `${data.metrics.passRate}%`,
          `${data.metrics.passed} успешно`,
          "text-emerald-600",
        ],
        [
          Clock3,
          "Затрачено",
          formatDuration(data.metrics.duration),
          `Среднее ${formatDuration(data.metrics.averageDuration)}`,
          "text-blue-600",
        ],
        [
          PlayCircle,
          "Запуски",
          data.metrics.runs,
          `${data.metrics.failed} провалено`,
          "text-violet-600",
        ],
        [
          Bug,
          "Открытые дефекты",
          data.metrics.openDefects,
          `${data.metrics.defects} всего`,
          "text-rose-600",
        ],
      ]
    : [];
  return (
    <AppShell>
      <main className="p-7 max-w-7xl mx-auto">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-muted text-sm m-0">
              Измеримые результаты тестирования
            </p>
            <h1 className="text-3xl font-medium m-0 mt-1">Аналитика</h1>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 xl:min-w-[700px]">
            <select
              className="field"
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                setPlan("");
              }}
            >
              <option value="">Все проекты</option>
              {projects.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="">Все тест-планы</option>
              {shownPlans.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.project.code} · {p.name}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            >
              <option value="7">7 дней</option>
              <option value="30">30 дней</option>
              <option value="90">90 дней</option>
              <option value="365">Год</option>
            </select>
          </div>
        </header>
        {error && (
          <p className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</p>
        )}
        {loading ? (
          <div className="card h-72 animate-pulse" />
        ) : (
          data && (
            <>
              <section className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {cards.map(([Icon, label, value, hint, color]: any) => (
                  <article className="card p-5" key={label}>
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">{label}</span>
                      <Icon className={color} size={20} />
                    </div>
                    <b className="block text-3xl mt-3">{value}</b>
                    <span className="text-xs text-muted">{hint}</span>
                  </article>
                ))}
              </section>
              <section className="grid xl:grid-cols-[1.55fr_1fr] gap-5 mt-5">
                <article className="card p-6">
                  <div className="flex justify-between">
                    <div>
                      <h2 className="m-0 text-xl font-medium">
                        Пульс качества
                      </h2>
                      <p className="text-muted text-sm mt-1">
                        Ежедневное соотношение результатов
                      </p>
                    </div>
                    {data.metrics.passRate >= 80 ? (
                      <TrendingUp className="text-emerald-500" />
                    ) : (
                      <TrendingDown className="text-rose-500" />
                    )}
                  </div>
                  <div className="grid grid-cols-7 md:grid-cols-10 gap-2 mt-6 max-h-72 overflow-y-auto pr-1">
                    {data.daily.map((d) => (
                      <div
                        className="aspect-square p-1 rounded-lg border border-[var(--line)] bg-slate-50 shadow-inner"
                        title={`${d.date}: ${d.total}`}
                        key={d.date}
                      >
                        <div
                          className="h-full flex flex-col-reverse rounded-md overflow-hidden bg-slate-100"
                          style={{
                            opacity: Math.max(0.16, d.total / max),
                          }}
                        >
                          {d.total ? (
                            <>
                              <i
                                className="bg-emerald-500"
                                style={{
                                  height: `${(d.passed / d.total) * 100}%`,
                                }}
                              />
                              <i
                                className="bg-rose-500"
                                style={{
                                  height: `${(d.failed / d.total) * 100}%`,
                                }}
                              />
                              <i
                                className="bg-orange-400"
                                style={{
                                  height: `${(d.blocked / d.total) * 100}%`,
                                }}
                              />
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 justify-center text-xs mt-4">
                    <span className="text-emerald-600">● Успешно</span>
                    <span className="text-rose-600">● Провалено</span>
                    <span className="text-orange-600">● Заблокировано</span>
                  </div>
                </article>
                <article className="card p-6">
                  <h2 className="m-0 text-xl font-medium">Проблемные кейсы</h2>
                  <p className="text-muted text-sm mt-1">
                    Кейсы, требующие внимания команды
                  </p>
                  <div className="mt-4">
                    {data.problematicCases.slice(0, 6).map((c) => (
                      <Link
                        href={`/test-cases/${c.id}`}
                        className="flex justify-between gap-4 py-4 border-t border-[var(--line)] text-current no-underline hover:text-brand"
                        key={c.id}
                      >
                        <div className="min-w-0">
                          <b className="text-brand text-xs">{c.displayId}</b>
                          <span className="block text-sm truncate">
                            {c.title}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 h-fit rounded-full bg-rose-50 text-rose-700 text-xs">
                          {c.failed}/{c.total}
                        </span>
                      </Link>
                    ))}
                    {!data.problematicCases.length && (
                      <div className="text-center text-muted py-14">
                        <Gauge className="mx-auto mb-2" />
                        Проблемных кейсов нет
                      </div>
                    )}
                  </div>
                </article>
              </section>
              <section className="grid xl:grid-cols-2 gap-5 mt-5">
                <article className="card overflow-hidden">
                  <div className="p-6">
                    <h2 className="m-0 text-xl font-medium">
                      Эффективность команды
                    </h2>
                    <p className="text-muted text-sm mt-1">
                      Результаты и фактически затраченное время
                    </p>
                  </div>
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr>
                          <th className="p-3 text-left">Специалист</th>
                          <th className="p-3">Выполнено</th>
                          <th className="p-3">Успешность</th>
                          <th className="p-3">Время</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.testers.map((t) => (
                          <tr
                            className="border-t border-[var(--line)]"
                            key={t.id}
                          >
                            <td className="p-3 font-medium">{t.name}</td>
                            <td className="p-3 text-center">{t.total}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-1 rounded-full ${t.passRate >= 80 ? "bg-emerald-50 text-emerald-700" : t.passRate >= 50 ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700"}`}
                              >
                                {t.passRate}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {formatDuration(t.duration)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
                <article className="card p-6">
                  <div className="flex justify-between">
                    <h2 className="m-0 text-xl font-medium">
                      Последние запуски
                    </h2>
                    <Link
                      href="/test-runs"
                      className="text-brand text-sm no-underline"
                    >
                      Все →
                    </Link>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    {data.runTrends
                      .slice(-6)
                      .reverse()
                      .map((r) => (
                        <Link
                          href={`/test-runs/${r.id}`}
                          className="p-4 rounded-xl border border-[var(--line)] text-current no-underline hover:border-brand"
                          key={r.id}
                        >
                          <span className="text-xs text-muted">
                            {r.projectCode} ·{" "}
                            {new Date(r.date).toLocaleDateString("ru-RU")}
                          </span>
                          <b className="block truncate mt-1">{r.name}</b>
                          <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                            <i
                              className="block h-full bg-emerald-500"
                              style={{ width: `${r.passRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted">
                            {r.executed}/{r.total} · {r.passRate}%
                          </span>
                        </Link>
                      ))}
                  </div>
                </article>
              </section>
            </>
          )
        )}
      </main>
    </AppShell>
  );
}
