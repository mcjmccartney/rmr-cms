'use client';

import Header from '@/components/layout/Header';
import { Star } from 'lucide-react';

export default function FavoritesPage() {
  return (
    <div className="min-h-screen bg-amber-800" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
      <Header title="Favorites" />

      <div className="px-4 py-8 bg-gray-50 min-h-screen">
        <div className="text-center">
          <Star size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Favorites Yet</h2>
          <p className="text-gray-500">
            Your favorite sessions and clients will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
