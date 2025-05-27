
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/lib/nav-items';
import type { LucideIcon } from 'lucide-react';


import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';


export function SidebarNav() {
  const pathname = usePathname();
  const { isMobile, open: desktopOpen } = useSidebar(); // Get sidebar state
  const isIconOnly = isMobile || !desktopOpen;

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
              className={cn(
                'w-full', // Always full width
                isIconOnly ? '!justify-center' : 'justify-start', // Conditional centering
                (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90'
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              tooltip={{ children: item.label, className: "bg-popover text-popover-foreground border shadow-md" }}
            >
              <a>
                <item.icon className="h-5 w-5" /> {/* Icon size is controlled by button variant's SVG styling */}
                <span>{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
