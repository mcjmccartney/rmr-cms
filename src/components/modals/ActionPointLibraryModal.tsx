'use client';

import { useState, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import SafeHtmlRenderer from '../SafeHtmlRenderer';

interface ActionPoint {
  id: string;
  header: string;
  details: string;
}

interface ActionPointLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionPoints: ActionPoint[];
  selectedActionPoints: string[];
  onActionPointToggle: (actionPointId: string) => void;
  personalizeActionPoint: (actionPoint: ActionPoint, dogName: string, dogGender: 'Male' | 'Female') => ActionPoint;
  getSessionDogName: () => string;
  getDogGender: () => 'Male' | 'Female';
  previouslyUsedIds?: Set<string>;
}

export default function ActionPointLibraryModal({
  isOpen,
  onClose,
  actionPoints,
  selectedActionPoints,
  onActionPointToggle,
  personalizeActionPoint,
  getSessionDogName,
  getDogGender,
  previouslyUsedIds
}: ActionPointLibraryModalProps) {
  const [actionPointSearch, setActionPointSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredActionPoints = actionPoints.filter(actionPoint => {
    if (!actionPointSearch) return true;
    const searchLower = actionPointSearch.toLowerCase();
    return actionPoint.header.toLowerCase().includes(searchLower) ||
           actionPoint.details.toLowerCase().includes(searchLower);
  });

  // Mobile: Full screen modal
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Action Point Library</h2>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search action points..."
              value={actionPointSearch}
              onChange={(e) => setActionPointSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Action Points List */}
          <div className="space-y-3">
            {filteredActionPoints.map(actionPoint => {
              const isSelected = selectedActionPoints.includes(actionPoint.id);
              const isPreviouslyUsed = !isSelected && previouslyUsedIds?.has(actionPoint.id);
              const personalizedActionPoint = personalizeActionPoint(
                actionPoint,
                getSessionDogName(),
                getDogGender()
              );

              return (
                <div
                  key={actionPoint.id}
                  className={`p-4 border rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-amber-800 bg-amber-800/10'
                      : isPreviouslyUsed
                      ? 'border-gray-200 bg-gray-50 opacity-50 hover:opacity-70'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onActionPointToggle(actionPoint.id);
                  }}
                >
                  <div className="flex-1 pointer-events-none">
                    <SafeHtmlRenderer
                      html={personalizedActionPoint.header}
                      className="font-medium text-gray-900 text-sm"
                      fallback={personalizedActionPoint.header}
                    />
                    <SafeHtmlRenderer
                      html={personalizedActionPoint.details}
                      className="text-sm text-gray-600 mt-2"
                      fallback={personalizedActionPoint.details}
                    />
                    {isPreviouslyUsed && (
                      <p className="text-xs text-gray-400 mt-2 italic">Used in a previous plan</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredActionPoints.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No action points found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: Popup modal overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Action Point Library</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="mb-4 flex-shrink-0">
            <input
              type="text"
              placeholder="Search action points..."
              value={actionPointSearch}
              onChange={(e) => setActionPointSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Action Points List - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {filteredActionPoints.map(actionPoint => {
                const isSelected = selectedActionPoints.includes(actionPoint.id);
                const isPreviouslyUsed = !isSelected && previouslyUsedIds?.has(actionPoint.id);
                const personalizedActionPoint = personalizeActionPoint(
                  actionPoint,
                  getSessionDogName(),
                  getDogGender()
                );

                return (
                  <div
                    key={actionPoint.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-amber-800 bg-amber-800/10'
                        : isPreviouslyUsed
                        ? 'border-gray-200 bg-gray-50 opacity-50 hover:opacity-70'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onActionPointToggle(actionPoint.id);
                    }}
                  >
                    <div className="flex-1 pointer-events-none">
                      <SafeHtmlRenderer
                        html={personalizedActionPoint.header}
                        className="font-medium text-gray-900"
                        fallback={personalizedActionPoint.header}
                      />
                      <SafeHtmlRenderer
                        html={personalizedActionPoint.details}
                        className="text-sm text-gray-600 mt-1"
                        fallback={personalizedActionPoint.details}
                      />
                      {isPreviouslyUsed && (
                        <p className="text-xs text-gray-400 mt-1 italic">Used in a previous plan</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredActionPoints.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No action points found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
