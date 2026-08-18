'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { ReportAttachments } from './report-attachments';
import './report-print.css';
export default function ReportsLayout({children}:{children:React.ReactNode}){const path=usePathname();return <>{children}{path.startsWith('/reports/test-plans/')&&<ReportAttachments/>}{path==='/reports'&&<Link href="/reports/create" className="btn fixed right-8 bottom-8 z-40 no-underline flex gap-2 items-center shadow-xl"><Plus size={18}/>Создать отчёт</Link>}</>}
