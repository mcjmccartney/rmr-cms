
import type {Metadata} from 'next';
import { Inter, Roboto_Mono, Montserrat } from 'next/font/google'; // Added Montserrat
import './globals.css';
import AppLayout from '@/components/layout/app-layout';
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from '@/contexts/auth-context';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const robotoMono = Roboto_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

// Added Montserrat for titles
const montserrat = Montserrat({
  variable: '--font-title',
  subsets: ['latin'],
  weight: ['700'], // Using bold weight
});

export const metadata: Metadata = {
  title: 'RMR CMS - Raising My Rescue',
  description: 'Content Management System for dog behaviorist practice - Track clients, sessions, and finances',
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RMR CMS',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'RMR CMS',
    title: 'RMR CMS - Raising My Rescue',
    description: 'Content Management System for dog behaviorist practice',
  },
  icons: {
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icons/icon-152x152.svg', sizes: '152x152', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RMR CMS" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} ${robotoMono.variable} ${montserrat.variable} antialiased`}> {/* Added montserrat.variable */}
        <TooltipProvider delayDuration={300}>
          <AuthProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
