export type Session = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; organizationId: string; role: string };
};

const key = 'quality-hub-session';

export const session = {
  get: (): Session | null => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
  },
  set: (value: Session) => localStorage.setItem(key, JSON.stringify(value)),
  clear: () => localStorage.removeItem(key),
};

export async function api<T>(path: string, init: RequestInit = {}) {
  let current = session.get();
  const send = () => fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${current?.accessToken ?? ''}` },
  });
  let response: Response;
  try { response = await send(); } catch { throw new Error('Backend недоступен. Проверьте, что API запущен на порту 4000'); }
  if (response.status === 401 && current?.refreshToken) {
    const refreshed = await fetch('/api/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (refreshed.ok) {
      current = await refreshed.json();
      session.set(current!);
      response = await send();
    } else {
      session.clear();
      if (typeof window !== 'undefined') window.location.replace('/');
      throw new Error('Сессия истекла. Войдите снова');
    }
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const detail = Array.isArray(payload?.message) ? payload.message.join('. ') : payload?.message;
    const fallback = response.status >= 500 ? `Backend не отвечает корректно (${response.status}) — проверьте порт 4000` : `Ошибка запроса ${response.status}`;
    const message = detail || fallback;
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('quality-hub-toast', { detail: { message, kind: 'error' } }));
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, formData: FormData) {
  const current = session.get();
  const response = await fetch(`/api${path}`, { method: 'POST', headers: { Authorization: `Bearer ${current?.accessToken ?? ''}` }, body: formData });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Ошибка загрузки файла');
  return response.json() as Promise<T>;
}

export async function apiBlob(path: string) {
  const current = session.get();
  const response = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${current?.accessToken ?? ''}` } });
  if (!response.ok) throw new Error('Не удалось загрузить вложение');
  return response.blob();
}
