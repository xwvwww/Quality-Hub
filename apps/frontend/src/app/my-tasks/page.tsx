"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, ListTodo, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/auth";

type Status = "NOT_RUN" | "PASSED" | "FAILED" | "BLOCKED" | "SKIPPED" | "RETEST";
type Task = { id:string; status:Status; page:number; position:number; testRun:{id:string;name:string;environment:string|null;build:string|null;project:{code:string;name:string}}; testCase:{displayId:string;title:string;priority:string} };
type Response = { items:Task[]; summary:{total:number;executed:number;progress:number;NOT_RUN:number;PASSED:number;FAILED:number;BLOCKED:number;RETEST:number}; meta:{page:number;total:number;totalPages:number} };
const labels:Record<Status,string>={NOT_RUN:"Не выполнен",PASSED:"Пройден",FAILED:"Провален",BLOCKED:"Заблокирован",SKIPPED:"Пропущен",RETEST:"Ретест"};
const tones:Record<Status,string>={NOT_RUN:"bg-slate-100 text-slate-700",PASSED:"bg-emerald-50 text-emerald-700",FAILED:"bg-red-50 text-red-700",BLOCKED:"bg-amber-50 text-amber-700",SKIPPED:"bg-slate-100 text-slate-600",RETEST:"bg-violet-50 text-violet-700"};

export default function MyTasksPage(){
  const[data,setData]=useState<Response|null>(null),[search,setSearch]=useState(""),[status,setStatus]=useState(""),[page,setPage]=useState(1),[error,setError]=useState("");
  const load=useCallback(async()=>{const query=new URLSearchParams({page:String(page),pageSize:"20"});if(search.trim())query.set("search",search.trim());if(status)query.set("status",status);setError("");try{setData(await api<Response>(`/test-runs/my-tasks?${query}`));}catch(e){setError(e instanceof Error?e.message:"Не удалось загрузить задачи");}},[page,search,status]);
  useEffect(()=>{const timer=setTimeout(load,200);return()=>clearTimeout(timer);},[load]);
  const pending=data?.summary.NOT_RUN??0;
  return <AppShell><main className="p-7 max-w-7xl mx-auto">
    <div className="mb-6"><p className="text-muted text-sm m-0">Персональная очередь выполнения</p><h1 className="text-3xl m-0 mt-1">Мои задачи</h1></div>
    <div className="grid sm:grid-cols-3 gap-4 mb-5">
      <div className="card p-5"><div className="flex justify-between text-muted"><span>Назначено</span><ListTodo size={19}/></div><b className="text-3xl block mt-3">{data?.summary.total??0}</b></div>
      <div className="card p-5"><div className="flex justify-between text-muted"><span>Ожидают</span><Clock3 size={19}/></div><b className="text-3xl block mt-3 text-amber-600">{pending}</b></div>
      <div className="card p-5"><div className="flex justify-between text-muted"><span>Выполнено</span><CheckCircle2 size={19}/></div><b className="text-3xl block mt-3 text-emerald-600">{data?.summary.progress??0}%</b></div>
    </div>
    {error&&<p className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</p>}
    <section className="card overflow-hidden">
      <div className="p-4 border-b border-[var(--line)] grid md:grid-cols-[1fr_230px] gap-3"><div className="relative"><Search className="absolute left-3 top-3 text-muted" size={18}/><input className="field pl-10" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Поиск по кейсу или запуску"/></div><select className="field" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">Все статусы</option>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
      <div className="divide-y divide-[var(--line)]">{data?.items.map(task=><Link key={task.id} href={`/test-runs/${task.testRun.id}?page=${task.page}&case=${task.id}`} className="grid md:grid-cols-[minmax(0,1fr)_220px_130px] gap-4 items-center p-4 text-current no-underline hover:bg-slate-50 transition-colors"><div><b className="text-brand text-sm">{task.testCase.displayId}</b><div className="font-semibold mt-1">{task.testCase.title}</div><span className="text-xs text-muted">{task.testRun.project.code} · {task.testRun.name}</span></div><div className="text-sm"><div>{task.testRun.environment||"Окружение не указано"}</div><span className="text-xs text-muted">{task.testRun.build||"Build не указан"}</span></div><span className={`justify-self-start md:justify-self-end px-3 py-1 rounded-full text-xs font-semibold ${tones[task.status]}`}>{labels[task.status]}</span></Link>)}{data&&!data.items.length&&<div className="text-center py-16 text-muted"><CheckCircle2 className="mx-auto mb-3" size={38}/><b className="text-[var(--ink)]">Назначенных задач нет</b><p className="m-1">Новая работа появится здесь после назначения QA Lead.</p></div>}</div>
      {data&&data.meta.totalPages>1&&<div className="p-4 border-t border-[var(--line)] flex justify-between items-center"><button className="btn-secondary" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>Назад</button><span className="text-sm text-muted">{page} / {data.meta.totalPages} · {data.meta.total}</span><button className="btn-secondary" disabled={page>=data.meta.totalPages} onClick={()=>setPage(v=>v+1)}>Далее</button></div>}
    </section>
  </main></AppShell>;
}
