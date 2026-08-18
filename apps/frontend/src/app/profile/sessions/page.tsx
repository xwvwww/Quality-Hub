'use client';
import { AppShell } from '@/components/app-shell';
import { SessionManager } from '@/components/session-manager';
export default function Sessions(){return <AppShell><main className="p-7 max-w-3xl mx-auto"><p className="text-muted text-sm m-0">Управление доступом к аккаунту</p><h1 className="text-3xl mt-1">Сессии</h1><SessionManager/></main></AppShell>}
