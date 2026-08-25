"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/auth";
import { formatDuration } from "@/lib/duration";
type Step = {
  id: string;
  section: string;
  action: string;
  expectedResult: string;
};
type Case = {
  id: string;
  displayId: string;
  title: string;
  priority: string;
  type: string;
  status: string;
  previousStatus: string | null;
  regression: boolean;
  fixed: boolean;
  estimatedDuration: number;
  actualDuration: number;
  actualResult: string | null;
  comment: string | null;
  executedAt: string | null;
  executor: { firstName: string; lastName: string } | null;
  description: string | null;
  steps: Step[];
  defects: Array<{ displayId: string; title: string; status: string }>;
};
type Report = {
  plan: {
    name: string;
    description: string | null;
    environment: string | null;
    build: string | null;
    version: string | null;
    startsAt: string | null;
    endsAt: string | null;
    project: { code: string; name: string };
  };
  run: {
    id: string;
    name: string;
    createdAt: string;
    completedAt: string | null;
  } | null;
  comparison: {
    runId: string;
    runName: string;
    passRate: number | null;
    passRateDelta: number | null;
    regressions: number;
    fixed: number;
  } | null;
  metrics: {
    total: number;
    executed: number;
    progress: number;
    passRate: number;
    estimatedDuration: number;
    actualDuration: number;
    defects: number;
    PASSED: number;
    FAILED: number;
    BLOCKED: number;
    SKIPPED: number;
    RETEST: number;
    NOT_RUN: number;
  };
  cases: Case[];
  generatedAt: string;
};
const labels: { [k: string]: string } = {
    PASSED: "Успешно",
    FAILED: "Провалено",
    BLOCKED: "Заблокировано",
    SKIPPED: "Пропущено",
    RETEST: "Ретест",
    NOT_RUN: "Не выполнено",
  },
  colors: { [k: string]: string } = {
    PASSED: "text-green-700 bg-green-50",
    FAILED: "text-red-700 bg-red-50",
    BLOCKED: "text-amber-700 bg-amber-50",
    SKIPPED: "text-slate-700 bg-slate-100",
    RETEST: "text-violet-700 bg-violet-50",
    NOT_RUN: "text-slate-500 bg-slate-50",
  };
export default function PlanReport() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter();
  const [data, setData] = useState<Report | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<Report>(`/reports/test-plans/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);
  if (!data)
    return (
      <AppShell>
        <main className="p-10">{error || "Формирование отчёта…"}</main>
      </AppShell>
    );
  const m = data.metrics;
  return (
    <AppShell>
      <main className="p-7 max-w-7xl mx-auto print:p-0">
        <div className="flex justify-between mb-6 print:hidden">
          <button className="icon-btn" onClick={() => router.push("/reports")}>
            <ArrowLeft />
          </button>
          <div className="flex gap-2">
            <button
              className="btn-secondary flex gap-2"
              onClick={() => window.print()}
            >
              <Printer size={17} />
              Печать / PDF
            </button>
            <button
              className="btn-secondary flex gap-2"
              onClick={() => window.print()}
            >
              <Download size={17} />
              Экспорт PDF
            </button>
          </div>
        </div>
        <header className="card p-8 bg-gradient-to-br from-indigo-950 to-indigo-700 text-white">
          <p className="text-indigo-200 font-semibold tracking-widest">
            ОТЧЁТ О ТЕСТИРОВАНИИ
          </p>
          <h1 className="text-4xl mb-2">{data.plan.name}</h1>
          <p className="text-indigo-100">
            {data.plan.project.code} · {data.plan.project.name}
          </p>
          <div className="grid grid-cols-4 gap-4 mt-7 text-sm">
            <div>
              <span className="text-indigo-300">Версия / Build</span>
              <b className="block">
                {data.plan.version || "—"} / {data.plan.build || "—"}
              </b>
            </div>
            <div>
              <span className="text-indigo-300">Окружение</span>
              <b className="block">{data.plan.environment || "—"}</b>
            </div>
            <div>
              <span className="text-indigo-300">Тест-ран</span>
              <b className="block">{data.run?.name || "Не запускался"}</b>
            </div>
            <div>
              <span className="text-indigo-300">Сформирован</span>
              <b className="block">
                {new Date(data.generatedAt).toLocaleString("ru-RU")}
              </b>
            </div>
          </div>
        </header>
        {data.plan.description && (
          <section className="card p-6 mt-5">
            <h2 className="mt-0">Цель и область тестирования</h2>
            <p className="whitespace-pre-wrap mb-0">{data.plan.description}</p>
          </section>
        )}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[
            ["Выполнение", `${m.progress}%`, `${m.executed} из ${m.total}`],
            ["Успешность", `${m.passRate}%`, `${m.PASSED} успешно`],
            [
              "Затрачено",
              formatDuration(m.actualDuration),
              `Оценка ${formatDuration(m.estimatedDuration)}`,
            ],
            ["Провалено", m.FAILED, `${Math.round((m.FAILED / Math.max(1, m.executed)) * 100)}% выполненных`],
          ].map(([name, value, hint]) => (
            <article className="card p-5" key={name}>
              <span className="text-muted text-sm">{name}</span>
              <b className="block text-3xl mt-2">{value}</b>
              <span className="text-muted text-xs">{hint}</span>
            </article>
          ))}
        </section>
        {data.comparison && (
          <section className="card p-6 mt-5 bg-gradient-to-r from-indigo-50/80 to-cyan-50/60">
            <div className="flex flex-wrap justify-between gap-4 items-center">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted">Сравнение с прошлым запуском</span>
                <h2 className="m-0 mt-1">{data.comparison.runName}</h2>
              </div>
              <div className={`rounded-full px-4 py-2 font-semibold ${Number(data.comparison.passRateDelta) >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {Number(data.comparison.passRateDelta) >= 0 ? "↑" : "↓"} {Math.abs(data.comparison.passRateDelta ?? 0)}% успешности
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-white/80 p-4"><span className="text-xs text-muted">Прошлая успешность</span><b className="block text-2xl">{data.comparison.passRate ?? 0}%</b></div>
              <div className="rounded-xl bg-rose-50 p-4"><span className="text-xs text-rose-700">Новые регрессии</span><b className="block text-2xl text-rose-700">{data.comparison.regressions}</b></div>
              <div className="rounded-xl bg-emerald-50 p-4"><span className="text-xs text-emerald-700">Исправлено</span><b className="block text-2xl text-emerald-700">{data.comparison.fixed}</b></div>
            </div>
          </section>
        )}
        <section className="card p-6 mt-5">
          <h2 className="mt-0">Распределение результатов</h2>
          <div className="grid grid-cols-6 gap-3">
            {Object.keys(labels).map((k) => (
              <div className={`rounded-xl p-4 ${colors[k]}`} key={k}>
                <b className="text-2xl block">{(m as any)[k]}</b>
                <span className="text-xs">{labels[k]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2>Подробные результаты тест-кейсов</h2>
          <div className="space-y-4">
            {data.cases.map((c) => (
              <details
                className={`card overflow-hidden ${c.status === "FAILED" ? "border border-red-300" : ""}`}
                key={c.id}
                open={c.status === "FAILED" || c.status === "BLOCKED"}
              >
                <summary className="p-5 cursor-pointer list-none grid grid-cols-[1fr_140px_160px] gap-4 items-center">
                  <div>
                    <b className="text-brand">{c.displayId}</b>
                    <h3 className="m-0 mt-1">{c.title}</h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-center text-sm ${colors[c.status]}`}
                  >
                    {labels[c.status]}
                  </span>
                  <span className="text-xs text-center px-3 py-2 rounded-full bg-blue-50 text-blue-700 font-semibold">
                    Факт {formatDuration(c.actualDuration)} · План{" "}
                    {formatDuration(c.estimatedDuration)}
                  </span>
                </summary>
                <div className="p-5 border-t border-[var(--line)]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-5">
                    <div className="rounded-full bg-violet-50 text-violet-800 px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-muted">Тип</span>
                      <b className="block">{c.type}</b>
                    </div>
                    <div className="rounded-full bg-indigo-50 text-indigo-800 px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-muted">Приоритет</span>
                      <b className="block">{c.priority}</b>
                    </div>
                    <div className="rounded-full bg-blue-50 text-blue-800 px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-muted">Исполнитель</span>
                      <b className="block">
                        {c.executor
                          ? `${c.executor.firstName} ${c.executor.lastName}`
                          : "—"}
                      </b>
                    </div>
                    <div className="rounded-full bg-emerald-50 text-emerald-800 px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-muted">Выполнен</span>
                      <b className="block">
                        {c.executedAt
                          ? new Date(c.executedAt).toLocaleString("ru-RU")
                          : "—"}
                      </b>
                    </div>
                  </div>
                  {["PRECONDITION", "ACTION", "POSTCONDITION"].map(
                    (section) => (
                      <div className="mb-4" key={section}>
                        <h4>
                          {section === "PRECONDITION"
                            ? "Предусловия"
                            : section === "ACTION"
                              ? "Шаги"
                              : "Постусловия"}
                        </h4>
                        {c.steps
                          .filter((s) => s.section === section)
                          .map((s, i) => (
                            <div
                              className="grid grid-cols-[30px_1fr_1fr] gap-3 p-3 border-t border-[var(--line)] text-sm"
                              key={s.id}
                            >
                              <b>{i + 1}</b>
                              <span>{s.action}</span>
                              <span>{s.expectedResult}</span>
                            </div>
                          ))}
                      </div>
                    ),
                  )}
                  {(c.actualResult || c.comment) && (
                    <div
                      className={`p-4 rounded-lg ${c.status === "FAILED" ? "bg-red-50" : "bg-slate-50"}`}
                    >
                      <b>Фактический результат</b>
                      <p>{c.actualResult || "—"}</p>
                      {c.comment && (
                        <p className="text-muted">Комментарий: {c.comment}</p>
                      )}
                    </div>
                  )}
                  {c.defects.length > 0 && (
                    <div className="mt-4">
                      <b>Связанные дефекты</b>
                      {c.defects.map((d) => (
                        <p key={d.displayId} className="text-red-700">
                          {d.displayId} · {d.title} · {d.status}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
