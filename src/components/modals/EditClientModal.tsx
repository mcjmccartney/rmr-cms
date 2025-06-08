'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { useApp } from '@/context/AppContext';
import SlideUpModal from './SlideUpModal';

interface EditClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditClientModal({ client, isOpen, onClose }: EditClientModalProps) {
  const { dispatch } = useApp();
  const [formData, setFormData] = useState({
    ownerName: '',
    email: '',
    phone: '',
    dogName: '',
    dogBreed: '',
    dogAge: '',
    active: true,
    notes: ''
  });

  useEffect(() => {
    if (client) {
      setFormData({
        ownerName: client.ownerName,
        email: client.email || '',
        phone: client.phone || '',
        dogName: client.dogName || '',
        dogBreed: client.dogBreed || '',
        dogAge: client.dogAge || '',
        active: client.active,
        notes: client.notes || ''
      });
    }
  }, [client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const updatedClient: Client = {
      ...client,
      ownerName: formData.ownerName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      dogName: formData.dogName || undefined,
      dogBreed: formData.dogBreed || undefined,
      dogAge: formData.dogAge || undefined,
      active: formData.active,
      notes: formData.notes || undefined
    };

    dispatch({ type: 'UPDATE_CLIENT', payload: updatedClient });
    onClose();
  };

  if (!client) return null;

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Client"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Owner Name
          </label>
          <input
            type="text"
            value={formData.ownerName}
            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter owner name"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Email (Optional)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter email address"
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Phone (Optional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Dog Name (Optional)
          </label>
          <input
            type="text"
            value={formData.dogName}
            onChange={(e) => setFormData({ ...formData, dogName: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter dog name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Dog Breed (Optional)
            </label>
            <input
              type="text"
              value={formData.dogBreed}
              onChange={(e) => setFormData({ ...formData, dogBreed: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Enter breed"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Dog Age (Optional)
            </label>
            <input
              type="text"
              value={formData.dogAge}
              onChange={(e) => setFormData({ ...formData, dogAge: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Enter age"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Active Client</span>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, active: !formData.active })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.active ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Add any notes about the client"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-amber-800 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-700 transition-colors"
        >
          Update Client
        </button>
      </form>
    </SlideUpModal>
  );
}
