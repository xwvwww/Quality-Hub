"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Paperclip,
  Pause,
  Play,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, apiBlob, apiUpload, session } from "@/lib/auth";
import { formatDuration, parseDuration } from "@/lib/duration";

type Step = {
  id: string;
  section: "PRECONDITION" | "ACTION" | "POSTCONDITION";
  position: number;
  action: string;
  expectedResult: string;
};
type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};
type RunCase = {
  id: string;
  status: string;
  position: number;
  testCase: {
    id: string;
    displayId: string;
    title: string;
    priority: string;
    type: string;
    version: {
      durationSeconds: number;
      description: string | null;
      steps: Step[];
    };
  };
  results: Array<{
    status: string;
    actualResult: string | null;
    comment: string | null;
    durationSeconds: number;
    createdAt: string;
  }>;
  attachments: Attachment[];
};
type Summary = {
  total: number;
  executed: number;
  progress: number;
  PASSED: number;
  FAILED: number;
  BLOCKED: number;
  SKIPPED: number;
  RETEST: number;
  NOT_RUN: number;
};
type Overview = {
  id: string;
  name: string;
  build: string | null;
  environment: string | null;
  completedAt: string | null;
  project: { id: string; code: string; name: string };
  testPlan: { name: string };
  summary: Summary;
};
type Page = {
  items: RunCase[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};
const statuses = [
  ["PASSED", "Пройден", "#16a34a"],
  ["FAILED", "Провален", "#dc2626"],
  ["BLOCKED", "Заблокирован", "#d97706"],
  ["SKIPPED", "Пропущен", "#64748b"],
  ["RETEST", "Ретест", "#7c3aed"],
] as const;
const statusNames: Record<string, string> = {
  NOT_RUN: "Не выполнен",
  ...Object.fromEntries(statuses.map(([value, label]) => [value, label])),
};
const sectionNames = {
  PRECONDITION: "Предусловия",
  ACTION: "Основные шаги",
  POSTCONDITION: "Постусловия",
};

function ProtectedImage({ file }: { file: Attachment }) {
  const [src, setSrc] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let url = "";
    apiBlob(file.url)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => setFailed(true));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.url]);
  return failed ? (
    <div className="w-28 h-20 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 grid place-items-center p-2">
      Файл недоступен
    </div>
  ) : src ? (
    <a href={src} target="_blank" rel="noreferrer">
      <img
        src={src}
        alt={file.fileName}
        className="w-28 h-20 object-cover rounded-lg border border-[var(--line)]"
      />
    </a>
  ) : (
    <div className="w-28 h-20 bg-slate-100 animate-pulse rounded-lg" />
  );
}
function LocalPreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="relative">
      <img
        src={src}
        alt={file.name}
        className="w-28 h-20 object-cover rounded-lg border border-[var(--line)]"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-2 -top-2 w-6 h-6 border-0 bg-red-600 text-white rounded-full grid place-items-center"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function RunExecution() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter();
  const [run, setRun] = useState<Overview | null>(null),
    [data, setData] = useState<Page>({
      items: [],
      meta: { page: 1, pageSize: 50, total: 0, totalPages: 1 },
    }),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState("");
  const [actual, setActual] = useState(""),
    [comment, setComment] = useState(""),
    [duration, setDuration] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [files, setFiles] = useState<File[]>([]);
  const [elapsed, setElapsed] = useState(0),
    [timerRunning, setTimerRunning] = useState(true);
  const shortcutRef = useRef({ key: "", at: 0 });
  const canExecute = ["ADMIN", "QA_LEAD", "QA_ENGINEER"].includes(
    session.get()?.user.role ?? "",
  );
  const loadOverview = useCallback(
    () => api<Overview>(`/test-runs/${id}/overview`).then(setRun),
    [id],
  );
  const loadCases = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (search.trim()) query.set("search", search.trim());
    if (status) query.set("status", status);
    const value = await api<Page>(`/test-runs/${id}/cases?${query}`);
    setData(value);
    setSelected((current) =>
      value.items.some((item) => item.id === current)
        ? current
        : ((
            value.items.find((item) => item.status === "NOT_RUN") ??
            value.items[0]
          )?.id ?? ""),
    );
  }, [id, page, search, status]);
  useEffect(() => {
    loadOverview().catch((e) => setError(e.message));
  }, [loadOverview]);
  useEffect(() => {
    const timer = setTimeout(
      () => loadCases().catch((e) => setError(e.message)),
      250,
    );
    return () => clearTimeout(timer);
  }, [loadCases]);
  const item = useMemo(
    () => data.items.find((entry) => entry.id === selected) ?? null,
    [data.items, selected],
  );
  useEffect(() => {
    const latest = item?.results[0];
    setElapsed(latest?.durationSeconds ?? 0);
    setTimerRunning(!latest);
    setActual(latest?.actualResult ?? "");
    setComment(latest?.comment ?? "");
    setDuration(
      latest?.durationSeconds ? formatDuration(latest.durationSeconds) : "",
    );
    setFiles([]);
  }, [item?.id]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (timerRunning) setElapsed((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timerRunning]);
  async function save(nextStatus: string) {
    if (!item) return;
    const parsed = duration.trim() ? parseDuration(duration) : elapsed;
    const seconds = parsed === null ? null : Math.max(1, parsed);
    if (seconds === null) {
      setError("Длительность: например 1m 30s");
      return;
    }
    setSaving(true);
    setTimerRunning(false);
    setError("");
    try {
      await api(`/test-runs/${id}/cases/${item.id}/results/fast`, {
        method: "POST",
        body: JSON.stringify({
          status: nextStatus,
          actualResult: actual,
          comment,
          durationSeconds: seconds,
        }),
      });
      if (nextStatus === "FAILED" && files.length) {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        await apiUpload(`/test-runs/${id}/cases/${item.id}/attachments`, form);
      }
      setDuration(formatDuration(seconds));
      setFiles([]);
      await Promise.all([loadOverview(), loadCases()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка");
      setTimerRunning(true);
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (saving || (event.target as HTMLElement)?.matches("input,textarea,select")) return;
      const key = event.key.toLowerCase();
      const statusByKey: Record<string, string> = { p: "PASSED", f: "FAILED", b: "BLOCKED", s: "SKIPPED", r: "RETEST" };
      if (!statusByKey[key]) return;
      const now = Date.now();
      if (shortcutRef.current.key === key && now - shortcutRef.current.at <= 600) {
        event.preventDefault();
        shortcutRef.current = { key: "", at: 0 };
        void save(statusByKey[key]);
      } else shortcutRef.current = { key, at: now };
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [saving, item?.id, duration, elapsed, actual, comment, files]);
  if (!run)
    return (
      <AppShell>
        <div className="p-10">{error || "Загрузка…"}</div>
      </AppShell>
    );
  return (
    <AppShell>
      <main className="p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-wrap justify-between gap-4 mb-5">
          <div className="flex gap-3">
            <button
              className="icon-btn"
              onClick={() => router.push("/test-runs")}
            >
              <ArrowLeft />
            </button>
            <div>
              <p className="text-brand font-semibold text-sm m-0">
                {run.project.code} · {run.testPlan.name}
              </p>
              <h1 className="text-2xl m-0">{run.name}</h1>
            </div>
          </div>
          <div className="text-right">
            <b>
              {run.summary.executed}/{run.summary.total} ·{" "}
              {run.summary.progress}%
            </b>
            <div className="w-64 h-2 bg-slate-200 rounded mt-2">
              <div
                className="h-full bg-brand rounded"
                style={{ width: `${run.summary.progress}%` }}
              />
            </div>
          </div>
        </div>
        {error && <p className="p-3 bg-red-50 text-red-700 rounded">{error}</p>}
        <div className="grid xl:grid-cols-[290px_minmax(0,1fr)_330px] gap-5 items-start">
          <aside className="card p-3 self-start xl:sticky xl:top-20">
            <div className="relative mb-2">
              <Search size={17} className="absolute left-3 top-3 text-muted" />
              <input
                className="field pl-10"
                placeholder="Поиск кейса"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="field mb-2"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Все статусы</option>
              <option value="NOT_RUN">Не выполнен</option>
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {data.items.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry.id)}
                  className={`w-full border-0 text-left p-3 rounded-lg mb-1 cursor-pointer ${entry.id === selected ? "bg-indigo-50 text-brand" : "bg-transparent hover:bg-slate-50"}`}
                >
                  <div className="flex justify-between gap-2">
                    <b className="text-xs">{entry.testCase.displayId}</b>
                    <span className="text-[10px]">
                      {statusNames[entry.status] ?? entry.status}
                    </span>
                  </div>
                  <div className="text-sm mt-1 line-clamp-2">
                    {entry.testCase.title}
                  </div>
                </button>
              ))}
              {!data.items.length && (
                <p className="text-center text-muted py-8">Кейсы не найдены</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--line)] pt-3 mt-2">
              <button
                className="icon-btn"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft />
              </button>
              <span className="text-xs text-muted">
                {page} / {data.meta.totalPages} · {data.meta.total}
              </span>
              <button
                className="icon-btn"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight />
              </button>
            </div>
          </aside>
          <section className="space-y-4">
            {item ? (
              <>
                <article className="card p-6">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-brand font-semibold m-0">
                        {item.testCase.displayId}
                      </p>
                      <h2 className="text-2xl mt-1">{item.testCase.title}</h2>
                      <p className="text-muted">
                        {item.testCase.version?.description}
                      </p>
                    </div>
                    <div className="text-sm text-muted whitespace-nowrap">
                      <Clock3 size={16} className="inline" />{" "}
                      {formatDuration(
                        item.testCase.version?.durationSeconds ?? 0,
                      )}
                    </div>
                  </div>
                  {(["PRECONDITION", "ACTION", "POSTCONDITION"] as const).map(
                    (section) => (
                      <div key={section} className="mt-5">
                        <h3>{sectionNames[section]}</h3>
                        <div className="border border-[var(--line)] rounded-xl overflow-hidden">
                          <div className="hidden md:grid grid-cols-[44px_1fr_1fr] bg-slate-50 text-xs text-muted font-semibold">
                            <span className="p-3 text-center">#</span><span className="p-3 border-l border-[var(--line)]">Действие</span><span className="p-3 border-l border-[var(--line)]">Ожидаемый результат</span>
                          </div>
                          {item.testCase.version?.steps
                            .filter((step) => step.section === section)
                            .map((step, index) => (
                              <div
                                key={step.id}
                                className="grid md:grid-cols-[44px_1fr_1fr] border-t border-[var(--line)] first:border-t-0 md:first:border-t"
                              >
                                <b className="p-3 text-center text-brand bg-slate-50/70">{index + 1}</b>
                                <div className="p-3 md:border-l border-[var(--line)]">
                                  <span className="text-xs text-muted md:hidden">
                                    Действие
                                  </span>
                                  <p className="m-0">{step.action}</p>
                                </div>
                                <div className="p-3 md:border-l border-[var(--line)]">
                                  <span className="text-xs text-muted md:hidden">
                                    Ожидаемый результат
                                  </span>
                                  <p className="m-0">{step.expectedResult}</p>
                                </div>
                              </div>
                            ))}
                          {!item.testCase.version?.steps.some(
                            (step) => step.section === section,
                          ) && <p className="text-muted text-sm p-4 m-0">Нет шагов</p>}
                        </div>
                      </div>
                    ),
                  )}
                </article>
              </>
            ) : (
              <article className="card p-14 text-center text-muted">
                Выберите тест-кейс
              </article>
            )}
          </section>
          <aside className="card p-5 self-start xl:sticky xl:top-20 overflow-hidden">
            {item ? <>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
                <div><span className="text-xs text-muted">РЕЗУЛЬТАТ ТЕСТА</span><h3 className="m-0 mt-1">{statusNames[item.status] ?? item.status}</h3></div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{background:statuses.find(([value])=>value===item.status)?.[2]??'#64748b'}}>{item.status==='NOT_RUN'?'Ожидает':'Сохранён'}</span>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-4 my-4">
                <div className="flex justify-between items-center"><span className="text-xs text-muted">Затраченное время</span><Clock3 size={18} className="text-brand"/></div>
                <b className="font-mono text-3xl block mt-2">{formatDuration(elapsed)}</b>
                <div className="flex gap-2 mt-3">
                  <button className="icon-btn bg-white" type="button" onClick={()=>setTimerRunning(!timerRunning)}>{timerRunning?<Pause size={17}/>:<Play size={17}/>}</button>
                  <button className="icon-btn bg-white" type="button" onClick={()=>{setElapsed(0);setDuration('')}}><RotateCcw size={17}/></button>
                  <span className="text-xs text-muted self-center ml-auto">Оценка {formatDuration(item.testCase.version?.durationSeconds??0)}</span>
                </div>
              </div>

              {canExecute && <>
                <label className="text-xs font-semibold block mb-2">Фактический результат</label>
                <textarea className="field min-h-20 mb-3" placeholder="Что произошло при проверке" value={actual} onChange={(event)=>setActual(event.target.value)}/>
                <label className="text-xs font-semibold block mb-2">Комментарий</label>
                <textarea className="field min-h-16 mb-3" placeholder="Дополнительные детали" value={comment} onChange={(event)=>setComment(event.target.value)}/>
                <label className="text-xs font-semibold block mb-2">Фактическое время</label>
                <input className="field mb-4" placeholder={formatDuration(elapsed)||'1m 30s'} value={duration} onChange={(event)=>setDuration(event.target.value)}/>

                <div className="grid gap-2">
                  {statuses.map(([value,label,color])=><button type="button" disabled={saving} key={value} onClick={()=>save(value)} className="border border-white/20 rounded-xl px-4 py-3 text-white font-semibold cursor-pointer shadow-md hover:brightness-105 transition flex justify-between" style={{background:color}}><span>{label}</span><span className="opacity-70">{value==='PASSED'?'P':value==='FAILED'?'F':value==='BLOCKED'?'B':value==='SKIPPED'?'S':'R'}</span></button>)}
                </div>

                <label className="mt-4 border border-dashed border-indigo-300 bg-indigo-50/60 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer text-center">
                  <Paperclip className="text-brand"/><b className="text-sm">Добавить вложения</b><span className="text-xs text-muted">PNG, JPG или WebP · до 10 МБ</span>
                  <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event)=>{const chosen=Array.from(event.target.files??[]);if(chosen.some((file)=>file.size>10*1024*1024)){setError('Максимальный размер — 10 МБ');return}setFiles((current)=>[...current,...chosen].slice(0,5))}}/>
                </label>
                {files.length>0&&<div className="flex flex-wrap gap-3 mt-3">{files.map((file,index)=><LocalPreview key={`${file.name}-${index}`} file={file} onRemove={()=>setFiles((current)=>current.filter((_,position)=>position!==index))}/>)}</div>}
              </>}

              {item.results[0]&&<div className="mt-5 pt-4 border-t border-[var(--line)] text-sm"><div className="flex justify-between"><span className="text-muted">Последний результат</span><b>{formatDuration(item.results[0].durationSeconds??0)}</b></div><span className="text-xs text-muted">{new Date(item.results[0].createdAt).toLocaleString('ru-RU')}</span></div>}
              {item.attachments.length>0&&<div className="mt-4"><b className="text-sm">Вложения</b><div className="flex flex-wrap gap-2 mt-2">{item.attachments.map((file)=><div key={file.id}><ProtectedImage file={file}/></div>)}</div></div>}
            </>:<p className="text-muted text-center p-6">Выберите тест-кейс</p>}
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
