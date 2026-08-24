"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, session } from "@/lib/auth";

type Project = { id: string; code: string; name: string };
type Plan = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  environment: string | null;
  build: string | null;
  version: string | null;
  createdAt: string;
  project: Project;
  _count: { cases: number; runs: number };
};
type Response = {
  items: Plan[];
  meta: { total: number; page: number; totalPages: number };
};
const empty = {
  projectId: "",
  name: "",
  description: "",
  startsAt: "",
  endsAt: "",
  environment: "",
  build: "",
  version: "",
};

export default function TestPlansPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [data, setData] = useState<Response>({
    items: [],
    meta: { total: 0, page: 1, totalPages: 1 },
  });
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const role = session.get()?.user.role;
  const canManage = role === "ADMIN" || role === "QA_LEAD";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (projectId) params.set("projectId", projectId);
      setData(await api<Response>(`/test-plans?${params}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [search, projectId]);
  useEffect(() => {
    api<{ items: Project[] }>(
      "/projects?page=1&pageSize=100&status=ACTIVE",
    ).then((result) => {
      setProjects(result.items);
      if (!form.projectId && result.items[0])
        setForm((current) => ({ ...current, projectId: result.items[0].id }));
    });
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  function openCreate() {
    setEditing(null);
    setForm({ ...empty, projectId: projects[0]?.id ?? "" });
    setModal(true);
  }
  function openEdit(plan: Plan) {
    setEditing(plan);
    setForm({
      projectId: plan.projectId,
      name: plan.name,
      description: plan.description ?? "",
      startsAt: plan.startsAt?.slice(0, 10) ?? "",
      endsAt: plan.endsAt?.slice(0, 10) ?? "",
      environment: plan.environment ?? "",
      build: plan.build ?? "",
      version: plan.version ?? "",
    });
    setModal(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(editing ? `/test-plans/${editing.id}` : "/test-plans", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
        }),
      });
      setModal(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }
  async function remove(plan: Plan) {
    if (!confirm(`Удалить тест-план «${plan.name}»?`)) return;
    try {
      await api(`/test-plans/${plan.id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка удаления");
    }
  }
  return (
    <AppShell>
      <main className="p-7 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-muted text-sm m-0">
              Организация объёма тестирования
            </p>
            <h1 className="text-3xl m-0 mt-1">Тест-планы</h1>
          </div>
          {canManage && (
            <button
              className="btn flex gap-2 items-center"
              onClick={openCreate}
            >
              <Plus size={18} />
              Создать план
            </button>
          )}
        </div>
        {error && (
          <p className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</p>
        )}
        <section className="card overflow-hidden">
          <div className="p-4 border-b border-[var(--line)] flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-3 text-muted" />
              <input
                className="field pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск тест-плана"
              />
            </div>
            <select
              className="field w-64"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">Все проекты</option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left bg-slate-50 text-muted">
                  <th className="p-4">План</th>
                  <th className="p-4">Проект</th>
                  <th className="p-4">Период</th>
                  <th className="p-4">Окружение / Build</th>
                  <th className="p-4 text-center">Кейсы</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center">
                      Загрузка…
                    </td>
                  </tr>
                ) : (
                  data.items.map((plan) => (
                    <tr
                      key={plan.id}
                      className="border-t border-[var(--line)] hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <Link
                          className="font-semibold text-brand no-underline"
                          href={`/test-plans/${plan.id}`}
                        >
                          {plan.name}
                        </Link>
                        <div className="text-xs text-muted mt-1">
                          {plan.description || "Без описания"}
                        </div>
                      </td>
                      <td className="p-4">
                        {plan.project.code} — {plan.project.name}
                      </td>
                      <td className="p-4">
                        <CalendarDays size={15} className="inline mr-1" />
                        {plan.startsAt
                          ? new Date(plan.startsAt).toLocaleDateString("ru-RU")
                          : "—"}{" "}
                        —{" "}
                        {plan.endsAt
                          ? new Date(plan.endsAt).toLocaleDateString("ru-RU")
                          : "—"}
                      </td>
                      <td className="p-4">
                        {plan.environment || "—"}
                        <div className="text-xs text-muted">
                          {plan.build || "Без build"} ·{" "}
                          {plan.version || "Без версии"}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold">
                        {plan._count.cases}
                      </td>
                      <td className="p-4">
                        <div className="flex">
                          {canManage && (
                            <button
                              className="icon-btn"
                              onClick={() => openEdit(plan)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              className="icon-btn text-red-600"
                              onClick={() => remove(plan)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && !data.items.length && (
                  <tr>
                    <td colSpan={6} className="p-14 text-center">
                      <FileText size={38} className="mx-auto text-muted mb-3" />
                      <b>Тест-планы не найдены</b>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-[var(--line)] text-sm text-muted">
            Всего планов: {data.meta.total}
          </div>
        </section>
        {modal && (
          <div className="fixed inset-0 bg-slate-950/50 grid place-items-center p-4 z-50">
            <form className="card p-6 w-full max-w-2xl" onSubmit={submit}>
              <div className="flex justify-between mb-5">
                <div>
                  <h2 className="m-0">
                    {editing ? "Редактировать тест-план" : "Новый тест-план"}
                  </h2>
                  <p className="text-muted text-sm mt-1">
                    Параметры будущего тестового запуска.
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
              <label className="block text-sm font-semibold mb-2">
                Проект *
              </label>
              <select
                className="field mb-4"
                required
                disabled={!!editing}
                value={form.projectId}
                onChange={(event) =>
                  setForm({ ...form, projectId: event.target.value })
                }
              >
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
              <label className="block text-sm font-semibold mb-2">
                Название *
              </label>
              <input
                className="field mb-4"
                required
                minLength={2}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              <label className="block text-sm font-semibold mb-2">
                Описание
              </label>
              <textarea
                className="field min-h-24 mb-4"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Дата начала
                  </label>
                  <input
                    className="field"
                    type="date"
                    value={form.startsAt}
                    onChange={(event) =>
                      setForm({ ...form, startsAt: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Дата окончания
                  </label>
                  <input
                    className="field"
                    type="date"
                    value={form.endsAt}
                    onChange={(event) =>
                      setForm({ ...form, endsAt: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  className="field"
                  placeholder="Environment"
                  value={form.environment}
                  onChange={(event) =>
                    setForm({ ...form, environment: event.target.value })
                  }
                />
                <input
                  className="field"
                  placeholder="Build"
                  value={form.build}
                  onChange={(event) =>
                    setForm({ ...form, build: event.target.value })
                  }
                />
                <input
                  className="field"
                  placeholder="Version"
                  value={form.version}
                  onChange={(event) =>
                    setForm({ ...form, version: event.target.value })
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
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </AppShell>
  );
}
