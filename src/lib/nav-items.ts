
import type * as React from 'react'; // Ensure React is imported for LucideIcon type if needed
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  DollarSign, // Changed from custom IconPoundSterling
  ClipboardPlus,
  FileQuestion,
  type LucideIcon, // LucideIcon type for icon definitions
  // type LucideProps, // No longer needed as custom icon is removed
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isPublic?: boolean;
}

// Custom Pound Sterling icon removed as it caused parsing issues.
// Reverted to DollarSign for Finance.

export const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/sessions', label: 'Sessions', icon: CalendarDays },
  { href: '/finance', label: 'Finance', icon: DollarSign }, // Reverted
  { href: '/behavioural-brief', label: 'Behavioural Brief', icon: ClipboardPlus, isPublic: true },
  { href: '/behaviour-questionnaire', label: 'Behaviour Questionnaire', icon: FileQuestion, isPublic: true },
];
