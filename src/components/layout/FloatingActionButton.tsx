'use client';

import { useState } from 'react';
import { Calendar, FileText, Star, Users, Grid3X3, Menu, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useModal } from '@/context/ModalContext';

const navItems = [
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: FileText, label: 'Sessions', path: '/sessions' },
  { icon: Star, label: 'Favorites', path: '/favorites' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Grid3X3, label: 'Finance', path: '/finance' },
];

export default function FloatingActionButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAnyModalOpen } = useModal();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsExpanded(false);
  };

  // Hide FAB when any modal is open
  if (isAnyModalOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Navigation Items */}
      {isExpanded && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-3">
          {navItems.map(({ icon: Icon, label, path }, index) => {
            const isActive = pathname === path;
            const delay = index * 50; // Stagger animation
            
            return (
              <button
                key={path}
                onClick={() => handleNavigation(path)}
                className={`
                  flex items-center justify-center w-12 h-12 rounded-full shadow-lg
                  transition-all duration-300 transform hover:scale-110
                  ${isActive
                    ? 'bg-amber-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                  }
                `}
                style={{
                  animationDelay: `${delay}ms`,
                  animation: 'slideInUp 0.3s ease-out forwards'
                }}
                title={label}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={toggleExpanded}
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 transform hover:scale-110 active:scale-95
          ${isExpanded
            ? 'bg-gray-600 text-white'
            : 'bg-amber-800 text-white'
          }
        `}
      >
        {isExpanded ? (
          <X size={24} className="transition-transform duration-300" />
        ) : (
          <Menu size={24} className="transition-transform duration-300" />
        )}
      </button>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
