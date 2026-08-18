'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileJson, FileText, LoaderCircle } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/auth';

type Plan = { id: string; name: string; project: { code: string; name: string }; _count: { cases: number; runs: number } };

export default function CreateReport() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState('');
  const [format, setFormat] = useState<'PDF' | 'JSON'>('PDF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api<{ items: Plan[] }>('/test-plans?page=1&pageSize=100').then((r) => setPlans(r.items)).catch((e) => setError(e.message)); }, []);
  const queue = async () => {
    setLoading(true); setError('');
    try {
      await api('/reports/generated', { method: 'POST', body: JSON.stringify({ testPlanId: selected, format, includeAttachments: true }) });
      router.push('/reports/generated');
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось создать отчёт'); setLoading(false); }
  };
  return <AppShell><main className="p-7 max-w-3xl mx-auto">
    <button className="icon-btn mb-5" onClick={() => router.push('/reports')}><ArrowLeft /></button>
    <section className="card glow-card p-8"><FileText size={38} className="text-brand"/><h1>Создать отчёт</h1>
      <p className="text-muted">Интерактивный отчёт откроется сразу, а фоновый соберёт такой же подробный PDF с метриками, шагами и вложениями.</p>
      {error && <p className="p-3 bg-red-50 text-red-700 rounded">{error}</p>}
      <label className="font-semibold text-sm block mb-2 mt-6">Тест-план</label>
      <select className="field" value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Выберите тест-план</option>{plans.map((p) => <option value={p.id} key={p.id}>{p.project.code} · {p.name} · {p._count.cases} кейсов</option>)}</select>
      <div className="grid grid-cols-2 gap-3 mt-4"><button className={`p-4 rounded-xl border text-left ${format === 'PDF' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-[var(--line)]'}`} onClick={() => setFormat('PDF')}><FileText className="inline mr-2"/>Красивый A3 PDF</button><button className={`p-4 rounded-xl border text-left ${format === 'JSON' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-[var(--line)]'}`} onClick={() => setFormat('JSON')}><FileJson className="inline mr-2"/>Машинный JSON</button></div>
      <div className="grid grid-cols-2 gap-3 mt-5"><button className="btn-secondary" disabled={!selected || loading} onClick={() => router.push(`/reports/test-plans/${selected}`)}>Открыть сейчас</button><button className="btn flex justify-center gap-2" disabled={!selected || loading} onClick={queue}>{loading && <LoaderCircle size={18} className="animate-spin"/>}Создать в фоне</button></div>
    </section>
  </main></AppShell>;
}
