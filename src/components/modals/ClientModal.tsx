'use client';

import { Client } from '@/types';
import { useApp } from '@/context/AppContext';
import SlideUpModal from './SlideUpModal';

interface ClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onEditClient: (client: Client) => void;
}

export default function ClientModal({ client, isOpen, onClose, onEditClient }: ClientModalProps) {
  const { dispatch } = useApp();

  if (!client) return null;

  const handleDelete = () => {
    dispatch({ type: 'DELETE_CLIENT', payload: client.id });
    onClose();
  };

  const handleToggleActive = () => {
    dispatch({
      type: 'UPDATE_CLIENT',
      payload: { ...client, active: !client.active }
    });
  };

  const handleEditClick = () => {
    onEditClient(client);
    onClose();
  };

  const getAvatarText = (ownerName: string) => {
    return ownerName.split(' ').map(name => name[0]).join('').toUpperCase();
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      title={client.ownerName}
    >
      <div className="space-y-6">
        {/* Client Avatar */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-amber-800 rounded-full flex items-center justify-center text-white text-2xl font-medium">
            {client.avatar || getAvatarText(client.ownerName)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleEditClick}
            className="flex-1 bg-amber-800 hover:bg-amber-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Edit Client
          </button>
        </div>

        {/* Client Details */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Owner Name</span>
            <span className="font-medium text-gray-900">{client.ownerName}</span>
          </div>

          {client.email && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Email</span>
              <span className="font-medium text-gray-900">{client.email}</span>
            </div>
          )}

          {client.phone && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Phone</span>
              <span className="font-medium text-gray-900">{client.phone}</span>
            </div>
          )}

          {client.dogName && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Dog Name</span>
              <span className="font-medium text-gray-900">{client.dogName}</span>
            </div>
          )}

          {client.dogBreed && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Dog Breed</span>
              <span className="font-medium text-gray-900">{client.dogBreed}</span>
            </div>
          )}

          {client.dogAge && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Dog Age</span>
              <span className="font-medium text-gray-900">{client.dogAge}</span>
            </div>
          )}

          {/* Toggle Switch */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Active Client</span>
            <button
              onClick={handleToggleActive}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                client.active ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  client.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="w-full bg-red-600 hover:bg-red-700 py-3 px-4 rounded-lg font-medium transition-colors mt-6"
        >
          Delete Client
        </button>
      </div>
    </SlideUpModal>
  );
}
