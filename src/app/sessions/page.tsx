'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Header from '@/components/layout/Header';
import SessionModal from '@/components/modals/SessionModal';
import EditSessionModal from '@/components/modals/EditSessionModal';
import EditClientModal from '@/components/modals/EditClientModal';
import { Session, Client } from '@/types';
import { format } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';

export default function SessionsPage() {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredSessions = state.sessions.filter(session => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      session.ownerName.toLowerCase().includes(searchTerm) ||
      session.dogName.toLowerCase().includes(searchTerm) ||
      session.sessionType.toLowerCase().includes(searchTerm)
    );
  });

  // Calculate total revenue for current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = filteredSessions
    .filter(session => {
      const sessionDate = new Date(session.bookingDate);
      return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
    })
    .reduce((total, session) => total + (session.paid ? session.quote : 0), 0);

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
  };

  const handleEditSession = (session: Session) => {
    setSelectedSession(session);
    setShowEditSessionModal(true);
  };

  const handleEditClient = (session: Session) => {
    // Find the client based on the session's owner name
    const client = state.clients.find(c => c.ownerName === session.ownerName);
    if (client) {
      setEditingClient(client);
      setShowEditClientModal(true);
    }
  };

  const handleCloseEditSessionModal = () => {
    setShowEditSessionModal(false);
  };

  const handleCloseEditClientModal = () => {
    setShowEditClientModal(false);
    setEditingClient(null);
  };

  const getSessionIcon = (sessionType: string) => {
    switch (sessionType) {
      case 'Group':
        return '📹';
      default:
        return '🐕';
    }
  };

  const getAvatarText = (ownerName: string) => {
    return ownerName.split(' ').map(name => name[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-amber-800" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
      <Header
        title="Sessions"
        showAddButton
        addButtonText="Add Session"
        onAddClick={() => {/* TODO: Implement add session */}}
        showSearch
        onSearch={setSearchQuery}
        searchPlaceholder="Search"
      />

      <div className="px-4 py-4 bg-gray-50 min-h-screen">
        {/* Monthly Summary */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            July 2025 - £{monthlyRevenue} | {filteredSessions.length} Sessions
          </h2>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const displayName = session.dogName 
              ? `${session.ownerName} w/ ${session.dogName}`
              : session.ownerName;

            return (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {session.sessionType === 'Group' ? '📹' : getAvatarText(session.ownerName)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{displayName}</h3>
                    <p className="text-sm text-gray-500">
                      {format(session.bookingDate, 'dd/MM/yyyy, HH:mm')} · {session.sessionType}
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreHorizontal size={20} className="text-gray-400" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <SessionModal
        session={selectedSession}
        isOpen={!!selectedSession && !showEditSessionModal && !showEditClientModal}
        onClose={handleCloseModal}
        onEditSession={handleEditSession}
        onEditClient={handleEditClient}
      />

      <EditSessionModal
        session={selectedSession}
        isOpen={showEditSessionModal}
        onClose={handleCloseEditSessionModal}
      />

      <EditClientModal
        client={editingClient}
        isOpen={showEditClientModal}
        onClose={handleCloseEditClientModal}
      />
    </div>
  );
}
