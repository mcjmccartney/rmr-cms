'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Header from '@/components/layout/Header';
import AddModal from '@/components/AddModal';
import ClientModal from '@/components/modals/ClientModal';
import EditClientModal from '@/components/modals/EditClientModal';
import { Client } from '@/types';

export default function ClientsPage() {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);

  const filteredClients = state.clients.filter(client => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      client.ownerName.toLowerCase().includes(searchTerm) ||
      client.dogName.toLowerCase().includes(searchTerm)
    );
  });

  const activeClients = filteredClients.filter(client => client.active);

  const getAvatarText = (ownerName: string) => {
    return ownerName.split(' ').map(name => name[0]).join('').toUpperCase();
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  const handleAddClient = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setSelectedClient(null);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditClientModal(true);
  };

  const handleCloseEditClientModal = () => {
    setShowEditClientModal(false);
    setSelectedClient(null);
  };

  return (
    <div className="min-h-screen bg-amber-800" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
      <Header
        title={`${activeClients.length} Active`}
        showAddButton
        addButtonText="Add Client"
        onAddClick={handleAddClient}
        showSearch
        onSearch={setSearchQuery}
        searchPlaceholder="Search"
      />

      <div className="px-4 py-4 bg-gray-50 min-h-screen">
        {/* Clients List */}
        <div className="space-y-3">
          {activeClients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleClientClick(client)}
              className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {client.avatar || getAvatarText(client.ownerName)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{client.ownerName}</h3>
                  {client.dogName && (
                    <p className="text-sm text-gray-500">{client.dogName}</p>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>

        {activeClients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No clients found</p>
          </div>
        )}
      </div>

      <AddModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        type="client"
      />

      <ClientModal
        client={selectedClient}
        isOpen={showClientModal}
        onClose={handleCloseClientModal}
        onEditClient={handleEditClient}
      />

      <EditClientModal
        client={selectedClient}
        isOpen={showEditClientModal}
        onClose={handleCloseEditClientModal}
      />
    </div>
  );
}
