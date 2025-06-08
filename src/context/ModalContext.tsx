'use client';

import { createContext, useContext, useState, ReactNode, useRef } from 'react';

interface ModalContextType {
  isAnyModalOpen: boolean;
  registerModal: (id: string) => void;
  unregisterModal: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const openModalsRef = useRef<Set<string>>(new Set());

  const registerModal = (id: string) => {
    openModalsRef.current.add(id);
    setIsAnyModalOpen(true);
  };

  const unregisterModal = (id: string) => {
    openModalsRef.current.delete(id);
    setIsAnyModalOpen(openModalsRef.current.size > 0);
  };

  return (
    <ModalContext.Provider value={{ isAnyModalOpen, registerModal, unregisterModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
