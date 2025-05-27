
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
  title: 'RMRCMS',
  description: 'Raising My Rescue Content Management System - Track clients, sessions, and finances for your dog behaviorist practice.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
