/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { CafeCategory } from '../../types/cafe.types';
import { useCafe } from '../../context/CafeContext';
import { SearchInput } from '../../components/ui/SearchInput';
import { formatINR } from '../../utils/formatters';
import { Plus } from 'lucide-react';

export const MenuCatalog: React.FC = () => {
  const { menu, addToCart } = useCafe();
  const [selectedCategory, setSelectedCategory] = useState<CafeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'coffee', label: 'Artisanal Coffee' },
    { id: 'beverages', label: 'Mocktails & Sodas' },
    { id: 'shakes', label: 'Thick Shakes' },
    { id: 'snacks', label: 'Snacks & Fries' },
    { id: 'sandwiches', label: 'Club Sandwiches' },
    { id: 'quick_bites', label: 'Pastas & Mains' },
    { id: 'desserts', label: 'Hot Desserts' },
  ];

  // Filtering logic
  const filteredMenu = menu.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
              className={`px-3.5 py-1.5 rounded-[6px] text-xs font-normal whitespace-nowrap transition-colors duration-150 ${
                selectedCategory === cat.id
                  ? 'bg-[#FF5900] text-white font-medium shadow-none'
                  : 'bg-[#FFFFFF] hover:bg-[#15191E]/[0.04] text-[#15191E] border border-[#B9BBC6]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search"
          className="w-full md:w-64"
        />
      </div>

      {/* Grid of Menu Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMenu.map((item) => (
          <div
            key={item.id}
            className={`flex flex-col justify-between p-4 rounded-[8px] border transition-colors duration-150 ${
              item.isAvailable
                ? 'bg-[#FFFFFF] border-[#B9BBC6] shadow-[0px_2px_8px_rgba(0,0,0,0.08)]'
                : 'bg-[#F3F3F7] border-[#B9BBC6] opacity-50'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-[#000000] leading-snug">{item.name}</h4>
                {item.isVegetarian ? (
                  <span className="shrink-0 w-3.5 h-3.5 border border-[#0D9926] flex items-center justify-center rounded-[3px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0D9926]" />
                  </span>
                ) : (
                  <span className="shrink-0 w-3.5 h-3.5 border border-[#FF3D00] flex items-center justify-center rounded-[3px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3D00]" />
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-[#60646C] mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#B9BBC6]">
              <span className="text-sm font-mono font-semibold text-[#15191E]">
                {formatINR(item.price)}
              </span>

              {item.isAvailable ? (
                <button
                  type="button"
                  onClick={() => addToCart(item)}
                  className="h-[36px] px-3.5 rounded-[6px] border border-[#15191E] bg-[#FFFFFF] hover:bg-[#FF5900] hover:border-[#FF5900] hover:text-white text-[#15191E] font-normal text-xs flex items-center gap-1.5 transition-colors duration-150"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              ) : (
                <span className="text-xs text-[#8B8D98] font-normal">Sold Out</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
