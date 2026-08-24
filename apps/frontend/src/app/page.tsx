"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { session } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [adminPortal, setAdminPortal] = useState(false);

  useEffect(() => {
    setAdminPortal(location.port === "3001");
    router.prefetch("/dashboard");
    if (session.get()) router.replace("/dashboard");
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        adminPortal ? "/api/auth/admin/login" : "/api/auth/login",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : null;
      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message;
        throw new Error(
          message ||
            (response.status >= 500
              ? "Backend недоступен. Запустите API на порту 4000"
              : "Неверный email или пароль"),
        );
      }
      if (!data) throw new Error("Backend вернул некорректный ответ");
      session.set(data);
      router.push("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  async function forgot(event: FormEvent) {
    event.preventDefault();
    setForgotLoading(true);
    setForgotMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          Array.isArray(data?.message)
            ? data.message[0]
            : data?.message || "Ошибка запроса",
        );
      setForgotMessage(data.message);
    } catch (reason) {
      setForgotMessage(
        reason instanceof Error
          ? reason.message
          : "Не удалось отправить запрос",
      );
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex bg-ink text-white p-16 flex-col justify-between">
        <div className="flex items-center gap-3 font-bold text-xl">
          <span className="bg-brand rounded-xl p-2">
            <ShieldCheck />
          </span>
          Quality Hub
        </div>
        <div>
          <p className="text-brand font-semibold tracking-widest text-sm">
            QA WORKSPACE
          </p>
          <h1 className="text-5xl leading-tight font-bold max-w-xl">
            Качество продукта — в одном прозрачном процессе.
          </h1>
          <p className="text-slate-400 text-lg max-w-lg mt-5">
            Тест-кейсы, прогоны, дефекты и аналитика для всей команды.
          </p>
        </div>
        <p className="text-slate-500 text-sm">
          Безопасная multi-tenant платформа
        </p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md card p-8">
          <div className="lg:hidden flex items-center gap-2 font-bold text-xl mb-8">
            <ShieldCheck className="text-brand" />
            Quality Hub
          </div>
          <h2 className="text-3xl font-bold m-0">С возвращением</h2>
          <p className="text-muted mt-2 mb-7">
            Войдите в рабочее пространство команды
          </p>
          <label className="block text-sm font-semibold mb-2">Email</label>
          <input
            className="field mb-5"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="flex justify-between">
            <label className="text-sm font-semibold mb-2">Пароль</label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotMessage("");
                setForgotOpen(true);
              }}
              className="border-0 bg-transparent text-brand cursor-pointer"
            >
              Забыли пароль?
            </button>
          </div>
          <div className="relative">
            <input
              className="field pr-12"
              type={show ? "text" : "password"}
              placeholder="Введите пароль"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <button
              type="button"
              aria-label="Показать пароль"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-3 border-0 bg-transparent text-muted cursor-pointer"
            >
              {show ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="text-red-600 bg-red-50 p-3 rounded-lg text-sm"
            >
              {error}
            </p>
          )}
          <button type="submit" className="btn w-full mt-6" disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
      </section>
      {forgotOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 grid place-items-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setForgotOpen(false);
          }}
        >
          <form onSubmit={forgot} className="card p-7 w-full max-w-md">
            <h2 className="m-0">Восстановление доступа</h2>
            <p className="text-sm text-muted mb-6">
              Администратор получит запрос и свяжется с вами.
            </p>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              className="field"
              type="email"
              required
              autoFocus
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              placeholder="name@company.com"
            />
            {forgotMessage && (
              <p className="p-3 bg-indigo-50 text-brand rounded-lg text-sm">
                {forgotMessage}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setForgotOpen(false)}
              >
                Закрыть
              </button>
              <button className="btn" disabled={forgotLoading}>
                {forgotLoading ? "Отправка…" : "Отправить"}
              </button>
            </div>
          </form>
        </div>
      )}
      <footer className="fixed bottom-5 left-1/2 -translate-x-1/2 lg:left-auto lg:right-8 lg:translate-x-0 text-center lg:text-right z-10">
        <p className="text-xs text-muted m-0">
          Quality Hub — авторская разработка
        </p>
        <p className="text-sm font-semibold m-0 mt-1">Almen Alnur · © 2026</p>
        <p className="text-[10px] text-muted m-0 mt-1">All rights reserved</p>
      </footer>
    </main>
  );
}
