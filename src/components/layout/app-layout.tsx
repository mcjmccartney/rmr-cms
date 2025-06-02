
"use client";

import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Loader2, Menu as MenuIcon, UserPlus, CalendarPlus, Search as SearchIcon, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
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

  // Tab navigation order
  const tabOrder = ['/', '/clients', '/sessions', '/finance', '/memberships'];

  // Swipe navigation for mobile
  React.useEffect(() => {
    if (!mounted || !isMobile) return;

    let startX = 0;
    let startY = 0;
    const threshold = 50; // Minimum swipe distance
    const restraint = 100; // Maximum vertical movement

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const distX = endX - startX;
      const distY = endY - startY;

      // Check if it's a horizontal swipe (not vertical scroll)
      if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
        const currentIndex = tabOrder.indexOf(pathname);
        if (currentIndex === -1) return;

        if (distX > 0 && currentIndex > 0) {
          // Swipe right - go to previous tab
          router.push(tabOrder[currentIndex - 1]);
        } else if (distX < 0 && currentIndex < tabOrder.length - 1) {
          // Swipe left - go to next tab
          router.push(tabOrder[currentIndex + 1]);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mounted, isMobile, pathname, router]);

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
