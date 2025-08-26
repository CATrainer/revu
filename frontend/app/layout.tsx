import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { Toaster } from '@/components/ui/toast';

export const metadata: Metadata = {

  title: 'Repruv - AI-Powered Brand Management',

  description: 'Manage reviews, monitor competitors, and grow your reputation with AI-powered insights',
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
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
