'use client';

import { Search, Plus } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  title: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  addButtonText?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

export default function Header({
  title,
  showAddButton = false,
  onAddClick,
  addButtonText = 'Add',
  showSearch = false,
  onSearch,
  searchPlaceholder = 'Search',
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  return (
    <div className="bg-amber-800 text-white px-4 py-3 safe-area-pt">
      {/* Top row with title and buttons */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          {showAddButton && (
            <button
              onClick={onAddClick}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              title={addButtonText}
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="w-full bg-white/20 placeholder-white/60 text-white px-10 py-3 rounded-lg focus:outline-none focus:bg-white/30 transition-colors"
          />
        </div>
      )}
    </div>
  );
}
