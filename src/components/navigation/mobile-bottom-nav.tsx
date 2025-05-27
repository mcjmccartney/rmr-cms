
"use client";

// This component is no longer used as the mobile bottom navigation has been removed.
// It can be safely deleted from the project.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/lib/nav-items';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const privateNavItems = navItems.filter(item => !item.isPublic);
  const itemCount = privateNavItems.length;
  const itemWidthClass = itemCount <= 5 ? `w-1/${itemCount}` : 'w-1/5';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-sidebar-border bg-sidebar md:hidden">
      {privateNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-md text-xs",
              itemWidthClass,
              isActive ? "text-sidebar-primary" : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="mb-0.5 h-6 w-6" />
          </Link>
        );
      })}
    </nav>
  );
}
