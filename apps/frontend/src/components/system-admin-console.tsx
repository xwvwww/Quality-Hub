"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  Database,
  KeyRound,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "./app-shell";
import { api } from "@/lib/auth";
import { notify } from "./toast-viewport";
import { AuditChanges } from "./audit-changes";
type Tab =
  | "overview"
  | "organizations"
  | "users"
  | "activity"
  | "audit"
  | "profile";
type Stats = {
  organizations: number;
  users: number;
  activeUsers: number;
  blockedUsers: number;
  auditEvents: number;
  recentLogins: number;
  roles: Record<string, number>;
};
type Org = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: { members: number; projects: number; auditLogs: number };
};
type User = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isSystemAdmin: boolean;
  lastLoginAt: string | null;
  memberships: Array<{
    role: string;
    organization: { id: string; name: string };
  }>;
};
type Audit = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  user: { firstName: string; lastName: string; email: string } | null;
  organization: { name: string } | null;
};
type Detail = Org & {
  members: Array<{ role: string; user: User }>;
  projects: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    createdAt: string;
    _count: { testCases: number; testPlans: number; testRuns: number };
  }>;
};
type Profile = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  lastLoginAt: string | null;
};
type Session = {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
};
const tabs: Array<[Tab, typeof LayoutDashboard, string]> = [
  ["overview", LayoutDashboard, "Обзор"],
  ["organizations", Building2, "Организации"],
  ["users", Users, "Пользователи"],
  ["activity", Activity, "Активность"],
  ["audit", ShieldCheck, "Журнал админки"],
  ["profile", UserCheck, "Мой профиль"],
];
const emptyOrg = { name: "", slug: "" };
const emptyUser = {
  email: "",
  username: "",
  firstName: "",
  lastName: "",
  password: "",
  organizationId: "",
  role: "QA_ENGINEER",
};
export function SystemAdminConsole() {
  const [tab, setTab] = useState<Tab>("overview"),
    [stats, setStats] = useState<Stats | null>(null),
    [orgs, setOrgs] = useState<Org[]>([]),
    [users, setUsers] = useState<User[]>([]),
    [audit, setAudit] = useState<Audit[]>([]),
    [adminAudit, setAdminAudit] = useState<Audit[]>([]),
    [selected, setSelected] = useState<Detail | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [sessions, setSessions] = useState<Session[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [orgModal, setOrgModal] = useState(false),
    [userModal, setUserModal] = useState(false),
    [orgForm, setOrgForm] = useState(emptyOrg),
    [userForm, setUserForm] = useState(emptyUser),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const [s, o, u, a, aa, p, se] = await Promise.all([
        api<Stats>("/system-admin/stats"),
        api<Org[]>("/system-admin/organizations"),
        api<User[]>("/system-admin/users"),
        api<Audit[]>("/system-admin/audit"),
        api<Audit[]>("/system-admin/admin-audit"),
        api<Profile>("/system-admin/profile"),
        api<Session[]>("/system-admin/sessions"),
      ]);
      setStats(s);
      setOrgs(o);
      setUsers(u);
      setAudit(a);
      setAdminAudit(aa);
      setProfile(p);
      setSessions(se);
      setUserForm((v) => ({
        ...v,
        organizationId: v.organizationId || o[0]?.id || "",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить админку");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const filteredUsers = useMemo(
    () =>
      users.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email} ${u.username}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [users, search],
  );
  async function openOrg(org: Org) {
    setSelected(await api<Detail>(`/system-admin/organizations/${org.id}`));
  }
  async function createOrg(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/system-admin/organizations", {
        method: "POST",
        body: JSON.stringify(orgForm),
      });
      setOrgModal(false);
      setOrgForm(emptyOrg);
      await load();
      notify("Организация создана");
    } catch (x) {
      setError(x instanceof Error ? x.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }
  async function createUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/system-admin/users", {
        method: "POST",
        body: JSON.stringify(userForm),
      });
      setUserModal(false);
      setUserForm(emptyUser);
      await load();
      notify("Пользователь создан");
    } catch (x) {
      setError(x instanceof Error ? x.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }
  async function disableOrg(o: Org) {
    if (!confirm(`Отключить организацию «${o.name}»?`)) return;
    await api(`/system-admin/organizations/${o.id}`, { method: "DELETE" });
    await load();
  }
  async function toggleUser(u: User) {
    await api(`/system-admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    await load();
  }
  async function resetPassword(u: User) {
    const password = prompt(`Новый пароль для ${u.email}`);
    if (!password) return;
    await api(`/system-admin/users/${u.id}/password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    notify("Пароль изменён, сессии завершены");
  }
  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    await api("/system-admin/profile", {
      method: "PATCH",
      body: JSON.stringify({
        firstName: profile.firstName,
        lastName: profile.lastName,
      }),
    });
    notify("Профиль сохранён");
  }
  async function revoke(s: Session) {
    await api(`/system-admin/sessions/${s.id}`, { method: "DELETE" });
    setSessions((v) => v.filter((x) => x.id !== s.id));
    notify("Сессия завершена");
  }
  return (
    <AppShell>
      <main className="system-admin-console p-7 max-w-7xl mx-auto">
        <header className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <p className="text-muted text-sm m-0">
              Управление платформой Quality Hub
            </p>
            <h1 className="text-3xl font-medium m-0 mt-1">Администрирование</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map(([key, Icon, label]) => (
              <button
                className={tab === key ? "btn" : "btn-secondary"}
                onClick={() => setTab(key)}
                key={key}
              >
                <Icon size={16} className="inline mr-2" />
                {label}
              </button>
            ))}
          </div>
        </header>
        {error && (
          <p className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</p>
        )}
        {tab === "overview" && (
          <>
            <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                [
                  Building2,
                  "Организации",
                  stats?.organizations ?? "—",
                  "organizations",
                ],
                [Users, "Пользователи", stats?.users ?? "—", "users"],
                [UserCheck, "Активные", stats?.activeUsers ?? "—", "activity"],
                [
                  ShieldCheck,
                  "События аудита",
                  stats?.auditEvents ?? "—",
                  "audit",
                ],
              ].map(([Icon, label, value, to]: any) => (
                <button
                  className="card p-5 text-left border-0 cursor-pointer"
                  onClick={() => setTab(to)}
                  key={label}
                >
                  <div className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <Icon className="text-brand" />
                  </div>
                  <b className="text-3xl block mt-3">{value}</b>
                </button>
              ))}
            </section>
            <section className="grid xl:grid-cols-2 gap-5 mt-5">
              <article className="card p-6">
                <h2 className="font-medium mt-0">Состояние платформы</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-5 bg-emerald-50 text-emerald-800 rounded-xl">
                    <Activity />
                    <b className="block mt-3">API Online</b>
                  </div>
                  <div className="p-5 bg-blue-50 text-blue-800 rounded-xl">
                    <Database />
                    <b className="block mt-3">PostgreSQL Online</b>
                  </div>
                </div>
              </article>
              <article className="card p-6">
                <h2 className="font-medium mt-0">Роли пользователей</h2>
                {Object.entries(stats?.roles ?? {}).map(([r, n]) => (
                  <div
                    className="flex justify-between p-3 border-t border-[var(--line)]"
                    key={r}
                  >
                    <span>{r.replaceAll("_", " ")}</span>
                    <b>{n}</b>
                  </div>
                ))}
              </article>
            </section>
          </>
        )}
        {tab === "organizations" && (
          <>
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="font-medium m-0">Организации</h2>
                <p className="text-sm text-muted mt-1">
                  Участники, проекты и системная активность
                </p>
              </div>
              <button className="btn" onClick={() => setOrgModal(true)}>
                <Plus size={17} className="inline mr-2" />
                Создать
              </button>
            </div>
            <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orgs.map((o) => (
                <article
                  className="card p-5 cursor-pointer hover:border-brand border border-transparent"
                  onClick={() => openOrg(o)}
                  key={o.id}
                >
                  <div className="flex justify-between">
                    <span className="p-2.5 bg-indigo-50 text-brand rounded-xl">
                      <Building2 />
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs h-fit ${o.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {o.isActive ? "Активна" : "Отключена"}
                    </span>
                  </div>
                  <h3 className="font-medium mb-1">{o.name}</h3>
                  <code className="text-xs text-muted">{o.slug}</code>
                  <div className="grid grid-cols-3 gap-2 mt-5 text-center text-xs">
                    <div>
                      <b className="block text-lg">{o._count.members}</b>людей
                    </div>
                    <div>
                      <b className="block text-lg">{o._count.projects}</b>
                      проектов
                    </div>
                    <div>
                      <b className="block text-lg">{o._count.auditLogs}</b>
                      событий
                    </div>
                  </div>
                  <button
                    className="icon-btn text-rose-600 mt-4 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      void disableOrg(o);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </section>
            {selected && (
              <section className="card p-6 mt-5">
                <div className="flex justify-between">
                  <div>
                    <h2 className="font-medium m-0">{selected.name}</h2>
                    <p className="text-muted text-sm">
                      Подробности организации
                    </p>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => setSelected(null)}
                  >
                    <X />
                  </button>
                </div>
                <h3 className="font-medium">Проекты</h3>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th>Код</th>
                        <th>Название</th>
                        <th>Статус</th>
                        <th>Кейсы</th>
                        <th>Планы</th>
                        <th>Запуски</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.projects.map((p) => (
                        <tr key={p.id}>
                          <td>{p.code}</td>
                          <td>{p.name}</td>
                          <td>{p.status}</td>
                          <td>{p._count.testCases}</td>
                          <td>{p._count.testPlans}</td>
                          <td>{p._count.testRuns}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 className="font-medium mt-6">Участники</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {selected.members.map((m) => (
                    <div className="p-3 bg-slate-50 rounded-xl" key={m.user.id}>
                      <b>
                        {m.user.firstName} {m.user.lastName}
                      </b>
                      <span className="block text-xs text-muted">
                        {m.role} · {m.user.email}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {tab === "users" && (
          <>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-3 text-muted"
                  size={18}
                />
                <input
                  className="field pl-10"
                  placeholder="Поиск пользователя"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="btn" onClick={() => setUserModal(true)}>
                <Plus size={17} className="inline mr-2" />
                Пользователь
              </button>
            </div>
            <section className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Организация</th>
                    <th>Роль</th>
                    <th>Последний вход</th>
                    <th>Статус</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <b>
                          {u.firstName} {u.lastName}
                        </b>
                        <span className="block text-xs text-muted">
                          {u.email} · @{u.username}
                        </span>
                      </td>
                      <td>{u.memberships[0]?.organization.name ?? "—"}</td>
                      <td>
                        {u.isSystemAdmin
                          ? "SYSTEM ADMIN"
                          : (u.memberships[0]?.role ?? "—")}
                      </td>
                      <td>
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString("ru-RU")
                          : "Не входил"}
                      </td>
                      <td>
                        <span
                          className={
                            u.isActive ? "text-emerald-600" : "text-rose-600"
                          }
                        >
                          ● {u.isActive ? "Активен" : "Отключён"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          onClick={() => resetPassword(u)}
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          className="icon-btn"
                          disabled={u.isSystemAdmin}
                          onClick={() => toggleUser(u)}
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
        {(tab === "activity" || tab === "audit") && (
          <AuditTable items={tab === "activity" ? audit : adminAudit} />
        )}{" "}
        {tab === "profile" && profile && (
          <section className="grid xl:grid-cols-[1fr_1.35fr] gap-5">
            <form className="card p-6" onSubmit={saveProfile}>
              <h2 className="font-medium mt-0">Личные данные</h2>
              <label className="text-sm">Имя</label>
              <input
                className="field mt-2 mb-4"
                value={profile.firstName}
                onChange={(e) =>
                  setProfile({ ...profile, firstName: e.target.value })
                }
              />
              <label className="text-sm">Фамилия</label>
              <input
                className="field mt-2 mb-4"
                value={profile.lastName}
                onChange={(e) =>
                  setProfile({ ...profile, lastName: e.target.value })
                }
              />
              <div className="p-3 bg-slate-50 rounded-xl text-sm mb-4">
                {profile.email} · @{profile.username}
              </div>
              <button className="btn w-full">Сохранить</button>
            </form>
            <article className="card p-6">
              <h2 className="font-medium mt-0">Активные сессии</h2>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Состояние</th>
                      <th>IP</th>
                      <th>Создана</th>
                      <th>Истекает</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={s.id}>
                        <td>
                          <span className="text-emerald-600">
                            ● {i === 0 ? "Текущая" : "Активная"}
                          </span>
                        </td>
                        <td>
                          <code>{s.ipAddress ?? "Не определён"}</code>
                        </td>
                        <td>{new Date(s.createdAt).toLocaleString("ru-RU")}</td>
                        <td>{new Date(s.expiresAt).toLocaleString("ru-RU")}</td>
                        <td>
                          <button
                            className="icon-btn text-rose-600"
                            onClick={() => revoke(s)}
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}
        {orgModal && (
          <Modal title="Новая организация" close={() => setOrgModal(false)}>
            <form onSubmit={createOrg}>
              <input
                className="field mb-3"
                required
                minLength={2}
                placeholder="Название"
                value={orgForm.name}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, name: e.target.value })
                }
              />
              <input
                className="field"
                required
                pattern="[a-z0-9-]+"
                placeholder="slug-company"
                value={orgForm.slug}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, slug: e.target.value })
                }
              />
              <button className="btn w-full mt-5" disabled={saving}>
                Создать
              </button>
            </form>
          </Modal>
        )}
        {userModal && (
          <Modal title="Новый пользователь" close={() => setUserModal(false)}>
            <form onSubmit={createUser} className="grid grid-cols-2 gap-3">
              <input
                className="field"
                required
                placeholder="Имя"
                value={userForm.firstName}
                onChange={(e) =>
                  setUserForm({ ...userForm, firstName: e.target.value })
                }
              />
              <input
                className="field"
                required
                placeholder="Фамилия"
                value={userForm.lastName}
                onChange={(e) =>
                  setUserForm({ ...userForm, lastName: e.target.value })
                }
              />
              <input
                className="field"
                type="email"
                required
                placeholder="Email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
              />
              <input
                className="field"
                required
                placeholder="Логин"
                value={userForm.username}
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
              />
              <input
                className="field"
                type="password"
                minLength={8}
                required
                placeholder="Пароль"
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
              />
              <select
                className="field"
                value={userForm.role}
                onChange={(e) =>
                  setUserForm({ ...userForm, role: e.target.value })
                }
              >
                <option value="QA_LEAD">QA Lead</option>
                <option value="QA_ENGINEER">QA Engineer</option>
                <option value="BUSINESS_ANALYST">Бизнес-аналитик</option>
              </select>
              <select
                className="field col-span-2"
                value={userForm.organizationId}
                onChange={(e) =>
                  setUserForm({ ...userForm, organizationId: e.target.value })
                }
              >
                {orgs.map((o) => (
                  <option value={o.id} key={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button className="btn col-span-2" disabled={saving}>
                Создать
              </button>
            </form>
          </Modal>
        )}
      </main>
    </AppShell>
  );
}
function AuditTable({ items }: { items: Audit[] }) {
  return (
    <section className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Пользователь</th>
            <th>Организация</th>
            <th>IP</th>
            <th>Действие</th>
            <th>Изменения</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{new Date(i.createdAt).toLocaleString("ru-RU")}</td>
              <td>
                {i.user ? `${i.user.firstName} ${i.user.lastName}` : "Система"}
              </td>
              <td>{i.organization?.name ?? "—"}</td>
              <td>
                <code>{i.ipAddress ?? "—"}</code>
              </td>
              <td>
                <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs">
                  {i.action}
                </span>
              </td>
              <td>
                <AuditChanges metadata={i.metadata} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/50 grid place-items-center p-4 z-50">
      <section className="card p-6 w-full max-w-xl">
        <div className="flex justify-between mb-5">
          <h2 className="font-medium m-0">{title}</h2>
          <button className="icon-btn" onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
