'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, FileClock, LoaderCircle, Plus, RefreshCw, TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api, apiBlob } from '@/lib/auth';

type Job = { id: string; status: 'QUEUED'|'PROCESSING'|'COMPLETED'|'FAILED'; format: 'PDF'|'JSON'; progress: number; fileName: string|null; size: number|null; error: string|null; createdAt: string; testPlan: { name: string; project: { code: string; name: string } } };
const labels = { QUEUED: 'В очереди', PROCESSING: 'Формируется', COMPLETED: 'Готов', FAILED: 'Ошибка' };
const tones = { QUEUED: 'bg-slate-100 text-slate-700', PROCESSING: 'bg-indigo-50 text-indigo-700', COMPLETED: 'bg-green-50 text-green-700', FAILED: 'bg-red-50 text-red-700' };

export default function GeneratedReports() {
  const [items, setItems] = useState<Job[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(() => api<{ items: Job[] }>('/reports/generated?page=1&pageSize=100').then((r) => { setItems(r.items); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 3_000); return () => clearInterval(timer); }, [load]);
  const download = async (job: Job) => { const blob = await apiBlob(`/reports/generated/${job.id}/download`); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = job.fileName ?? `report.${job.format.toLowerCase()}`; anchor.click(); URL.revokeObjectURL(url); };
  return <AppShell><main className="p-7 max-w-6xl mx-auto">
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6"><div><Link href="/reports" className="icon-btn inline-flex mb-4"><ArrowLeft/></Link><p className="text-muted text-sm m-0">Надёжная очередь фоновых задач</p><h1 className="text-3xl m-0 mt-1">Готовые отчёты</h1></div><div className="flex gap-2"><button className="icon-btn" onClick={() => void load()} aria-label="Обновить"><RefreshCw size={18}/></button><Link href="/reports/create" className="btn no-underline flex gap-2 items-center"><Plus size={18}/>Создать</Link></div></div>
    {error && <p className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</p>}
    <section className="card overflow-hidden">{loading ? <div className="p-12 grid place-items-center"><LoaderCircle className="animate-spin text-brand"/></div> : items.map((job) => <article className="p-5 border-b border-[var(--line)] last:border-0" key={job.id}><div className="flex flex-wrap justify-between gap-4"><div className="min-w-0"><span className="text-xs text-brand font-semibold">{job.testPlan.project.code} · {job.format}</span><h2 className="text-lg my-1 truncate">{job.testPlan.name}</h2><span className="text-xs text-muted">{new Date(job.createdAt).toLocaleString('ru-RU')}{job.size ? ` · ${(job.size / 1024 / 1024).toFixed(2)} МБ` : ''}</span></div><div className="flex items-center gap-3"><span className={`px-3 py-1.5 rounded-full text-sm ${tones[job.status]}`}>{job.status === 'PROCESSING' && <LoaderCircle size={14} className="inline animate-spin mr-1"/>}{job.status === 'COMPLETED' && <CheckCircle2 size={14} className="inline mr-1"/>}{job.status === 'FAILED' && <TriangleAlert size={14} className="inline mr-1"/>}{labels[job.status]}</span>{job.status === 'COMPLETED' && <button className="btn-secondary flex gap-2" onClick={() => void download(job)}><Download size={17}/>Скачать</button>}</div></div>{job.status === 'PROCESSING' && <div className="h-2 bg-slate-100 rounded mt-4 overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${job.progress}%` }}/></div>}{job.error && <p className="text-red-700 text-sm mb-0">{job.error}</p>}</article>)}{!loading && !items.length && <div className="p-14 text-center text-muted"><FileClock size={42} className="mx-auto mb-3"/><p>Фоновых отчётов пока нет</p><Link href="/reports/create" className="text-brand">Создать первый</Link></div>}</section>
  </main></AppShell>;
}
