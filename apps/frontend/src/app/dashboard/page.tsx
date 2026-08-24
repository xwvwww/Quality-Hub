"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  PlayCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, session } from "@/lib/auth";
type Summary = {
  metrics: {
    projects: number;
    testCases: number;
    runs: number;
    executed: number;
    passRate: number;
  };
  results: Record<string, number>;
  recentRuns: Array<{
    id: string;
    name: string;
    project: { code: string };
    createdAt: string;
    total: number;
    passRate: number;
  }>;
};
type Analytics = {
  metrics: { openDefects: number };
  daily: Array<{
    date: string;
    total: number;
    passed: number;
    failed: number;
    blocked: number;
  }>;
};
const results = [
  ["PASSED", "Успешно", "#10b981"],
  ["FAILED", "Провалено", "#f43f5e"],
  ["BLOCKED", "Заблокировано", "#f97316"],
] as const;
function WorkspaceDashboard() {
  const [s, setS] = useState<Summary | null>(null),
    [a, setA] = useState<Analytics | null>(null),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Summary>("/reports/summary"),
      api<Analytics>("/analytics?days=14"),
      api<{ firstName: string }>("/profile"),
    ])
      .then(([x, y, p]) => {
        setS(x);
        setA(y);
        setName(p.firstName);
      })
      .catch((e) => setError(e.message));
  }, []);
  const days = a?.daily ?? [],
    max = Math.max(1, ...days.map((x) => x.total));
  const cards = [
    [
      FolderKanban,
      "Проекты",
      s?.metrics.projects ?? "—",
      "/projects",
      "bg-indigo-50 text-indigo-600",
    ],
    [
      ClipboardCheck,
      "Тест-кейсы",
      s?.metrics.testCases ?? "—",
      "/test-cases",
      "bg-violet-50 text-violet-600",
    ],
    [
      PlayCircle,
      "Тест-раны",
      s?.metrics.runs ?? "—",
      "/test-runs",
      "bg-blue-50 text-blue-600",
    ],
    [
      CheckCircle2,
      "Успешность",
      s ? `${s.metrics.passRate}%` : "—",
      "/analytics",
      "bg-emerald-50 text-emerald-600",
    ],
    [
      Bug,
      "Открытые дефекты",
      a?.metrics.openDefects ?? "—",
      "/analytics",
      "bg-rose-50 text-rose-600",
    ],
  ] as const;
  return (
    <AppShell>
      <main className="p-7 max-w-7xl mx-auto">
        <header className="flex flex-wrap justify-between items-end gap-4 mb-7">
          <div>
            <p className="text-muted text-sm m-0">Актуальная сводка качества</p>
            <h1 className="text-3xl font-medium m-0 mt-1">
              Добрый день{name ? `, ${name}` : ""}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/test-cases" className="btn-secondary no-underline">
              Тест-кейсы
            </Link>
            <Link href="/test-runs" className="btn no-underline">
              Новый запуск
            </Link>
          </div>
        </header>
        {error && (
          <p className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</p>
        )}
        <section className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {cards.map(([Icon, label, value, href, tone]) => (
            <Link
              href={href}
              className="card p-5 text-current no-underline group hover:-translate-y-0.5 transition-transform"
              key={label}
            >
              <div className="flex justify-between items-start">
                <span className="text-muted text-sm">{label}</span>
                <span className={`p-2.5 rounded-xl ${tone}`}>
                  <Icon size={19} />
                </span>
              </div>
              <div className="flex justify-between items-end mt-3">
                <strong className="text-3xl">{value}</strong>
                <ArrowUpRight
                  className="text-muted opacity-0 group-hover:opacity-100"
                  size={17}
                />
              </div>
            </Link>
          ))}
        </section>
        <section className="grid xl:grid-cols-[1.45fr_1fr] gap-5 mt-5">
          <article className="card p-6">
            <div className="flex justify-between">
              <div>
                <h2 className="m-0 text-xl font-medium">
                  Динамика тестирования
                </h2>
                <p className="text-muted text-sm mt-1">
                  Результаты за последние 14 дней
                </p>
              </div>
              <Activity className="text-brand" />
            </div>
            <div className="h-64 flex items-end gap-2 mt-6 border-b border-[var(--line)]">
              {days.map((d) => (
                <div
                  className="flex-1 h-full flex flex-col justify-end min-w-2"
                  key={d.date}
                  title={`${d.date}: ${d.total}`}
                >
                  <div
                    className="flex flex-col-reverse rounded-t-lg overflow-hidden bg-slate-100"
                    style={{
                      height: `${Math.max(d.total ? 8 : 2, (d.total / max) * 92)}%`,
                    }}
                  >
                    {d.total ? (
                      <>
                        <span
                          className="bg-emerald-500"
                          style={{ height: `${(d.passed / d.total) * 100}%` }}
                        />
                        <span
                          className="bg-rose-500"
                          style={{ height: `${(d.failed / d.total) * 100}%` }}
                        />
                        <span
                          className="bg-orange-400"
                          style={{ height: `${(d.blocked / d.total) * 100}%` }}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted mt-3">
              <span>
                {days[0]
                  ? new Date(days[0].date + "T00:00:00").toLocaleDateString(
                      "ru-RU",
                    )
                  : "—"}
              </span>
              <span className="flex gap-3">
                <i className="text-emerald-500">● успешно</i>
                <i className="text-rose-500">● провалено</i>
                <i className="text-orange-500">● блокировано</i>
              </span>
              <span>
                {days.at(-1)
                  ? new Date(
                      days.at(-1)!.date + "T00:00:00",
                    ).toLocaleDateString("ru-RU")
                  : "—"}
              </span>
            </div>
          </article>
          <article className="card p-6">
            <div className="flex justify-between">
              <div>
                <h2 className="m-0 text-xl font-medium">
                  Результаты выполнения
                </h2>
                <p className="text-muted text-sm mt-1">
                  По всем доступным запускам
                </p>
              </div>
              <strong className="text-3xl text-brand">
                {s?.metrics.passRate ?? 0}%
              </strong>
            </div>
            <div className="mt-7 h-3 rounded-full bg-slate-100 overflow-hidden flex">
              {results.map(([key, , color]) => (
                <span
                  key={key}
                  style={{
                    width: `${s?.metrics.executed ? ((s.results[key] ?? 0) / s.metrics.executed) * 100 : 0}%`,
                    background: color,
                  }}
                />
              ))}
            </div>
            <div className="space-y-3 mt-6">
              {results.map(([key, label, color]) => (
                <div
                  className="flex justify-between p-4 rounded-xl bg-slate-50"
                  key={key}
                >
                  <span>
                    <i
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                      style={{ background: color }}
                    />
                    {label}
                  </span>
                  <b>{s?.results[key] ?? 0}</b>
                </div>
              ))}
            </div>
          </article>
        </section>
        <article className="card p-6 mt-5">
          <div className="flex justify-between">
            <h2 className="m-0 text-xl font-medium">Последние тест-раны</h2>
            <Link href="/test-runs" className="text-brand text-sm no-underline">
              Все запуски →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
            {s?.recentRuns.map((r) => (
              <Link
                href={`/test-runs/${r.id}`}
                className="p-4 border border-[var(--line)] rounded-xl text-current no-underline hover:border-brand"
                key={r.id}
              >
                <span className="text-xs text-muted">
                  {r.project.code} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                </span>
                <b className="block mt-1 truncate">{r.name}</b>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${r.passRate}%` }}
                  />
                </div>
                <span className="text-xs text-muted">
                  {r.passRate}% · {r.total} кейсов
                </span>
              </Link>
            ))}
            {!s?.recentRuns.length && (
              <p className="text-muted col-span-full text-center py-8">
                Запусков пока нет
              </p>
            )}
          </div>
        </article>
      </main>
    </AppShell>
  );
}

type AdminStats = {
  organizations: number;
  users: number;
  activeUsers: number;
  blockedUsers: number;
  auditEvents: number;
  recentLogins: number;
  roles: Record<string, number>;
};
function AdminDashboard() {
  const [data, setData] = useState<AdminStats | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<AdminStats>("/system-admin/stats")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const cards = [
    [
      FolderKanban,
      "Организации",
      data?.organizations ?? "—",
      "/administration?tab=organizations",
      "Рабочие пространства",
    ],
    [
      ClipboardCheck,
      "Пользователи",
      data?.users ?? "—",
      "/administration?tab=users",
      `${data?.activeUsers ?? 0} активных`,
    ],
    [
      CheckCircle2,
      "Активные аккаунты",
      data?.activeUsers ?? "—",
      "/administration?tab=activity",
      `${data?.blockedUsers ?? 0} отключено`,
    ],
    [
      Activity,
      "События аудита",
      data?.auditEvents ?? "—",
      "/administration?tab=audit",
      `${data?.recentLogins ?? 0} входов за 7 дней`,
    ],
  ] as const;
  return (
    <AppShell>
      <main className="p-7 max-w-7xl mx-auto">
        <header className="mb-7">
          <p className="text-muted text-sm m-0">
            Состояние платформы и безопасность
          </p>
          <h1 className="text-3xl font-medium m-0 mt-1">
            Обзор администратора
          </h1>
        </header>
        {error && (
          <p className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</p>
        )}
        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map(([Icon, label, value, href, hint]) => (
            <Link
              href={href}
              className="card p-5 text-current no-underline group hover:-translate-y-0.5 transition-transform"
              key={label}
            >
              <div className="flex justify-between">
                <span className="text-muted text-sm">{label}</span>
                <Icon className="text-brand" size={20} />
              </div>
              <b className="text-3xl block mt-3">{value}</b>
              <span className="text-xs text-muted">{hint}</span>
              <ArrowUpRight
                className="float-right -mt-5 opacity-0 group-hover:opacity-100"
                size={16}
              />
            </Link>
          ))}
        </section>
        <section className="grid xl:grid-cols-[1.2fr_1fr] gap-5 mt-5">
          <article className="card p-6">
            <h2 className="font-medium mt-0">Состояние системы</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <div className="p-5 rounded-xl bg-emerald-50 text-emerald-800">
                <span className="flex items-center gap-2">
                  <i className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  API работает
                </span>
                <b className="block text-2xl mt-2">Online</b>
              </div>
              <div className="p-5 rounded-xl bg-blue-50 text-blue-800">
                <span className="flex items-center gap-2">
                  <i className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                  PostgreSQL
                </span>
                <b className="block text-2xl mt-2">Online</b>
              </div>
            </div>
          </article>
          <article className="card p-6">
            <h2 className="font-medium mt-0">Распределение ролей</h2>
            <div className="space-y-3 mt-5">
              {Object.entries(data?.roles ?? {}).map(([role, count]) => (
                <div
                  className="flex justify-between items-center p-3 rounded-xl bg-slate-50"
                  key={role}
                >
                  <span>{role.replaceAll("_", " ")}</span>
                  <b className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                    {count}
                  </b>
                </div>
              ))}
              {!Object.keys(data?.roles ?? {}).length && (
                <p className="text-muted">Данные загружаются…</p>
              )}
            </div>
          </article>
        </section>
      </main>
    </AppShell>
  );
}
export default function Dashboard() {
  return session.get()?.user.systemAdmin ? (
    <AdminDashboard />
  ) : (
    <WorkspaceDashboard />
  );
}
