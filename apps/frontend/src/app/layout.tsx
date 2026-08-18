import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quality Hub — Almen Alnur',
  description: 'Платформа управления тестированием. Разработано Almen Alnur.',
  authors: [{ name: 'Almen Alnur' }],
  creator: 'Almen Alnur',
  publisher: 'Almen Alnur',
  applicationName: 'Quality Hub',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/icon.svg' },
  openGraph: { title: 'Quality Hub', description: 'Платформа управления качеством', type: 'website' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
