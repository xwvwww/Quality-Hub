'use client';
import { useEffect, useState } from 'react';
import { KeyRound, LogOut, MonitorSmartphone } from 'lucide-react';
import { api } from '@/lib/auth';
import { notify } from '@/components/toast-viewport';

type Session = { id:string; createdAt:string; expiresAt:string };

export function SessionManager() {
  const [items,setItems]=useState<Session[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState('');
  async function load(){try{setItems(await api<Session[]>('/profile/sessions'));setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Не удалось загрузить сессии')}}
  useEffect(()=>{void load()},[]);
  async function revoke(id:string){setBusy(id);setError('');try{await api(`/profile/sessions/${id}`,{method:'DELETE'});setItems(current=>current.filter(item=>item.id!==id));notify('Сессия завершена')}catch(reason){const message=reason instanceof Error?reason.message:'Не удалось завершить сессию';setError(message);notify(message,'error')}finally{setBusy('')}}
  return <section className="card p-7 mt-5"><div className="flex gap-3 items-center mb-5"><span className="p-3 bg-indigo-50 text-brand rounded-xl"><KeyRound/></span><div><h2 className="m-0 text-xl">Активные сессии</h2><span className="block text-xs text-muted mt-1">Завершите неизвестные или старые сессии</span></div></div>{error&&<p className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</p>}{items.map((item,index)=><div className="flex flex-wrap justify-between items-center gap-4 py-4 border-t border-[var(--line)]" key={item.id}><div className="flex gap-3"><MonitorSmartphone className="text-muted shrink-0"/><div><b className="text-sm">Сессия {index===0?'(последняя)':''}</b><span className="block text-xs text-muted mt-1">Создана {new Date(item.createdAt).toLocaleString('ru-RU')} · до {new Date(item.expiresAt).toLocaleString('ru-RU')}</span></div></div><button type="button" className="btn-secondary text-red-600 flex gap-2 items-center" disabled={busy===item.id} onClick={()=>revoke(item.id)}><LogOut size={16}/>{busy===item.id?'Завершение…':'Завершить'}</button></div>)}{!items.length&&!error&&<p className="text-muted text-center py-7">Активных refresh-сессий нет</p>}</section>;
}
