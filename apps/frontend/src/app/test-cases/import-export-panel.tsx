"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { api, apiBlob, apiUpload, session } from "@/lib/auth";

type Project = { id: string; code: string; name: string };
type FolderItem = { id: string; parentId: string | null; name: string };
type Result = { valid: number; invalid: number; imported: number; errors: Array<{ row: number; message: string }>; preview: Array<{ title: string; description: string; status: string; priority: string; type: string; durationSeconds: number; steps: string }> };

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export function ImportExportPanel() {
  const [open, setOpen] = useState(false), [projects, setProjects] = useState<Project[]>([]), [project, setProject] = useState("");
  const [folders, setFolders] = useState<FolderItem[]>([]), [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null), [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const canEdit = ["ADMIN", "QA_LEAD", "QA_ENGINEER", "BUSINESS_ANALYST"].includes(session.get()?.user.role ?? "");

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("quality-hub-import-export", show);
    return () => window.removeEventListener("quality-hub-import-export", show);
  }, []);
  useEffect(() => {
    if (open && !projects.length) api<{ items: Project[] }>("/projects?page=1&pageSize=100").then((response) => {
      setProjects(response.items); setProject(response.items[0]?.id ?? "");
    }).catch((reason) => setError(reason.message));
  }, [open, projects.length]);
  useEffect(() => {
    if (!open || !project) { setFolders([]); setFolder(""); return; }
    api<FolderItem[]>(`/projects/${project}/test-case-folders`).then((items) => {
      setFolders(items);
      setFolder((current) => items.some((item) => item.id === current) ? current : "");
    }).catch((reason) => setError(reason.message));
  }, [open, project]);

  async function upload(mode: "validate" | "import") {
    if (!file || !project) return;
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.append("file", file);
      const params = new URLSearchParams({ mode });
      if (folder) params.set("folderId", folder);
      const response = await apiUpload<Result>(`/projects/${project}/test-cases/import?${params}`, body);
      setResult(response);
      if (mode === "import") setTimeout(() => location.reload(), 800);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ошибка импорта"); }
    finally { setBusy(false); }
  }
  async function download(kind: "xlsx" | "csv" | "template") {
    if (!project) return;
    try {
      const path = kind === "template" ? `/projects/${project}/test-cases/import-template` : `/projects/${project}/test-cases/export?format=${kind}`;
      save(await apiBlob(path), kind === "template" ? "test-cases-template.xlsx" : `test-cases.${kind}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ошибка экспорта"); }
  }
  function folderPath(id: string) {
    const byId = new Map(folders.map((item) => [item.id, item]));
    const parts: string[] = [];
    let current = byId.get(id);
    while (current) { parts.unshift(current.name); current = current.parentId ? byId.get(current.parentId) : undefined; }
    return parts.join(" → ");
  }

  if (!open) return null;
  return <div className="fixed inset-0 bg-slate-950/50 z-50 grid place-items-center p-4" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
    <section className="card p-6 w-full max-w-3xl max-h-[92vh] overflow-auto">
      <div className="flex justify-between">
        <div><h2 className="m-0 flex items-center gap-2"><FileSpreadsheet className="text-brand"/>Импорт и экспорт тест-кейсов</h2><p className="text-muted text-sm">CSV и XLSX, до 1000 строк и 10 МБ.</p></div>
        <button className="icon-btn" onClick={() => setOpen(false)}><X/></button>
      </div>
      <label className="font-semibold text-sm block mb-2">Проект</label>
      <select className="field mb-5" value={project} onChange={(event) => { setProject(event.target.value); setResult(null); }}>
        {projects.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
      </select>
      <label className="font-semibold text-sm block mb-2">Папка назначения для импорта</label>
      <select className="field mb-5" value={folder} onChange={(event) => { setFolder(event.target.value); setResult(null); }}>
        <option value="">Без папки</option>
        {folders.map((item) => <option key={item.id} value={item.id}>{folderPath(item.id)}</option>)}
      </select>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button className="btn-secondary flex gap-2 justify-center" onClick={() => download("template")}><Download size={17}/>Шаблон XLSX</button>
        <button className="btn-secondary" onClick={() => download("xlsx")}>Экспорт XLSX</button>
        <button className="btn-secondary" onClick={() => download("csv")}>Экспорт CSV</button>
      </div>
      {canEdit && <div className="border-2 border-dashed border-[var(--line)] rounded-xl p-6 text-center">
        <Upload className="mx-auto text-brand"/><p className="font-semibold">Выберите CSV или XLSX</p>
        <input type="file" accept=".csv,.xlsx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setResult(null); }}/>
        {file && <p className="text-sm text-muted">{file.name} · {(file.size / 1024).toFixed(1)} КБ</p>}
        <button className="btn mt-3" disabled={!file || busy} onClick={() => upload("validate")}>{busy ? "Проверка…" : "Проверить файл"}</button>
      </div>}
      {error && <p className="p-3 bg-red-50 text-red-700 rounded">{error}</p>}
      {result && <div className="mt-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-green-50 rounded"><b className="text-2xl text-green-700">{result.valid}</b><span className="block text-sm">Валидных</span></div>
          <div className="p-4 bg-red-50 rounded"><b className="text-2xl text-red-700">{result.invalid}</b><span className="block text-sm">С ошибками</span></div>
          <div className="p-4 bg-indigo-50 rounded"><b className="text-2xl text-brand">{result.imported}</b><span className="block text-sm">Импортировано</span></div>
        </div>
        {result.errors.map((item) => <p className="text-red-700 text-sm" key={item.row}>Строка {item.row}: {item.message}</p>)}
        {result.preview.length > 0 && <div className="mt-4 border border-[var(--line)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-[var(--line)] flex justify-between gap-3">
            <b>Предпросмотр импорта</b>
            <span className="text-xs text-muted">Первые {result.preview.length} из {result.valid}</span>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm text-left text-xs text-muted">
                <tr><th className="p-3">#</th><th className="p-3">Название</th><th className="p-3">Статус</th><th className="p-3">Приоритет</th><th className="p-3">Тип</th><th className="p-3">Шаги</th></tr>
              </thead>
              <tbody>{result.preview.map((item, index) => <tr className="border-t border-[var(--line)]" key={`${item.title}-${index}`}>
                <td className="p-3 text-muted">{index + 2}</td>
                <td className="p-3 min-w-64"><b>{item.title}</b>{item.description && <span className="block text-xs text-muted line-clamp-1">{item.description}</span>}</td>
                <td className="p-3"><span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs">{item.status}</span></td>
                <td className="p-3">{item.priority}</td><td className="p-3">{item.type}</td>
                <td className="p-3 text-center">{item.steps?.split(/\r?\n/).filter(Boolean).length ?? 0}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>}
        {result.invalid === 0 && result.imported === 0 && <button className="btn w-full mt-4" disabled={busy} onClick={() => upload("import")}>Импортировать {result.valid} тест-кейсов</button>}
      </div>}
    </section>
  </div>;
}
