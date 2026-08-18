'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Bug, ChevronDown, ClipboardCheck, FileText, FolderKanban, Gauge, LayoutDashboard, LogOut, Moon, PlayCircle, Plug, ShieldCheck, Sun, Users } from 'lucide-react';
import { api, apiBlob, session } from '@/lib/auth';
import { WorkspaceTools } from './workspace-tools';
import { ToastViewport } from './toast-viewport';

const items = [[LayoutDashboard, 'Обзор', '/dashboard'], [FolderKanban, 'Проекты', '/projects'], [ClipboardCheck, 'Тест-кейсы', '/test-cases'], [FileText, 'Тест-планы', '/test-plans'], [PlayCircle, 'Тест-раны', '/test-runs'], [Bug, 'Дефекты', '/defects'], [ShieldCheck, 'Требования', '/requirements'], [BarChart3, 'Отчёты', '/reports'], [Gauge, 'Аналитика', '/analytics'], [Plug, 'Интеграции', '/integrations'], [Users, 'Администрирование', '/administration']] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const path = usePathname(); const [hydrated,setHydrated]=useState(false); const [dark, setDark] = useState(false); const [profile,setProfile]=useState<{firstName:string;lastName:string;avatarUrl:string|null}|null>(null); const [avatar,setAvatar]=useState('');
  useEffect(() => { setHydrated(true); if (!session.get()) router.replace('/'); setDark(localStorage.getItem('quality-hub-theme') === 'dark'); api<{firstName:string;lastName:string;avatarUrl:string|null}>('/profile').then(setProfile).catch(()=>undefined); }, [router]);
  useEffect(()=>{let url='';if(profile?.avatarUrl)apiBlob(profile.avatarUrl).then(blob=>{url=URL.createObjectURL(blob);setAvatar(url)}).catch(()=>undefined);return()=>{if(url)URL.revokeObjectURL(url)}},[profile]);
  function toggleTheme(){setDark(value=>{const next=!value;localStorage.setItem('quality-hub-theme',next?'dark':'light');return next})}
  function logout() { session.clear(); router.replace('/'); }
  if (!hydrated) return <div className="min-h-screen bg-[var(--canvas)]"><div className="h-16 border-b border-[var(--line)] bg-[var(--panel)]"/><div className="max-w-7xl mx-auto p-7"><div className="h-8 w-56 rounded-lg bg-slate-100 animate-pulse"/><div className="h-64 mt-7 rounded-2xl bg-slate-100 animate-pulse"/></div></div>;
  if (path.startsWith('/reports/test-plans/')) return <div className="min-h-screen bg-slate-50 text-slate-950 print:bg-white">{children}</div>;
  return <div className={dark ? 'dark min-h-screen' : 'min-h-screen'}><div className="flex min-h-screen">
    <aside className="w-64 bg-ink text-white p-5 hidden md:flex flex-col"><div className="flex items-center gap-2 font-bold text-xl mb-9"><span className="bg-brand p-2 rounded-lg"><ShieldCheck size={20} /></span>Quality Hub</div>
      <nav className="space-y-1 flex-1">{items.map(([Icon, label, href]) => <Link key={label} href={href} className={`flex gap-3 items-center px-3 py-2.5 rounded-lg no-underline text-sm ${path === href ? 'bg-brand text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Icon size={18} />{label}</Link>)}</nav>
      <button onClick={logout} className="flex gap-3 border-0 bg-transparent text-slate-400 p-3 cursor-pointer"><LogOut size={18} />Выйти</button>
      <div className="border-t border-slate-700/70 pt-3 mt-3 px-3"><span className="text-xs text-slate-300 font-semibold">© 2026 Almen Alnur</span><p className="text-[10px] text-slate-600 m-0 mt-1">Автор и разработчик · All rights reserved</p></div>
    </aside>
    <div className="flex-1 min-w-0"><header className="h-16 bg-[var(--panel)] border-b border-[var(--line)] px-7 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl"><div className="font-semibold">QA Workspace <ChevronDown className="inline" size={16} /></div><div className="flex gap-3 items-center"><button onClick={toggleTheme} className="icon-btn" aria-label="Сменить тему">{dark ? <Sun size={19}/> : <Moon size={19}/>}</button><Link href="/profile" className="flex items-center gap-2 text-current no-underline rounded-full pr-2 hover:bg-slate-100"><span className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center rounded-full font-bold overflow-hidden shadow-lg shadow-indigo-500/25">{avatar?<img src={avatar} alt="Аватар" className="w-full h-full object-cover"/>:(profile?.firstName?.[0]??'A')+(profile?.lastName?.[0]??'')}</span><span className="hidden lg:block text-sm font-semibold">{profile?`${profile.firstName} ${profile.lastName}`:'Профиль'}</span></Link></div></header>{children}</div>
    <WorkspaceTools /><ToastViewport />
  </div></div>;
}
