"use client";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Clock3,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/auth";
type Org = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: Array<{
    role: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      lastLoginAt: string | null;
    };
  }>;
};
const roles: Record<string, string> = {
  ADMIN: "Администратор организации",
  QA_LEAD: "QA Lead",
  QA_ENGINEER: "QA Engineer",
  BUSINESS_ANALYST: "Бизнес-аналитик",
};
export default function OrganizationPage() {
  const [org, setOrg] = useState<Org | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<Org>("/profile/organization")
      .then(setOrg)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <AppShell>
      <main className="p-7 max-w-6xl mx-auto">
        <p className="text-muted text-sm m-0">
          Ваше рабочее пространство и коллеги
        </p>
        <h1 className="text-3xl mt-1 mb-6">Организация</h1>
        {error && (
          <p className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</p>
        )}
        {org && (
          <>
            <section className="card p-6 mb-5 overflow-hidden relative">
              <div className="absolute -right-10 -top-12 w-52 h-52 rounded-full bg-indigo-500/10 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center shadow-lg shadow-indigo-500/25">
                  <Building2 />
                </span>
                <div>
                  <p className="text-xs text-brand font-bold tracking-widest m-0">
                    ВАША ОРГАНИЗАЦИЯ
                  </p>
                  <h2 className="text-2xl m-0 mt-1">{org.name}</h2>
                  <code className="text-xs text-muted">{org.slug}</code>
                </div>
                <div className="ml-auto text-right">
                  <b className="text-2xl">{org.members.length}</b>
                  <span className="block text-xs text-muted">участников</span>
                </div>
              </div>
              <div className="relative mt-6 pt-5 border-t border-[var(--line)] flex gap-2 items-center text-sm text-muted">
                <CalendarDays size={17} />
                Создана {new Date(org.createdAt).toLocaleDateString("ru-RU")}
              </div>
            </section>
            <section className="card overflow-hidden">
              <div className="p-5 border-b border-[var(--line)] flex gap-3 items-center">
                <Users className="text-brand" />
                <div>
                  <h2 className="m-0 text-lg">Участники организации</h2>
                  <p className="m-0 text-xs text-muted">
                    Состав доступен только для просмотра
                  </p>
                </div>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {org.members.map((m) => (
                  <article
                    className="p-4 flex flex-wrap gap-4 items-center"
                    key={m.user.id}
                  >
                    <span className="w-11 h-11 rounded-xl bg-indigo-50 text-brand grid place-items-center font-bold">
                      {m.user.firstName[0]}
                      {m.user.lastName[0]}
                    </span>
                    <div className="min-w-52">
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
                    <span className="ml-auto px-2.5 py-1.5 rounded-full bg-indigo-50 text-brand text-xs font-semibold">
                      {roles[m.role] ?? m.role}
                    </span>
                    <span
                      className={
                        m.user.isActive
                          ? "px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs"
                          : "px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs"
                      }
                    >
                      {m.user.isActive ? "Активен" : "Отключён"}
                    </span>
                    <span className="w-full pl-15 flex gap-2 items-center text-[11px] text-muted">
                      <Clock3 size={13} />
                      {m.user.lastLoginAt
                        ? `Последний вход: ${new Date(m.user.lastLoginAt).toLocaleString("ru-RU")}`
                        : "Ещё не входил"}
                    </span>
                  </article>
                ))}
              </div>
            </section>
            <p className="mt-4 text-xs text-muted flex gap-2 items-center">
              <ShieldCheck size={15} />
              Изменение состава и ролей выполняет системный администратор.
            </p>
          </>
        )}
      </main>
    </AppShell>
  );
}
