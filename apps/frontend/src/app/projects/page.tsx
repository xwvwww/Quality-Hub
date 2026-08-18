'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Archive, ChevronLeft, ChevronRight, FolderKanban, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api, session } from '@/lib/auth';

type Project = {
  id: string; code: string; name: string; description: string | null; status: 'ACTIVE' | 'ARCHIVED'; createdAt: string;
  owner: { id: string; firstName: string; lastName: string; email: string };
  _count: { members: number; testCases: number; testPlans: number; testRuns: number; defects: number };
};
type Response = { items: Project[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
type FormState = { name: string; code: string; description: string };
const emptyForm: FormState = { name: '', code: '', description: '' };

export default function ProjectsPage() {
  const [data, setData] = useState<Response>({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null); const [form, setForm] = useState<FormState>(emptyForm); const [saving, setSaving] = useState(false);
  const role = session.get()?.user.role; const canManage = role === 'ADMIN' || role === 'QA_LEAD'; const canDelete = role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', sortBy: 'createdAt', sortOrder: 'desc' });
      if (search.trim()) params.set('search', search.trim()); if (status) params.set('status', status);
      setData(await api<Response>(`/projects?${params}`));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить проекты'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { const timer = setTimeout(load, 300); return () => clearTimeout(timer); }, [load]);

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setModal(true); }
  function openEdit(project: Project) { setEditing(project); setForm({ name: project.name, code: project.code, description: project.description ?? '' }); setError(''); setModal(true); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api(editing ? `/projects/${editing.id}` : '/projects', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      setModal(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить проект'); }
    finally { setSaving(false); }
  }

  async function archive(project: Project) {
    if (!confirm(`Архивировать проект «${project.name}»?`)) return;
    try { await api(`/projects/${project.id}/archive`, { method: 'POST' }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось архивировать проект'); }
  }

  async function remove(project: Project) {
    if (!confirm(`Удалить проект «${project.name}» и все связанные данные? Это действие необратимо.`)) return;
    try { await api(`/projects/${project.id}`, { method: 'DELETE' }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удалить проект'); }
  }

  return <AppShell><main className="p-7 max-w-7xl mx-auto">
    <div className="flex flex-wrap justify-between gap-4 items-end mb-7"><div><p className="text-muted text-sm m-0">Управление рабочими областями тестирования</p><h1 className="text-3xl m-0 mt-1">Проекты</h1></div>{canManage && <button className="btn flex items-center gap-2" onClick={openCreate}><Plus size={18} />Создать проект</button>}</div>
    <section className="card overflow-hidden">
      <div className="p-4 border-b border-[var(--line)] flex flex-wrap gap-3"><div className="relative flex-1 min-w-64"><Search size={18} className="absolute left-3 top-3 text-muted" /><input className="field pl-10" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Поиск по названию, коду или описанию" /></div><select className="field w-48" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Все статусы</option><option value="ACTIVE">Активные</option><option value="ARCHIVED">Архивные</option></select></div>
      {error && !modal && <p className="mx-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr className="text-left text-muted bg-slate-50/70"><th className="p-4">Проект</th><th className="p-4">Владелец</th><th className="p-4">Статус</th><th className="p-4 text-center">Тест-кейсы</th><th className="p-4">Создан</th><th className="p-4 w-28"></th></tr></thead><tbody>
        {loading ? Array.from({ length: 4 }).map((_, index) => <tr key={index} className="border-t border-[var(--line)]"><td colSpan={6} className="p-4"><div className="h-10 bg-slate-100 animate-pulse rounded" /></td></tr>) : data.items.map(project => <tr key={project.id} className="border-t border-[var(--line)] hover:bg-slate-50/50"><td className="p-4"><div className="flex gap-3 items-center"><span className="w-10 h-10 rounded-lg bg-indigo-50 text-brand grid place-items-center"><FolderKanban size={19} /></span><div><b>{project.name}</b><div className="text-muted text-xs mt-1">{project.code} · {project.description || 'Без описания'}</div></div></div></td><td className="p-4">{project.owner.firstName} {project.owner.lastName}<div className="text-xs text-muted">{project.owner.email}</div></td><td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${project.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{project.status === 'ACTIVE' ? 'Активен' : 'В архиве'}</span></td><td className="p-4 text-center font-semibold">{project._count.testCases}</td><td className="p-4 text-muted">{new Date(project.createdAt).toLocaleDateString('ru-RU')}</td><td className="p-4"><div className="flex gap-1 justify-end">{canManage && <button title="Редактировать" className="icon-btn" onClick={() => openEdit(project)}><Pencil size={17} /></button>}{canManage && project.status === 'ACTIVE' && <button title="Архивировать" className="icon-btn" onClick={() => archive(project)}><Archive size={17} /></button>}{canDelete && <button title="Удалить" className="icon-btn text-red-600" onClick={() => remove(project)}><Trash2 size={17} /></button>}{!canManage && <MoreHorizontal size={18} className="text-muted" />}</div></td></tr>)}
        {!loading && !data.items.length && <tr><td colSpan={6} className="p-14 text-center"><FolderKanban size={36} className="mx-auto text-muted mb-3" /><b>Проекты не найдены</b><p className="text-muted text-sm">Измените параметры поиска или создайте первый проект.</p></td></tr>}
      </tbody></table></div>
      <div className="p-4 border-t border-[var(--line)] flex justify-between items-center text-sm"><span className="text-muted">Всего: {data.meta.total}</span><div className="flex items-center gap-2"><button className="icon-btn" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={18} /></button><span>Страница {data.meta.page} из {data.meta.totalPages}</span><button className="icon-btn" disabled={page >= data.meta.totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight size={18} /></button></div></div>
    </section>
    {modal && <div className="fixed inset-0 bg-slate-950/50 grid place-items-center p-4 z-50" onMouseDown={event => { if (event.currentTarget === event.target) setModal(false); }}><form onSubmit={submit} className="card p-6 w-full max-w-xl"><div className="flex justify-between items-start mb-6"><div><h2 className="m-0 text-xl">{editing ? 'Редактировать проект' : 'Новый проект'}</h2><p className="text-muted text-sm m-0 mt-1">Укажите основные сведения о проекте.</p></div><button type="button" className="icon-btn" onClick={() => setModal(false)}><X size={19} /></button></div>
      <label className="block text-sm font-semibold mb-2">Название *</label><input className="field mb-4" minLength={2} maxLength={255} required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Например, ScanKZ" />
      <label className="block text-sm font-semibold mb-2">Код проекта *</label><input className="field mb-1 uppercase" minLength={2} maxLength={12} pattern="[A-Za-z][A-Za-z0-9_-]{1,11}" required value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="SKZ" /><p className="text-xs text-muted mt-1 mb-4">2–12 латинских букв, цифр, _ или -</p>
      <label className="block text-sm font-semibold mb-2">Описание</label><textarea className="field min-h-28 resize-y" maxLength={5000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Что тестирует команда в этом проекте?" />
      {error && <p className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>}<div className="flex justify-end gap-3 mt-6"><button type="button" className="btn-secondary" onClick={() => setModal(false)}>Отмена</button><button className="btn" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button></div>
    </form></div>}
  </main></AppShell>;
}
