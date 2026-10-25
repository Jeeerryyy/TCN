/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center h-[36px] ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-[#8B8D98] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[36px] bg-[#FFFFFF] border border-[#B9BBC6] focus:border-[#006EF5] rounded-[6px] pl-9 pr-8 text-xs text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-colors duration-150"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 p-1 text-[#8B8D98] hover:text-[#15191E] rounded-[4px] hover:bg-[#15191E]/[0.08] transition-colors"
          title="Clear search"
          aria-label="Clear search input"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
