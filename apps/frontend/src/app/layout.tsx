import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quality Hub — Almen Alnur',
  description: 'Платформа управления тестированием. Разработано Almen Alnur.',
  authors: [{ name: 'Almen Alnur' }],
  creator: 'Almen Alnur',
  publisher: 'Almen Alnur',
  applicationName: 'Quality Hub',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
