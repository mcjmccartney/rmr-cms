'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Header from '@/components/layout/Header';
import SessionModal from '@/components/modals/SessionModal';
import EditSessionModal from '@/components/modals/EditSessionModal';
import EditClientModal from '@/components/modals/EditClientModal';
import AddModal from '@/components/AddModal';
import { Session, Client } from '@/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarPage() {
  const { state } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'session' | 'client'>('session');
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDay = (day: Date) => {
    return state.sessions.filter(session =>
      isSameDay(new Date(session.bookingDate), day)
    );
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
  };

  const handleAddSession = () => {
    setAddModalType('session');
    setShowAddModal(true);
  };

  const handleAddClient = () => {
    setAddModalType('client');
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
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

  const handleUpNextClick = () => {
    if (firstSession) {
      setSelectedSession(firstSession);
    }
  };

  // Keyboard navigation for months
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePreviousMonth();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextMonth();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus the calendar container to enable keyboard navigation
  useEffect(() => {
    const calendarContainer = document.getElementById('calendar-container');
    if (calendarContainer) {
      calendarContainer.focus();
    }
  }, []);

  // Get the first session for the bottom preview
  const firstSession = state.sessions[0];

  return (
    <div
      id="calendar-container"
      className="h-screen bg-amber-800 flex flex-col overflow-hidden outline-none"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}
      tabIndex={0}
    >
      <Header
        title="Calendar"
        showAddButton
        addButtonText="Add Session"
        onAddClick={handleAddSession}
        showSearch
        searchPlaceholder="Search"
      />

      {/* Calendar Section - Flex-1 to take remaining space */}
      <div className="bg-white flex flex-col flex-1 overflow-hidden">
        {/* Month Navigation */}
        <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'MMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid - Fills remaining space */}
        <div className="flex-1 px-4 py-2 flex flex-col min-h-0 overflow-hidden">
          <div className="grid grid-cols-7 gap-1 mb-2 flex-shrink-0">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 auto-rows-fr">
            {daysInMonth.map(day => {
              const sessions = getSessionsForDay(day);
              const dayNumber = format(day, 'd');

              return (
                <div key={day.toISOString()} className="flex flex-col p-1 min-h-0 border-r border-b border-gray-100 last:border-r-0">
                  <div className="text-sm font-medium mb-1 flex-shrink-0">{dayNumber}</div>
                  <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
                    {sessions.slice(0, 2).map(session => (
                      <button
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className="w-full bg-amber-800 text-white text-xs px-2 py-1 rounded text-left hover:bg-amber-700 transition-colors flex-shrink-0"
                      >
                        {format(new Date(session.bookingDate), 'HH:mm')}...
                      </button>
                    ))}
                    {sessions.length > 2 && (
                      <div className="text-xs text-amber-800 font-medium flex-shrink-0">
                        +{sessions.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Up Next Section - Fixed at bottom */}
      <button
        onClick={handleUpNextClick}
        disabled={!firstSession}
        className="bg-amber-800 text-white px-4 py-4 flex-shrink-0 w-full text-left disabled:cursor-default"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
      >
        {firstSession ? (
          <>
            <div className="text-lg font-medium">
              {format(new Date(firstSession.bookingDate), 'HH:mm')} | {firstSession.ownerName} w/ {firstSession.dogName}
            </div>
            <div className="text-white/80 text-sm">
              {firstSession.sessionType} • {format(new Date(firstSession.bookingDate), 'EEEE, d MMMM yyyy')}
            </div>
          </>
        ) : (
          <div className="text-lg font-medium">No upcoming sessions</div>
        )}
      </button>

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

      <AddModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        type={addModalType}
      />
    </div>
  );
}
