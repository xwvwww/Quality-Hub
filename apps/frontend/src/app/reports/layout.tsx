'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileClock, Plus } from 'lucide-react';
import { ReportAttachments } from './report-attachments';
import './report-print.css';
export default function ReportsLayout({children}:{children:React.ReactNode}){const path=usePathname();return <>{children}{path.startsWith('/reports/test-plans/')&&<ReportAttachments/>}{path==='/reports'&&<div className="fixed right-8 bottom-8 z-40 flex gap-2"><Link href="/reports/generated" className="btn-secondary bg-[var(--panel)] no-underline flex gap-2 items-center shadow-xl"><FileClock size={18}/>Готовые</Link><Link href="/reports/create" className="btn no-underline flex gap-2 items-center shadow-xl"><Plus size={18}/>Создать отчёт</Link></div>}</>}
