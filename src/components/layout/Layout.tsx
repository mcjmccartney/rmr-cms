'use client';

import { ReactNode } from 'react';
import FloatingActionButton from './FloatingActionButton';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <FloatingActionButton />
    </div>
  );
}
