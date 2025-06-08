'use client';

import { Session } from '@/types';
import { useApp } from '@/context/AppContext';
import SlideUpModal from './SlideUpModal';
import { format } from 'date-fns';

interface SessionModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onEditSession: (session: Session) => void;
  onEditClient: (session: Session) => void;
}

export default function SessionModal({ session, isOpen, onClose, onEditSession, onEditClient }: SessionModalProps) {
  const { dispatch } = useApp();

  if (!session) return null;

  const handleDelete = () => {
    dispatch({ type: 'DELETE_SESSION', payload: session.id });
    onClose();
  };

  const handleTogglePaid = () => {
    dispatch({
      type: 'UPDATE_SESSION',
      payload: { ...session, paid: !session.paid }
    });
  };

  const handleToggleBehaviourPlan = () => {
    dispatch({
      type: 'UPDATE_SESSION',
      payload: { ...session, behaviourPlanSent: !session.behaviourPlanSent }
    });
  };

  const displayName = session.dogName 
    ? `${session.ownerName} w/ ${session.dogName}`
    : session.ownerName;

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
    >
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onEditSession(session)}
            className="flex-1 bg-amber-800 hover:bg-amber-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Edit Session
          </button>
          <button
            onClick={() => onEditClient(session)}
            className="flex-1 bg-amber-800 hover:bg-amber-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Edit Client
          </button>
        </div>

        {/* Session Details */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Owner(s) Name</span>
            <span className="font-medium text-gray-900">{session.ownerName}</span>
          </div>

          {session.dogName && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Dog(s) Name</span>
              <span className="font-medium text-gray-900">{session.dogName}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Booking</span>
            <span className="font-medium text-gray-900">
              {format(session.bookingDate, 'dd/MM/yyyy, HH:mm')}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Session Type</span>
            <span className="font-medium text-gray-900">{session.sessionType}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Quote</span>
            <span className="font-medium text-gray-900">£{session.quote}</span>
          </div>

          {/* Toggle Switches */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Paid</span>
            <button
              onClick={handleTogglePaid}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                session.paid ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  session.paid ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Behaviour Plan Sent</span>
            <button
              onClick={handleToggleBehaviourPlan}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                session.behaviourPlanSent ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  session.behaviourPlanSent ? 'translate-x-6' : 'translate-x-1'
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
          Delete Session
        </button>
      </div>
    </SlideUpModal>
  );
}
