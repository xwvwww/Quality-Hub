import { Award, Code2, Copyright, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/app-shell';

export default function AboutPage() {
  return <AppShell><main className="p-7 max-w-5xl mx-auto">
    <section className="card glow-card p-8 md:p-12 mt-4 relative">
      <span className="inline-flex p-4 rounded-2xl bg-indigo-50 text-brand shadow-lg shadow-indigo-500/20"><ShieldCheck size={36}/></span>
      <p className="text-brand tracking-[.2em] text-xs font-bold mt-8">QUALITY HUB</p>
      <h1 className="text-4xl md:text-5xl mt-2 mb-4">О системе</h1>
      <p className="text-muted text-lg max-w-3xl leading-relaxed">Профессиональная платформа управления качеством: тест-кейсы, планы, прогоны, дефекты, требования, отчётность, аналитика и интеграции с автотестами.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-9">
        <div className="p-5 rounded-xl border border-[var(--line)]"><Code2 className="text-brand"/><span className="block text-xs text-muted mt-4">Автор и разработчик</span><b className="block mt-1 text-lg">Almen Alnur</b></div>
        <div className="p-5 rounded-xl border border-[var(--line)]"><Award className="text-brand"/><span className="block text-xs text-muted mt-4">Продукт</span><b className="block mt-1 text-lg">Quality Hub</b></div>
        <div className="p-5 rounded-xl border border-[var(--line)]"><Copyright className="text-brand"/><span className="block text-xs text-muted mt-4">Авторские права</span><b className="block mt-1 text-lg">© 2026</b></div>
      </div>
      <div className="mt-8 p-5 rounded-xl bg-slate-50 border border-[var(--line)]"><p className="font-semibold m-0">Copyright © 2026 Almen Alnur. All rights reserved.</p><p className="text-sm text-muted mb-0 mt-2">Исходный код, интерфейс, архитектура, документация и связанные материалы являются проприетарным программным обеспечением. Копирование, изменение, распространение и коммерческое использование без письменного разрешения правообладателя запрещены.</p></div>
    </section>
  </main></AppShell>;
}
