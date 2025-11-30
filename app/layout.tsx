import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import { WalletProvider } from '@/contexts/WalletContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { ToastProvider } from '@/contexts/ToastContext'

export const metadata: Metadata = {
  title: 'PolyTrade - Terminal Trading Platform',
  description: 'Trade Polymarkets crypto next candle events',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ToastProvider>
        <WalletProvider>
          <WebSocketProvider>
            <Header />
            {children}
          </WebSocketProvider>
        </WalletProvider>
        </ToastProvider>
      </body>
    </html>
  )
}

