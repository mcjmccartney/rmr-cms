
"use client";

import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Loader2, Menu as MenuIcon, UserPlus, CalendarPlus, Search as SearchIcon, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Fab } from '@/components/ui/fab';
import { useIsMobile } from '@/hooks/use-mobile'; // Keep for layout padding adjustments

interface AppLayoutProps {
  children: ReactNode;
}

const publicPaths = ['/login', '/behavioural-brief', '/behaviour-questionnaire', '/clients']; // Added /clients for testing
const noSidebarPaths = ['/login', '/behavioural-brief', '/behaviour-questionnaire']; // Used to determine if full app layout applies

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const useSpecialBackground =
    pathname === '/behavioural-brief' || pathname === '/behaviour-questionnaire';
  const hideMainAppLayout = noSidebarPaths.includes(pathname);

  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || authLoading) return;

    if (!user && !publicPaths.includes(pathname)) {
      router.replace('/login');
    } else if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [user, authLoading, pathname, router, mounted]);

  if (authLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // For public pages or when no full app layout is needed
  if (hideMainAppLayout || (!user && publicPaths.includes(pathname))) {
    return (
      <main className={cn(
        "flex-1 overflow-auto",
        !mounted && "bg-background",
        mounted && (
          useSpecialBackground
            ? "bg-[#4f6749]"
            : "bg-background"
        ),
      )}>
        {children}
      </main>
    );
  }

  // Main authenticated app layout
  if (user && !hideMainAppLayout) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <main
          className={cn(
            "flex-1 overflow-auto",
            !mounted && "bg-background", // Fallback for SSR/initial render
            mounted && (
              useSpecialBackground
                ? "bg-[#4f6749]" // For special form pages
                : "bg-[#fafafa]" // For general app pages
            ),
            mounted && ( // Apply padding based on screen size and page type
              useSpecialBackground
              ? "" // Special background pages handle their own padding
              : isMobile ? "px-4 py-6" : "p-6"
            ),
             mounted && isMobile && "pb-24" // Extra bottom padding for FAB on mobile
          )}
        >
          {children}
        </main>
        {mounted && user && !hideMainAppLayout && (
          <Fab />
        )}
      </div>
    );
  }

  // Fallback for non-authenticated users on public paths (already handled above, but as a catch-all)
  return (
    <main className={cn(
      "flex-1 overflow-auto",
      !mounted && "bg-background",
      mounted && (
        useSpecialBackground
          ? "bg-[#4f6749]"
          : "bg-background"
      )
    )}>
      {children}
    </main>
  );
}
