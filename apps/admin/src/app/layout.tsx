import './globals.css';import './enhancements.css';import type{Metadata}from'next';
export const metadata:Metadata={title:'Quality Hub Admin — Almen Alnur',description:'Системное администрирование Quality Hub',icons:{icon:'/icon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}
