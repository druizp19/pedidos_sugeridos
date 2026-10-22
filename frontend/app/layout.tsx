import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Pedidos Sugeridos · Medifarma',description:'Análisis de mercado y oportunidades por cliente'};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="es" suppressHydrationWarning><body className="min-h-screen antialiased selection:bg-violet-200 selection:text-violet-950">{children}</body></html>;
}
