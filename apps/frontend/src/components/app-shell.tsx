'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Bug, ClipboardCheck, FileText, FolderKanban, Gauge, KeyRound, LayoutDashboard, LogOut, Moon, PlayCircle, Plug, Settings, ShieldCheck, Sun, Users } from 'lucide-react';
import { api, apiBlob, session } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { WorkspaceTools } from './workspace-tools';
import { ToastViewport } from './toast-viewport';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router=useRouter(),path=usePathname(),{t}=useI18n();
  const[hydrated,setHydrated]=useState(false),[dark,setDark]=useState(false),[avatar,setAvatar]=useState('');
  const[profile,setProfile]=useState<{firstName:string;lastName:string;avatarUrl:string|null}|null>(null);
  const items=[[LayoutDashboard,t.overview,'/dashboard'],[FolderKanban,t.projects,'/projects'],[ClipboardCheck,t.cases,'/test-cases'],[FileText,t.plans,'/test-plans'],[PlayCircle,t.runs,'/test-runs'],[Bug,t.defects,'/defects'],[ShieldCheck,t.requirements,'/requirements'],[BarChart3,t.reports,'/reports'],[Gauge,t.analytics,'/analytics'],[Plug,t.integrations,'/integrations'],[Users,t.admin,'/administration']] as const;
  useEffect(()=>{setHydrated(true);if(!session.get())router.replace('/');setDark(localStorage.getItem('quality-hub-theme')==='dark');api<{firstName:string;lastName:string;avatarUrl:string|null}>('/profile').then(setProfile).catch(()=>undefined);['/dashboard','/projects','/test-cases','/test-plans','/test-runs','/defects','/requirements','/reports','/analytics','/integrations','/administration','/profile','/profile/settings'].forEach(href=>router.prefetch(href))},[router]);
  useEffect(()=>{let url='';if(profile?.avatarUrl)apiBlob(profile.avatarUrl).then(blob=>{url=URL.createObjectURL(blob);setAvatar(url)}).catch(()=>undefined);return()=>{if(url)URL.revokeObjectURL(url)}},[profile]);
  function theme(){setDark(value=>{const next=!value;localStorage.setItem('quality-hub-theme',next?'dark':'light');return next})}
  async function logout(){try{await fetch('/api/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'})}finally{session.clear();router.replace('/')}}
  if(!hydrated)return <div className="min-h-screen bg-[var(--canvas)]"><div className="h-16 border-b border-[var(--line)] bg-[var(--panel)]"/><div className="max-w-7xl mx-auto p-7"><div className="h-8 w-56 rounded-lg bg-slate-100 animate-pulse"/><div className="h-64 mt-7 rounded-2xl bg-slate-100 animate-pulse"/></div></div>;
  if(path.startsWith('/reports/test-plans/'))return <div className="min-h-screen bg-slate-50 text-slate-950 print:bg-white">{children}</div>;
  return <div className={dark?'dark min-h-screen':'min-h-screen'}><div className="flex min-h-screen">
    <aside className="w-64 bg-ink text-white p-5 hidden md:flex flex-col"><div className="flex items-center gap-2 font-bold text-xl mb-7"><span className="bg-brand p-2 rounded-lg shadow-lg shadow-indigo-500/30"><ShieldCheck size={20}/></span>Quality Hub</div>
      <nav className="space-y-1 flex-1">{items.map(([Icon,label,href])=><Link key={href} href={href} className={`flex gap-3 items-center px-3 py-2.5 rounded-lg no-underline text-sm ${path===href||path.startsWith(href+'/')?'bg-brand text-white shadow-lg shadow-indigo-500/20':'text-slate-400 hover:bg-slate-800'}`}><Icon size={18}/>{label}</Link>)}</nav>
      <button onClick={logout} className="flex gap-3 border-0 bg-transparent text-slate-400 hover:text-white p-3 cursor-pointer"><LogOut size={18}/>{t.logout}</button>
      <div className="border-t border-slate-700/70 pt-3 mt-2 px-3"><span className="text-xs text-slate-300 font-semibold">© 2026 Almen Alnur</span><p className="text-[10px] text-slate-600 m-0 mt-1">Author &amp; developer · All rights reserved</p></div>
    </aside>
    <div className="flex-1 min-w-0"><header className="h-16 bg-[var(--panel)] border-b border-[var(--line)] px-7 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl"><div className="font-semibold">{t.workspace}</div><div className="flex gap-2 items-center"><div className="workspace-header-tools"><WorkspaceTools/></div><button onClick={theme} className="icon-btn h-10 w-10" aria-label="Theme">{dark?<Sun size={19}/>:<Moon size={19}/>}</button><Link href="/profile/sessions" className="icon-btn h-10 w-10 no-underline" aria-label="Активные сессии" title="Активные сессии"><KeyRound size={19}/></Link><Link href="/profile/settings" className="icon-btn h-10 w-10 no-underline" aria-label="Настройки" title="Настройки"><Settings size={19}/></Link><Link href="/profile" className="flex items-center gap-2 text-current no-underline rounded-full h-11 pr-2 hover:bg-slate-100"><span className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center rounded-full font-bold overflow-hidden shadow-lg shadow-indigo-500/25">{avatar?<img src={avatar} alt={t.profile} className="w-full h-full object-cover"/>:(profile?.firstName?.[0]??'A')+(profile?.lastName?.[0]??'')}</span><span className="hidden lg:block text-sm font-semibold">{profile?`${profile.firstName} ${profile.lastName}`:t.profile}</span></Link></div></header>{children}</div>
    <ToastViewport/>
  </div></div>;
}
