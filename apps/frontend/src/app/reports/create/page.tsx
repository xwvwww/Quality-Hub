'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CircleAlert, FileCheck2, FileJson, FileText, LoaderCircle } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/auth';

type Plan = { id: string; name: string; project: { code: string; name: string }; _count: { cases: number; runs: number } };
type Scope = 'all' | 'failed';

export default function CreateReport() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState('');
  const [format, setFormat] = useState<'PDF' | 'JSON'>('PDF');
  const [scope, setScope] = useState<Scope>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ items: Plan[] }>('/test-plans?page=1&pageSize=100').then((result) => setPlans(result.items)).catch((cause) => setError(cause.message));
  }, []);

  const queue = async () => {
    setLoading(true);
    setError('');
    try {
      await api('/reports/generated', {
        method: 'POST',
        body: JSON.stringify({ testPlanId: selected, format, includeAttachments: true, failedOnly: scope === 'failed' }),
      });
      router.push('/reports/generated');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось создать отчёт');
      setLoading(false);
    }
  };

  return <AppShell><main className="p-7 max-w-3xl mx-auto">
    <button className="icon-btn mb-5" onClick={() => router.push('/reports')} aria-label="Назад"><ArrowLeft /></button>
    <section className="card glow-card p-8">
      <FileText size={38} className="text-brand" />
      <h1>Создать отчёт</h1>
      <p className="text-muted">Выберите тест-план, состав отчёта и формат. Метрики сохранят общую картину запуска, а подробная часть может содержать все кейсы или только проваленные.</p>
      {error && <p className="p-3 bg-red-50 text-red-700 rounded">{error}</p>}

      <label className="font-semibold text-sm block mb-2 mt-6">Тест-план</label>
      <select className="field" value={selected} onChange={(event) => setSelected(event.target.value)}>
        <option value="">Выберите тест-план</option>
        {plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.project.code} · {plan.name} · {plan._count.cases} кейсов</option>)}
      </select>

      <label className="font-semibold text-sm block mb-2 mt-6">Состав отчёта</label>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={`p-4 rounded-xl border text-left ${scope === 'all' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-[var(--line)]'}`} onClick={() => setScope('all')}>
          <FileCheck2 className="inline mr-2" />
          <b className="block mt-2">Полный отчёт</b>
          <span className="text-xs opacity-75">Все тест-кейсы и результаты</span>
        </button>
        <button type="button" className={`p-4 rounded-xl border text-left ${scope === 'failed' ? 'border-red-500 bg-red-50 text-red-900' : 'border-[var(--line)]'}`} onClick={() => setScope('failed')}>
          <CircleAlert className="inline mr-2" />
          <b className="block mt-2">Только проваленные</b>
          <span className="text-xs opacity-75">Детали только по статусу «Провалено»</span>
        </button>
      </div>

      <label className="font-semibold text-sm block mb-2 mt-6">Формат</label>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={`p-4 rounded-xl border text-left ${format === 'PDF' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-[var(--line)]'}`} onClick={() => setFormat('PDF')}><FileText className="inline mr-2" />Красивый A3 PDF</button>
        <button type="button" className={`p-4 rounded-xl border text-left ${format === 'JSON' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-[var(--line)]'}`} onClick={() => setFormat('JSON')}><FileJson className="inline mr-2" />Машинный JSON</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <button className="btn-secondary" disabled={!selected || loading} onClick={() => router.push(`/reports/test-plans/${selected}?scope=${scope}`)}>Открыть сейчас</button>
        <button className="btn flex justify-center gap-2" disabled={!selected || loading} onClick={queue}>{loading && <LoaderCircle size={18} className="animate-spin" />}Создать в фоне</button>
      </div>
    </section>
  </main></AppShell>;
}
