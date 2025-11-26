import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import PWARegister from '@/components/PWARegister';
import ErrorBoundary from '@/components/ErrorBoundary';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zurvânex - Neural Time Interface',
  description: 'Personal LLM interface powered by LM Studio',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Zurvânex',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#1e1e1e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning />
      <body className="antialiased" suppressHydrationWarning>
        {/* Puter.js SDK - Free AI APIs */}
        <Script
          src="https://js.puter.com/v2/"
          strategy="beforeInteractive"
        />
        <ErrorBoundary>
          <Providers>
            <div suppressHydrationWarning>
              <PWARegister />
              {children}
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
