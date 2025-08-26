import './globals.css'
import React from 'react'
import dynamic from 'next/dynamic'
import { SimpleNav } from '../components/SimpleNav'
const NavLinks = dynamic(() => import('../components/NavLinks'), { ssr: false });
const ToastProvider = dynamic(() => import('../components/Toast').then(m => m.ToastProvider), { ssr: false });

export const metadata = { title: 'Repruv' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>
          <SimpleNav />
          <nav className="border-b bg-white">
            <div className="max-w-6xl mx-auto p-4 flex gap-4">
              <a href="/" className="font-semibold">Repruv</a>
              <NavLinks />
            </div>
          </nav>
          <main className="max-w-6xl mx-auto p-4">{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}
