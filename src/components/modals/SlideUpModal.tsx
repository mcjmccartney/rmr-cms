'use client';

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useModal } from '@/context/ModalContext';

interface SlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function SlideUpModal({ isOpen, onClose, title, children }: SlideUpModalProps) {
  const { registerModal, unregisterModal } = useModal();

  useEffect(() => {
    const modalId = `slide-up-modal-${Date.now()}`;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      registerModal(modalId);
    } else {
      document.body.style.overflow = 'unset';
      unregisterModal(modalId);
    }

    return () => {
      document.body.style.overflow = 'unset';
      unregisterModal(modalId);
    };
  }, [isOpen, registerModal, unregisterModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white text-black rounded-t-3xl z-50 max-h-[85vh] overflow-hidden"
          >
            {/* Handle bar */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 overflow-y-auto max-h-[calc(85vh-120px)]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
