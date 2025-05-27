
"use client";

import * as React from "react";
import { Menu, X, Users, CalendarDays, LayoutDashboard, DollarSign, Settings, LogOut } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";

interface FabProps extends ButtonProps {
  // No specific extra props needed for this version
}

const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ className, ...props }, ref) => {
    const [actionsOpen, setActionsOpen] = React.useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const { user, signOut } = useAuth(); // For logout

    const handleLogout = async () => {
      if (!user) return; // Should not happen if FAB is shown for authenticated users
      try {
        await signOut();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        setActionsOpen(false); // Close FAB actions
        router.replace('/login');
      } catch (error) {
        console.error("Logout error:", error);
        toast({ title: "Logout Failed", description: "Could not log you out. Please try again.", variant: "destructive" });
      }
    };

    const actionButtonClasses = "h-12 w-12 rounded-full shadow-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center";

    const navActions = [
      { id: 'dashboard', href: '/', icon: LayoutDashboard, label: "Go to Dashboard" },
      { id: 'clients', href: '/clients', icon: Users, label: "Go to Clients" },
      { id: 'sessions', href: '/sessions', icon: CalendarDays, label: "Go to Sessions" },
      { id: 'finance', href: '/finance', icon: DollarSign, label: "Go to Finance" },
    ];

    const settingsActions = [
      // { id: 'settings', href: '/settings', icon: Settings, label: "Go to Settings" }, // Placeholder
    ];

    const visibleNavActions = navActions.filter(action => action.href !== pathname);
    // Ensure Dashboard is always an option if not on dashboard and not too many actions
    if (pathname !== '/' && !visibleNavActions.find(a => a.id === 'dashboard') && visibleNavActions.length < 4) {
        const dashboardAction = navActions.find(a => a.id === 'dashboard');
        if (dashboardAction) visibleNavActions.unshift(dashboardAction);
    }
     // Limit to 3-4 main nav actions to avoid clutter
    const finalNavActions = visibleNavActions.slice(0, 4);


    return (
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative flex flex-col items-center gap-3">
          {actionsOpen && (
            <>
              {/* Logout Button */}
              <Button
                className={cn(
                  actionButtonClasses,
                  "transition-all duration-300 ease-out",
                  actionsOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                )}
                onClick={handleLogout}
                aria-label="Log Out"
              >
                <LogOut className="h-6 w-6" />
              </Button>

              {/* Settings Button Placeholder - can be enabled later */}
              {settingsActions.map((action, index) => (
                <Link href={action.href} passHref legacyBehavior key={action.id}>
                  <a
                    className={cn(
                      actionButtonClasses,
                      "transition-all duration-300 ease-out",
                      `delay-${(settingsActions.length - 1 - index) * 75}`, // Stagger delay
                      actionsOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                    )}
                    onClick={() => setActionsOpen(false)}
                    aria-label={action.label}
                  >
                    <action.icon className="h-6 w-6" />
                  </a>
                </Link>
              ))}

              {/* Dynamic Navigation Buttons */}
              {finalNavActions.map((action, index) => (
                <Link href={action.href} passHref legacyBehavior key={action.id}>
                  <a
                    className={cn(
                      actionButtonClasses,
                      "transition-all duration-300 ease-out",
                       // Stagger delay based on total number of buttons including settings/logout
                      `delay-${(finalNavActions.length - 1 - index + settingsActions.length + 1) * 75}`,
                      actionsOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                    )}
                    onClick={() => setActionsOpen(false)}
                    aria-label={action.label}
                  >
                    <action.icon className="h-6 w-6" />
                  </a>
                </Link>
              ))}
            </>
          )}
          <Button
            ref={ref}
            variant="default"
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg z-10",
              className
            )}
            onClick={() => setActionsOpen(!actionsOpen)}
            aria-expanded={actionsOpen}
            aria-label={actionsOpen ? "Close actions menu" : "Open actions menu"}
            {...props}
          >
            {actionsOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    );
  }
);
Fab.displayName = "Fab";

export { Fab };
