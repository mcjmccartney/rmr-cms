'use client';

import { useState, useEffect } from 'react';
import { Session } from '@/types';
import { useApp } from '@/context/AppContext';
import SlideUpModal from './SlideUpModal';
import { format } from 'date-fns';

interface EditSessionModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditSessionModal({ session, isOpen, onClose }: EditSessionModalProps) {
  const { dispatch } = useApp();
  const [formData, setFormData] = useState({
    ownerName: '',
    dogName: '',
    sessionType: 'In-Person',
    date: '',
    time: '',
    quote: '',
    paid: false,
    behaviourPlanSent: false,
    notes: ''
  });

  useEffect(() => {
    if (session) {
      const sessionDate = new Date(session.bookingDate);
      setFormData({
        ownerName: session.ownerName,
        dogName: session.dogName || '',
        sessionType: session.sessionType,
        date: format(sessionDate, 'yyyy-MM-dd'),
        time: format(sessionDate, 'HH:mm'),
        quote: session.quote.toString(),
        paid: session.paid,
        behaviourPlanSent: session.behaviourPlanSent,
        notes: session.notes || ''
      });
    }
  }, [session]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const bookingDate = new Date(`${formData.date}T${formData.time}`);
    
    const updatedSession: Session = {
      ...session,
      ownerName: formData.ownerName,
      dogName: formData.dogName || undefined,
      sessionType: formData.sessionType as 'In-Person' | 'Online' | 'Group',
      bookingDate,
      quote: parseFloat(formData.quote),
      paid: formData.paid,
      behaviourPlanSent: formData.behaviourPlanSent,
      notes: formData.notes || undefined
    };

    dispatch({ type: 'UPDATE_SESSION', payload: updatedSession });
    onClose();
  };

  if (!session) return null;

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Session"
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

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Session Type
          </label>
          <select
            value={formData.sessionType}
            onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="In-Person">In-Person</option>
            <option value="Online">Online</option>
            <option value="Group">Group</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Time
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Quote (£)
          </label>
          <input
            type="number"
            value={formData.quote}
            onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter quote amount"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Paid</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, paid: !formData.paid })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.paid ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.paid ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Behaviour Plan Sent</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, behaviourPlanSent: !formData.behaviourPlanSent })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.behaviourPlanSent ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.behaviourPlanSent ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Add any notes about the session"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-amber-800 text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-700 transition-colors"
        >
          Update Session
        </button>
      </form>
    </SlideUpModal>
  );
}
