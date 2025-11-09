import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { Toaster } from '@/components/ui/toast';
import { Toaster as HotToaster } from 'react-hot-toast';
import QueryProvider from '@/contexts/QueryProvider';
import HelpProvider from '@/components/help/HelpProvider';

export const metadata: Metadata = {
  title: 'Repruv - Help Creators Grow Channels & Increase Revenue',
  description: 'Join Repruv\'s Early Access - AI-powered platform that helps creators grow channels and increase revenue through intelligent automation and monetization insights.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FFF8E7" />
        <meta name="theme-color" content="#1A1F3A" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/logo/mark.png" />
        <link rel="apple-touch-icon" href="/logo/mark.png" />
        <link rel="mask-icon" href="/logo/safari-pinned-tab.svg" color="#00A651" />
        <link rel="preload" as="image" href="/logo/text_light.png" />
        <link rel="preload" as="image" href="/logo/text_dark.png" />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <QueryProvider>
            <HelpProvider>
              {children}
            </HelpProvider>
            <Toaster />
            <HotToaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: '8px',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}