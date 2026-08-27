"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Folder,
  FolderInput,
  FolderPlus,
  Library,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, apiBlob, apiUpload, session } from "@/lib/auth";
import { StepSectionEditor } from "@/components/step-section-editor";
import { formatDuration, parseDuration } from "@/lib/duration";

type Project = { id: string; code: string; name: string; status: string };
type FolderItem = {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
  _count: { testCases: number; children: number };
};
type CaseItem = {
  id: string;
  displayId: string;
  title: string;
  status: string;
  priority: string;
  severity: string;
  type: string;
  folderId: string | null;
  updatedAt: string;
};
type CasesResponse = {
  items: CaseItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};
type TemplateStep={action:string;expectedResult:string};
type TestCaseTemplate={id:string;name:string;title:string;description:string|null;status:string;priority:string;type:string;durationSeconds:number;variables:string[];steps:{preconditionSteps?:TemplateStep[];steps?:TemplateStep[];postconditionSteps?:TemplateStep[]}};
const labels: Record<string, string> = {
  DRAFT: "Черновик",
  READY: "Готов",
  NEEDS_UPDATE: "Требует обновления",
  OBSOLETE: "Устарел",
  ARCHIVED: "Архив",
  HIGHEST: "Самый высокий",
  HIGH: "Высокий",
  MEDIUM: "Средний",
  LOW: "Низкий",
  LOWEST: "Очень низкий",
};
const priorityColors: Record<string, string> = {
  HIGHEST: "bg-red-100 text-red-700 ring-red-200",
  HIGH: "bg-orange-100 text-orange-700 ring-orange-200",
  MEDIUM: "bg-amber-100 text-amber-800 ring-amber-200",
  LOW: "bg-blue-100 text-blue-700 ring-blue-200",
  LOWEST: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function TestCasesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderId, setFolderId] = useState("");
  const [projectTotal, setProjectTotal] = useState(0);
  const [cases, setCases] = useState<CasesResponse>({
    items: [],
    meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [formFolderId, setFormFolderId] = useState("");
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    title: "",
    description: "",
    status: "READY",
    priority: "MEDIUM",
    type: "FUNCTIONAL",
    preconditionSteps: [] as Array<{ action: string; expectedResult: string }>,
    steps: [] as Array<{ action: string; expectedResult: string }>,
    postconditionSteps: [] as Array<{ action: string; expectedResult: string }>,
  };
  const [form, setForm] = useState(emptyForm);
  const [durationInput, setDurationInput] = useState("");
  const [templates,setTemplates]=useState<TestCaseTemplate[]>([]),[templateId,setTemplateId]=useState(""),[templateDatasets,setTemplateDatasets]=useState<Array<Record<string,string>>>([{}]),[templateName,setTemplateName]=useState("");
  const [folderModal, setFolderModal] = useState(false);
  const [folderParentId, setFolderParentId] = useState<string | undefined>();
  const [folderName, setFolderName] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);
  const [moveModal, setMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");
  const role = session.get()?.user.role;
  const canEdit = [
    "ADMIN",
    "QA_LEAD",
    "QA_ENGINEER",
    "BUSINESS_ANALYST",
  ].includes(role ?? "");

  useEffect(() => {
    api<{ items: Project[] }>("/projects?page=1&pageSize=100&status=ACTIVE")
      .then((result) => {
        setProjects(result.items);
        setProjectId(result.items[0]?.id ?? "");
      })
      .catch((reason) => setError(reason.message));
  }, []);
  const loadTemplates=useCallback(()=>api<TestCaseTemplate[]>('/test-case-templates').then(setTemplates).catch(reason=>setError(reason.message)),[]);
  useEffect(()=>{if(canEdit)loadTemplates()},[canEdit,loadTemplates]);
  const loadFolders = useCallback(() => {
    if (!projectId) return;
    api<FolderItem[]>(`/projects/${projectId}/test-case-folders`)
      .then(setFolders)
      .catch((reason) => setError(reason.message));
  }, [projectId]);
  const loadProjectTotal = useCallback(() => {
    if (!projectId) return;
    api<CasesResponse>(`/projects/${projectId}/test-cases?page=1&pageSize=10`)
      .then((result) => setProjectTotal(result.meta.total))
      .catch((reason) => setError(reason.message));
  }, [projectId]);
  const loadCases = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (folderId) {
        params.set("folderId", folderId);
        params.set("includeNested", "true");
      }
      if (search.trim()) params.set("search", search.trim());
      setCases(
        await api<CasesResponse>(`/projects/${projectId}/test-cases?${params}`),
      );
      setSelected([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId, page, search]);
  useEffect(() => {
    setFolderId("");
    setPage(1);
    loadFolders();
    loadProjectTotal();
  }, [projectId, loadFolders, loadProjectTotal]);
  useEffect(() => {
    const timer = setTimeout(loadCases, 250);
    return () => clearTimeout(timer);
  }, [loadCases]);
  const children = useMemo(() => {
    const map = new Map<string, FolderItem[]>();
    folders.forEach((item) => {
      const key = item.parentId ?? "root";
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return map;
  }, [folders]);
  const currentProject = projects.find((item) => item.id === projectId);
  const folderPath = useCallback((targetId: string | null) => {
    if (!targetId) return [currentProject?.name ?? "Проект", "Без папки"];
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const path: string[] = [];
    let current = byId.get(targetId);
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return [currentProject?.name ?? "Проект", ...path];
  }, [folders, currentProject]);

  function addFolder(parentId?: string) {
    setFolderParentId(parentId);
    setFolderName("");
    setFolderModal(true);
  }
  async function createFolder(event: FormEvent) {
    event.preventDefault();
    if (!folderName.trim() || !projectId) return;
    setFolderSaving(true);
    setError("");
    try {
      await api(`/projects/${projectId}/test-case-folders`, {
        method: "POST",
        body: JSON.stringify({
          name: folderName.trim(),
          ...(folderParentId ? { parentId: folderParentId } : {}),
        }),
      });
      setFolderModal(false);
      await loadFolders();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Не удалось создать папку",
      );
    } finally {
      setFolderSaving(false);
    }
  }
  async function deleteFolder(item: FolderItem) {
    if (!confirm(`Удалить пустую папку «${item.name}»?`)) return;
    try {
      await api(`/projects/${projectId}/test-case-folders/${item.id}`, {
        method: "DELETE",
      });
      if (folderId === item.id) setFolderId("");
      await loadFolders();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка");
    }
  }
  async function createCase(event: FormEvent) {
    event.preventDefault();
    const durationSeconds = parseDuration(durationInput);
    if (durationSeconds === null) {
      setError("Продолжительность укажите в формате 1h 1m 1s, 1m 45s или 45s");
      return;
    }
    setSaving(true);
    try {
      if(templateId){await api(`/test-case-templates/${templateId}/instantiate-bulk`,{method:'POST',body:JSON.stringify({projectId,folderId:formFolderId||undefined,datasets:templateDatasets.map(values=>({values}))})});}
      else await api(`/projects/${projectId}/test-cases`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          durationSeconds,
          ...(formFolderId ? { folderId: formFolderId } : {}),
        }),
      });
      setModal(false);
      setForm(emptyForm);
      setDurationInput("");
      setTemplateId("");setTemplateDatasets([{}]);setTemplateName("");
      await loadCases();
      await Promise.all([loadFolders(), loadProjectTotal()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }
  function selectTemplate(id:string){setTemplateId(id);const template=templates.find(item=>item.id===id);if(!template){setTemplateDatasets([{}]);return}setForm({title:template.title,description:template.description??'',status:template.status,priority:template.priority,type:template.type,preconditionSteps:template.steps.preconditionSteps??[],steps:template.steps.steps??[],postconditionSteps:template.steps.postconditionSteps??[]});setDurationInput(formatDuration(template.durationSeconds));setTemplateDatasets([Object.fromEntries(template.variables.map(name=>[name,'']))]);}
  function addDataset(){if(templateDatasets.length>=100)return;const variables=templates.find(item=>item.id===templateId)?.variables??[];setTemplateDatasets(current=>[...current,Object.fromEntries(variables.map(name=>[name,'']))]);}
  function renderPreview(value:string,dataset:Record<string,string>){return value.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]{0,63})\s*\}\}/g,(_,name:string)=>dataset[name]||`{{${name}}}`)}
  async function downloadDatasetsTemplate(){if(!templateId)return;try{const blob=await apiBlob(`/test-case-templates/${templateId}/datasets-template`),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='template-datasets.xlsx';anchor.click();URL.revokeObjectURL(url);}catch(reason){setError(reason instanceof Error?reason.message:'Не удалось скачать XLSX')}}
  async function importDatasets(file?:File){if(!file||!templateId)return;setSaving(true);try{const body=new FormData();body.append('file',file);const result=await apiUpload<{datasets:Array<{values:Record<string,string>}>}>(`/test-case-templates/${templateId}/datasets-preview`,body);setTemplateDatasets(result.datasets.map(item=>item.values));}catch(reason){setError(reason instanceof Error?reason.message:'Не удалось прочитать XLSX')}finally{setSaving(false)}}
  async function saveTemplate(){const name=templateName.trim();if(name.length<2){setError('Укажите название шаблона');return}const durationSeconds=parseDuration(durationInput);if(durationSeconds===null){setError('Проверьте продолжительность');return}setSaving(true);try{await api('/test-case-templates',{method:'POST',body:JSON.stringify({...form,name,durationSeconds})});setTemplateName('');await loadTemplates();}catch(reason){setError(reason instanceof Error?reason.message:'Не удалось сохранить шаблон')}finally{setSaving(false)}}
  async function clone(item: CaseItem) {
    try {
      await api(`/test-cases/${item.id}/clone`, { method: "POST" });
      await loadCases();
      await Promise.all([loadFolders(), loadProjectTotal()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка");
    }
  }
  async function removeCase(item: CaseItem) {
    if (!confirm(`Удалить тест-кейс ${item.displayId} «${item.title}»? Оставшиеся номера будут пересчитаны.`)) return;
    try {
      await api(`/projects/${projectId}/test-cases/bulk`, {
        method: "POST",
        body: JSON.stringify({ ids: [item.id], action: "delete" }),
      });
      if (page === 1) await loadCases(); else setPage(1);
      await Promise.all([loadFolders(), loadProjectTotal()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка удаления");
    }
  }
  async function bulk(action: string) {
    if (!selected.length) return;
    if (
      action === "delete" &&
      !confirm(`Удалить тест-кейсы: ${selected.length}?`)
    )
      return;
    const body: Record<string, unknown> = { ids: selected, action };
    if (action === "move") {
      const target = prompt(
        "ID папки назначения (скопируйте из дерева через разработческий режим)",
      );
      if (!target) return;
      body.folderId = target;
    }
    try {
      await api(`/projects/${projectId}/test-cases/bulk`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await loadCases();
      await Promise.all([loadFolders(), loadProjectTotal()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка");
    }
  }

  async function moveSelected() {
    if (!selected.length || !moveTarget) return;
    try {
      await api(`/projects/${projectId}/test-cases/bulk`, {
        method: "POST",
        body: JSON.stringify({ ids: selected, action: "move", folderId: moveTarget }),
      });
      setMoveModal(false);
      await loadCases();
      await Promise.all([loadFolders(), loadProjectTotal()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка перемещения");
    }
  }
  async function bulkValue(action: "setPriority" | "setStatus", value: string) {
    if (!selected.length || !value) return;
    try {
      await api(`/projects/${projectId}/test-cases/bulk`, {
        method: "POST",
        body: JSON.stringify({
          ids: selected,
          action,
          ...(action === "setPriority" ? { priority: value } : { status: value }),
        }),
      });
      setSelected([]);
      await loadCases();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка массового изменения");
    }
  }

  function Tree({
    parent = "root",
    depth = 0,
  }: {
    parent?: string;
    depth?: number;
  }) {
    return (
      <>
        {(children.get(parent) ?? []).map((item) => (
          <div key={item.id}>
            <div
              className={`group flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer ${folderId === item.id ? "bg-indigo-50 text-brand" : "hover:bg-slate-50"}`}
              style={{ paddingLeft: 8 + depth * 16 }}
              onClick={() => {
                setFolderId(item.id);
                setPage(1);
              }}
            >
              <Folder size={16} />
              <span className="flex-1 truncate text-sm">{item.name}</span>
              <span className="text-xs text-muted">
                {item._count.testCases}
              </span>
              {canEdit && (
                <>
                  <button
                    className="icon-btn opacity-0 group-hover:opacity-100"
                    title="Вложенная папка"
                    onClick={(event) => {
                      event.stopPropagation();
                      addFolder(item.id);
                    }}
                  >
                    <FolderPlus size={14} />
                  </button>
                  <button
                    className="icon-btn opacity-0 group-hover:opacity-100 text-red-600"
                    title="Удалить"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteFolder(item);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
            <Tree parent={item.id} depth={depth + 1} />
          </div>
        ))}
      </>
    );
  }

  return (
    <AppShell>
      <main className="p-7 max-w-[1500px] mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <p className="text-muted text-sm m-0">
              Структурированное хранение тестов
            </p>
            <h1 className="text-3xl m-0 mt-1">Репозиторий тест-кейсов</h1>
            {currentProject && (
              <span className="inline-flex mt-3 px-3 py-1.5 rounded-full bg-indigo-50 text-brand text-sm font-semibold">
                {currentProject.code} — {currentProject.name}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-muted mb-1.5">
                Текущий проект
              </span>
              <select
                className="field min-w-64 py-2.5"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn-secondary flex gap-2 items-center mb-[1px]"
              disabled={!projectId}
              onClick={() => window.dispatchEvent(new CustomEvent("quality-hub-import-export"))}
            >
              <FileSpreadsheet size={18} />
              Импорт / экспорт
            </button>
            {canEdit && (
              <button
                className="btn flex gap-2 items-center mb-[1px]"
                disabled={!projectId}
                onClick={() => {
                  setFormFolderId(folderId);
                  setModal(true);
                }}
              >
                <Plus size={18} />
                Новый тест-кейс
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg flex justify-between">
            {error}
            <button
              className="border-0 bg-transparent"
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}
        <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-5">
          <aside className="card p-3 self-start">
            <div className="flex justify-between items-center px-2 py-2">
              <b className="text-sm">Разделы</b>
              {canEdit && (
                <button
                  className="icon-btn"
                  title="Новая папка"
                  onClick={() => addFolder()}
                >
                  <FolderPlus size={17} />
                </button>
              )}
            </div>
            <button
              className={`w-full border-0 text-left rounded-lg p-2 bg-transparent cursor-pointer ${!folderId ? "bg-indigo-50 text-brand" : ""}`}
              onClick={() => {
                setFolderId("");
                setPage(1);
              }}
            >
              Все тест-кейсы{" "}
              <span className="float-right text-xs text-muted">
                {projectTotal}
              </span>
            </button>
            <div className="mt-1">
              <Tree />
            </div>
          </aside>
          <section className="card overflow-hidden">
            <div className="p-4 border-b border-[var(--line)] flex gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-3 text-muted"
                  size={18}
                />
                <input
                  className="field pl-10"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Поиск по названию или номеру"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-3" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
                <span className="text-sm text-muted whitespace-nowrap">{page} / {cases.meta.totalPages}</span>
                <button className="btn-secondary px-3" disabled={page >= cases.meta.totalPages} onClick={() => setPage(page + 1)}>→</button>
              </div>
              {selected.length > 0 && (
                <>
                  <span className="self-center text-sm">
                    Выбрано: {selected.length}
                  </span>
                  <button
                    className="btn-secondary flex items-center gap-2"
                    onClick={() => {
                      setMoveTarget(folderId || folders[0]?.id || "");
                      setMoveModal(true);
                    }}
                  >
                    <FolderInput size={16} />
                    Переместить
                  </button>
                  <select
                    className="field !w-auto !py-2 text-sm"
                    defaultValue=""
                    onChange={(event) => {
                      void bulkValue("setPriority", event.target.value);
                      event.currentTarget.value = "";
                    }}
                  >
                    <option value="" disabled>Приоритет</option>
                    {Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                  <select
                    className="field !w-auto !py-2 text-sm"
                    defaultValue=""
                    onChange={(event) => {
                      void bulkValue("setStatus", event.target.value);
                      event.currentTarget.value = "";
                    }}
                  >
                    <option value="" disabled>Статус</option>
                    <option value="READY">Готов</option>
                    <option value="DRAFT">Черновик</option>
                    <option value="ARCHIVED">Архив</option>
                  </select>
                  <button
                    className="btn-secondary"
                    onClick={() => bulk("archive")}
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    className="btn-secondary text-red-600"
                    onClick={() => bulk("delete")}
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left bg-slate-50 text-muted">
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          cases.items.length > 0 &&
                          selected.length === cases.items.length
                        }
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? cases.items.map((item) => item.id)
                              : [],
                          )
                        }
                      />
                    </th>
                    <th className="p-4">ID / Название</th>
                    <th className="p-4">Статус</th>
                    <th className="p-4">Приоритет</th>
                    <th className="p-4">Тип</th>
                    <th className="p-4">Обновлён</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="p-10 text-center text-muted" colSpan={7}>
                        Загрузка…
                      </td>
                    </tr>
                  ) : (
                    cases.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-[var(--line)] hover:bg-slate-50/50 cursor-pointer"
                        onClick={() => router.push(`/test-cases/${item.id}`)}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selected.includes(item.id)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              setSelected((current) =>
                                event.target.checked
                                  ? [...current, item.id]
                                  : current.filter((id) => id !== item.id),
                              )
                            }
                          />
                        </td>
                        <td className="p-4">
                          <b className="text-brand text-xs">{item.displayId}</b>
                          <Link
                            href={`/test-cases/${item.id}`}
                            className="font-semibold mt-1 block text-inherit no-underline hover:text-brand"
                          >
                            {item.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[11px] text-muted">
                            {folderPath(item.folderId).map((part, index) => (
                              <span className="inline-flex items-center gap-1" key={`${part}-${index}`}>
                                {index > 0 && <span className="text-brand">→</span>}
                                {part}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-slate-100 rounded-full text-xs">
                            {labels[item.status] ?? item.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${priorityColors[item.priority] ?? priorityColors.LOWEST}`}
                          >
                            {labels[item.priority] ?? item.priority}
                          </span>
                        </td>
                        <td className="p-4">{item.type}</td>
                        <td className="p-4 text-muted">
                          {new Date(item.updatedAt).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="p-4">
                          {canEdit && (
                            <div className="flex items-center gap-1">
                            <button
                              className="icon-btn"
                              title="Клонировать"
                              onClick={(event) => {
                                event.stopPropagation();
                                clone(item);
                              }}
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              className="icon-btn text-red-600 ml-1"
                              title="Удалить"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeCase(item);
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && !cases.items.length && (
                    <tr>
                      <td colSpan={7} className="p-14 text-center">
                        <FileCheck2
                          className="mx-auto text-muted mb-3"
                          size={36}
                        />
                        <b>В этом разделе пока нет тест-кейсов</b>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[var(--line)] flex justify-between text-sm">
              <span>Всего: {cases.meta.total}</span>
              <div className="flex gap-3">
                <button
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Назад
                </button>
                <span className="self-center">
                  {page} / {cases.meta.totalPages}
                </span>
                <button
                  className="btn-secondary"
                  disabled={page >= cases.meta.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Далее
                </button>
              </div>
            </div>
          </section>
        </div>
        {modal && (
          <div className="fixed inset-0 bg-slate-950/50 grid place-items-center p-4 z-50">
            <form
              className="card p-6 w-full max-w-5xl max-h-[94vh] overflow-y-auto"
              onSubmit={createCase}
            >
              <div className="flex justify-between">
                <div>
                  <h2 className="m-0">Новый тест-кейс</h2>
                  <p className="text-muted text-sm">
                    Заполните основные данные и все необходимые группы шагов.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setModal(false)}
                >
                  <X />
                </button>
              </div>
              <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 mb-5">
                <div className="flex items-center gap-2 mb-3"><Library size={18} className="text-brand"/><b>Библиотека шаблонов</b></div>
                <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2"><select className="field" value={templateId} onChange={event=>selectTemplate(event.target.value)}><option value="">Создать без шаблона</option>{templates.map(template=><option key={template.id} value={template.id}>{template.name}</option>)}</select><input className="field" value={templateName} onChange={event=>setTemplateName(event.target.value)} placeholder="Название нового шаблона"/><button type="button" className="btn-secondary" disabled={saving} onClick={saveTemplate}>Сохранить форму</button></div>
                {templateId&&<div className="mt-4 overflow-x-auto rounded-xl border border-indigo-100 bg-white"><div className="flex flex-wrap justify-between items-center gap-2 p-3 border-b border-indigo-100"><div><b>Наборы данных</b><span className="text-xs text-muted ml-2">Будет создано кейсов: {templateDatasets.length}</span></div><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary py-2" onClick={downloadDatasetsTemplate}><Download size={15}/> Шаблон XLSX</button><label className="btn-secondary py-2 cursor-pointer"><Upload size={15}/> Загрузить XLSX<input type="file" accept=".xlsx" className="hidden" onChange={event=>{void importDatasets(event.target.files?.[0]);event.target.value=''}}/></label><button type="button" className="btn-secondary py-2" onClick={addDataset} disabled={templateDatasets.length>=100}><Plus size={15}/> Добавить строку</button></div></div><table className="w-full text-sm border-collapse"><thead><tr className="bg-slate-50"><th className="p-3 text-left w-12">#</th>{(templates.find(item=>item.id===templateId)?.variables??[]).map(name=><th className="p-3 text-left" key={name}>{name}</th>)}<th className="p-3 text-left">Предпросмотр</th><th className="w-12"/></tr></thead><tbody>{templateDatasets.map((dataset,rowIndex)=><tr className="border-t border-[var(--line)]" key={rowIndex}><td className="p-3 font-semibold text-brand">{rowIndex+1}</td>{Object.keys(dataset).map(name=><td className="p-2" key={name}><input className="field bg-white min-w-36" required value={dataset[name]} onChange={event=>setTemplateDatasets(current=>current.map((row,index)=>index===rowIndex?{...row,[name]:event.target.value}:row))}/></td>)}<td className="p-3 min-w-56"><b>{renderPreview(form.title,dataset)}</b></td><td className="p-2"><button type="button" className="icon-btn text-red-600" disabled={templateDatasets.length===1} onClick={()=>setTemplateDatasets(current=>current.filter((_,index)=>index!==rowIndex))}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>}
                <p className="text-xs text-muted mb-0 mt-2">Переменные задаются в формате <code>{'{{login}}'}</code>. При создании они заменятся введёнными значениями.</p>
              </section>
              <label className="block font-semibold text-sm mb-2">Папка</label>
              <select className="field mb-4" value={formFolderId} onChange={(event) => setFormFolderId(event.target.value)}>
                <option value="">Без папки</option>
                {folders.map((folder) => (
                  <option value={folder.id} key={folder.id}>{folderPath(folder.id).join(" → ")}</option>
                ))}
              </select>
              <label className="block font-semibold text-sm mb-2">
                Название *
              </label>
              <input
                className="field mb-4"
                required
                minLength={2}
                maxLength={255}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
              <label className="block font-semibold text-sm mb-2">
                Описание
              </label>
              <textarea
                className="field min-h-24 mb-4"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Статус
                  </label>
                  <select
                    className="field"
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                  >
                    <option value="READY">Готов</option>
                    <option value="DRAFT">Черновик</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Приоритет
                  </label>
                  <select
                    className="field"
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value })
                    }
                  >
                    <option value="HIGHEST">Самый высокий</option>
                    <option value="HIGH">Высокий</option>
                    <option value="MEDIUM">Средний</option>
                    <option value="LOW">Низкий</option>
                    <option value="LOWEST">Очень низкий</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Тип
                  </label>
                  <select
                    className="field"
                    value={form.type}
                    onChange={(event) =>
                      setForm({ ...form, type: event.target.value })
                    }
                  >
                    <option>FUNCTIONAL</option>
                    <option>UI</option>
                    <option>API</option>
                    <option>SECURITY</option>
                    <option>REGRESSION</option>
                    <option>SMOKE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Продолжительность
                  </label>
                  <input
                    className="field"
                    value={durationInput}
                    onChange={(event) => setDurationInput(event.target.value)}
                    placeholder="Например: 1m 45s"
                    inputMode="text"
                    title="Формат: 1h 1m 1s, 1m 45s или 45s"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <StepSectionEditor
                  title="Шаги предусловий"
                  hint="Что необходимо подготовить перед выполнением теста."
                  steps={form.preconditionSteps}
                  onChange={(preconditionSteps) =>
                    setForm({ ...form, preconditionSteps })
                  }
                />
                <StepSectionEditor
                  title="Основные шаги выполнения"
                  hint="Действия тестировщика и ожидаемые результаты."
                  steps={form.steps}
                  onChange={(steps) => setForm({ ...form, steps })}
                />
                <StepSectionEditor
                  title="Шаги постусловий"
                  hint="Проверки и действия после выполнения теста."
                  steps={form.postconditionSteps}
                  onChange={(postconditionSteps) =>
                    setForm({ ...form, postconditionSteps })
                  }
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModal(false)}
                >
                  Отмена
                </button>
                <button className="btn" disabled={saving}>
                  {saving ? "Создание…" : "Создать тест-кейс"}
                </button>
              </div>
            </form>
          </div>
        )}
        {folderModal && (
          <div
            className="fixed inset-0 bg-slate-950/50 grid place-items-center p-4 z-[60]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setFolderModal(false);
            }}
          >
            <form className="card p-6 w-full max-w-md" onSubmit={createFolder}>
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="m-0">
                    {folderParentId ? "Новый подраздел" : "Новый раздел"}
                  </h2>
                  <p className="text-sm text-muted m-0 mt-1">
                    Структурируйте тесты по модулям.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setFolderModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <label className="block text-sm font-semibold mb-2">
                Название
              </label>
              <input
                autoFocus
                required
                maxLength={255}
                className="field"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Например, Авторизация"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFolderModal(false)}
                >
                  Отмена
                </button>
                <button className="btn" disabled={folderSaving}>
                  {folderSaving ? "Создание…" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        )}
        {moveModal && (
          <div className="fixed inset-0 bg-slate-950/50 grid place-items-center p-4 z-[70]" onMouseDown={(event) => event.target === event.currentTarget && setMoveModal(false)}>
            <section className="card p-6 w-full max-w-md">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="m-0">Переместить тест-кейсы</h2>
                  <p className="text-sm text-muted mt-1 mb-0">Выбрано: {selected.length}</p>
                </div>
                <button className="icon-btn" onClick={() => setMoveModal(false)}><X size={18}/></button>
              </div>
              <label className="block text-sm font-semibold mb-2">Папка назначения</label>
              <select className="field" value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)}>
                <option value="" disabled>Выберите папку</option>
                {folders.map((folder) => (
                  <option value={folder.id} key={folder.id}>{folderPath(folder.id).join(" → ")}</option>
                ))}
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <button className="btn-secondary" onClick={() => setMoveModal(false)}>Отмена</button>
                <button className="btn flex items-center gap-2" disabled={!moveTarget} onClick={moveSelected}>
                  <FolderInput size={17}/>Переместить
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
