'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useApp } from '@/context/AppContext';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'session' | 'client';
}

export default function AddModal({ isOpen, onClose, type }: AddModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { registerModal, unregisterModal } = useModal();

  useEffect(() => {
    const modalId = `add-modal-${Date.now()}`;

    if (isOpen) {
      setIsVisible(true);
      registerModal(modalId);
      // Small delay to trigger animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before hiding
      setTimeout(() => {
        setIsVisible(false);
        unregisterModal(modalId);
      }, 300);
    }
  }, [isOpen, registerModal, unregisterModal]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isAnimating ? 'bg-black/50' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {type === 'session' ? 'Add Session' : 'Add Client'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {type === 'session' ? (
            <SessionForm onSubmit={handleClose} />
          ) : (
            <ClientForm onSubmit={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function SessionForm({ onSubmit }: { onSubmit: () => void }) {
  const { state } = useApp();
  const [formData, setFormData] = useState({
    clientId: '',
    sessionType: 'In-Person',
    date: '',
    time: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement session creation
    console.log('Creating session:', formData);
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Client
        </label>
        <select
          value={formData.clientId}
          onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          required
        >
          <option value="">Select a client</option>
          {state.clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.ownerName}{client.dogName ? ` w/ ${client.dogName}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Session Type
        </label>
        <select
          value={formData.sessionType}
          onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="In-Person">In-Person</option>
          <option value="Virtual">Virtual</option>
          <option value="Phone">Phone</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Add any notes about the session"
          rows={3}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-amber-800 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-700 transition-colors"
      >
        Create Session
      </button>
    </form>
  );
}

function ClientForm({ onSubmit }: { onSubmit: () => void }) {
  const [formData, setFormData] = useState({
    ownerName: '',
    email: '',
    phone: '',
    dogName: '',
    dogBreed: '',
    dogAge: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement client creation
    console.log('Creating client:', formData);
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Owner Name
        </label>
        <input
          type="text"
          value={formData.ownerName}
          onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Enter owner name"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter email address"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter phone number"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dog Name
        </label>
        <input
          type="text"
          value={formData.dogName}
          onChange={(e) => setFormData({ ...formData, dogName: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Enter dog name"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Breed
          </label>
          <input
            type="text"
            value={formData.dogBreed}
            onChange={(e) => setFormData({ ...formData, dogBreed: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter dog breed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age
          </label>
          <input
            type="text"
            value={formData.dogAge}
            onChange={(e) => setFormData({ ...formData, dogAge: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="e.g., 2 years"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Add any notes about the client or dog"
          rows={3}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-amber-800 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-700 transition-colors"
      >
        Create Client
      </button>
    </form>
  );
}
