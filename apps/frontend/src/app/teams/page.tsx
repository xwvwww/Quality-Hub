"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, session } from "@/lib/auth";
type Member = {
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLoginAt?: string | null;
  };
};
type Org = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: Member[];
};
const roles: Record<string, string> = {
  ADMIN: "Администратор",
  QA_LEAD: "QA Lead",
  QA_ENGINEER: "QA Engineer",
  BUSINESS_ANALYST: "Бизнес-аналитик",
};
const empty = {
  email: "",
  username: "",
  firstName: "",
  lastName: "",
  password: "",
  role: "QA_ENGINEER",
};
export default function Organization() {
  const canManage = session.get()?.user.role === "QA_LEAD";
  const [org, setOrg] = useState<Org | null>(null),
    [error, setError] = useState(""),
    [modal, setModal] = useState(false),
    [form, setForm] = useState(empty),
    [saving, setSaving] = useState(false);
  const load = useCallback(
    () =>
      api<Org>("/profile/organization")
        .then(setOrg)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/users", { method: "POST", body: JSON.stringify(form) });
      setModal(false);
      setForm(empty);
      await load();
    } catch (x) {
      setError(
        x instanceof Error ? x.message : "Не удалось добавить участника",
      );
    } finally {
      setSaving(false);
    }
  }
  async function change(member: Member, patch: Record<string, unknown>) {
    try {
      await api(`/users/${member.user.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await load();
    } catch (x) {
      setError(
        x instanceof Error ? x.message : "Не удалось изменить участника",
      );
    }
  }
  async function remove(member: Member) {
    if (
      !confirm(
        `Удалить ${member.user.firstName} ${member.user.lastName} из организации?`,
      )
    )
      return;
    try {
      await api(`/users/${member.user.id}`, { method: "DELETE" });
      await load();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Не удалось удалить участника");
    }
  }
  return (
    <AppShell>
      <main className="p-7 max-w-6xl mx-auto">
        <header className="flex justify-between items-end gap-4 mb-6">
          <div>
            <p className="text-muted text-sm m-0">
              Рабочее пространство и коллеги
            </p>
            <h1 className="text-3xl font-medium mt-1 mb-0">Организация</h1>
          </div>
          {canManage && (
            <button
              className="btn flex gap-2 items-center"
              onClick={() => setModal(true)}
            >
              <Plus size={18} />
              Добавить участника
            </button>
          )}
        </header>
        {error && (
          <p className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</p>
        )}
        {org && (
          <>
            <section className="card p-6 mb-5">
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center">
                  <Building2 />
                </span>
                <div>
                  <span className="text-xs text-brand font-bold tracking-widest">
                    ОРГАНИЗАЦИЯ
                  </span>
                  <h2 className="text-2xl font-medium m-0">{org.name}</h2>
                  <code className="text-xs text-muted">{org.slug}</code>
                </div>
                <div className="ml-auto text-right">
                  <b className="text-2xl">{org.members.length}</b>
                  <span className="block text-xs text-muted">участников</span>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--line)] flex gap-2 text-sm text-muted">
                <CalendarDays size={17} />
                Создана {new Date(org.createdAt).toLocaleDateString("ru-RU")}
              </div>
            </section>
            <section className="card overflow-hidden">
              <div className="p-5 flex gap-3 items-center border-b border-[var(--line)]">
                <Users className="text-brand" />
                <div>
                  <h2 className="m-0 text-xl font-medium">Участники</h2>
                  <p className="m-0 text-xs text-muted">
                    {canManage
                      ? "Управление ролями и доступом"
                      : "Состав вашей организации"}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {org.members.map((m) => (
                  <article
                    className="p-4 grid grid-cols-[44px_minmax(180px,1fr)_minmax(220px,1fr)_180px_auto] gap-4 items-center"
                    key={m.user.id}
                  >
                    <span className="w-11 h-11 rounded-xl bg-indigo-50 text-brand grid place-items-center font-bold">
                      {m.user.firstName[0]}
                      {m.user.lastName[0]}
                    </span>
                    <div>
                      <b>
                        {m.user.firstName} {m.user.lastName}
                      </b>
                      <span className="block text-xs text-muted">
                        @{m.user.username}
                      </span>
                    </div>
                    <span className="flex gap-2 items-center text-sm text-muted">
                      <Mail size={15} />
                      {m.user.email}
                    </span>
                    {canManage ? (
                      <select
                        className="field py-2 text-sm"
                        value={m.role}
                        onChange={(e) => change(m, { role: e.target.value })}
                      >
                        {Object.entries(roles)
                          .filter(([key]) => key !== "ADMIN")
                          .map(([key, label]) => (
                            <option value={key} key={key}>
                              {label}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-brand text-xs font-semibold text-center">
                        {roles[m.role] ?? m.role}
                      </span>
                    )}
                    <div className="flex gap-1 justify-end">
                      {canManage && (
                        <>
                          <button
                            className={`icon-btn ${m.user.isActive ? "text-emerald-600" : "text-slate-500"}`}
                            title={
                              m.user.isActive ? "Отключить" : "Активировать"
                            }
                            onClick={() =>
                              change(m, { isActive: !m.user.isActive })
                            }
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn text-rose-600"
                            title="Удалить из организации"
                            onClick={() => remove(m)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                    {canManage && m.user.lastLoginAt && (
                      <span className="col-start-2 col-span-4 text-xs text-muted">
                        Последний вход:{" "}
                        {new Date(m.user.lastLoginAt).toLocaleString("ru-RU")}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
        {modal && (
          <div className="fixed inset-0 bg-slate-950/50 grid place-items-center p-4 z-50">
            <form className="card p-6 w-full max-w-2xl" onSubmit={create}>
              <div className="flex justify-between">
                <div>
                  <h2 className="m-0 font-medium">Новый участник</h2>
                  <p className="text-sm text-muted mt-1">
                    Создайте учётную запись в вашей организации.
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
              <div className="grid grid-cols-2 gap-4 mt-5">
                <input
                  className="field"
                  required
                  minLength={2}
                  placeholder="Имя"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
                <input
                  className="field"
                  required
                  minLength={2}
                  placeholder="Фамилия"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
                <input
                  className="field"
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="field"
                  required
                  minLength={3}
                  placeholder="Логин"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
                <input
                  className="field"
                  required
                  minLength={8}
                  type="password"
                  placeholder="Временный пароль"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <select
                  className="field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {Object.entries(roles)
                    .filter(([key]) => key !== "ADMIN")
                    .map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                </select>
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
                  {saving ? "Создание…" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </AppShell>
  );
}
