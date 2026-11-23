/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState, useRef, useEffect } from 'react';
import { useCustomerLookup, KnownCustomerSummary } from '../../hooks/useCustomerLookup';
import { User, Phone, CheckCircle2, Sparkles, X, ChevronRight } from 'lucide-react';

interface CustomerAutoSuggestInputProps {
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  onCustomerSelected?: (customer: KnownCustomerSummary) => void;
  selectedCustomer?: KnownCustomerSummary | null;
  setSelectedCustomer?: (customer: KnownCustomerSummary | null) => void;
  nameLabel?: string;
  phoneLabel?: string;
  required?: boolean;
}

export const CustomerAutoSuggestInput: React.FC<CustomerAutoSuggestInputProps> = ({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  onCustomerSelected,
  selectedCustomer,
  setSelectedCustomer,
  nameLabel = 'Customer Name',
  phoneLabel = 'Phone Number',
  required = true,
}) => {
  const { searchCustomers, findCustomerByPhone, findCustomerByName } = useCustomerLookup();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [matchedPhoneCustomer, setMatchedPhoneCustomer] = useState<KnownCustomerSummary | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Suggestions based on active name input
  const suggestions = customerName.trim() ? searchCustomers(customerName, 5) : [];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When phone changes, check if it matches an existing customer
  useEffect(() => {
    if (!selectedCustomer && customerPhone.trim().length >= 4) {
      const match = findCustomerByPhone(customerPhone);
      if (match && match.name.toLowerCase() !== customerName.toLowerCase()) {
        setMatchedPhoneCustomer(match);
      } else {
        setMatchedPhoneCustomer(null);
      }
    } else {
      setMatchedPhoneCustomer(null);
    }
  }, [customerPhone, customerName, selectedCustomer, findCustomerByPhone]);

  const handleSelect = (cust: KnownCustomerSummary) => {
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    if (setSelectedCustomer) {
      setSelectedCustomer(cust);
    }
    if (onCustomerSelected) {
      onCustomerSelected(cust);
    }
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setMatchedPhoneCustomer(null);
  };

  const handleClear = () => {
    setCustomerName('');
    setCustomerPhone('');
    if (setSelectedCustomer) {
      setSelectedCustomer(null);
    }
    setMatchedPhoneCustomer(null);
    setIsDropdownOpen(false);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  // Keyboard navigation inside dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsDropdownOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // On blur, if an exact name match exists and phone is empty, auto-fill it
  const handleNameBlur = () => {
    setTimeout(() => {
      if (!selectedCustomer && customerName.trim() && !customerPhone.trim()) {
        const exactMatch = findCustomerByName(customerName.trim());
        if (exactMatch) {
          handleSelect(exactMatch);
        }
      }
    }, 200);
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum':
        return 'bg-[#EBF3FF] text-[#006EF5] border-[#006EF5]/30';
      case 'gold':
        return 'bg-[#FFF8E6] text-[#B25E00] border-[#B25E00]/30';
      case 'silver':
        return 'bg-[#F1F3F5] text-[#495057] border-[#CED4DA]';
      case 'standard':
        return 'bg-[#F3F3F7] text-[#60646C] border-[#B9BBC6]/40';
      default:
        return 'bg-[#FFF4ED] text-[#FF5900] border-[#FF5900]/30';
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer Name Input with Live Auto-Suggest */}
        <div className="relative">
          <label className="block font-medium text-xs text-[#15191E] mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF5900]" /> {nameLabel} {required && '*'}
            </span>
            {selectedCustomer && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-[#006EF5] hover:underline flex items-center gap-0.5"
              >
                Clear / Change
              </button>
            )}
          </label>

          <div className="relative">
            <input
              ref={nameInputRef}
              type="text"
              required={required}
              autoComplete="off"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (selectedCustomer && selectedCustomer.name !== e.target.value) {
                  if (setSelectedCustomer) setSelectedCustomer(null);
                }
                setIsDropdownOpen(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setIsDropdownOpen(true);
              }}
              onBlur={handleNameBlur}
              onKeyDown={handleKeyDown}
              placeholder="Start typing name (e.g. Kushal, Rohit)..."
              className={`w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all ${
                selectedCustomer
                  ? 'border-[#0D9926] bg-[#F2FAF3]'
                  : 'border-[#B9BBC6] focus:border-[#006EF5]'
              }`}
            />

            {selectedCustomer && (
              <span className="absolute right-2.5 top-2.5 text-[#0D9926]" title="Existing customer profile verified">
                <CheckCircle2 className="w-5 h-5 fill-[#0D9926]/10" />
              </span>
            )}
          </div>

          {/* Autocomplete Dropdown Menu */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="absolute top-[66px] left-0 right-0 z-[2500] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] shadow-[0px_10px_28px_rgba(0,0,0,0.18)] overflow-hidden divide-y divide-[#F3F3F7] animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 bg-[#F8F9FA] text-[10px] font-semibold uppercase tracking-wider text-[#60646C] flex items-center justify-between">
                <span>Database Matches ({suggestions.length})</span>
                <span className="font-normal text-[9px] text-[#8B8D98]">Press Tab or Enter to select</span>
              </div>

              <div className="max-h-[220px] overflow-y-auto">
                {suggestions.map((cust, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={cust.id || `${cust.phone}_${idx}`}
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent blur before selection
                        e.preventDefault();
                        handleSelect(cust);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isHighlighted ? 'bg-[#FFF4ED]' : 'hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Initials badge */}
                        <div className="w-7 h-7 rounded-full bg-[#FF5900]/10 border border-[#FF5900]/20 text-[#FF5900] text-[11px] font-bold flex items-center justify-center shrink-0">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-[#15191E] truncate flex items-center gap-1.5">
                            {cust.name}
                            {cust.isCrmMember && (
                              <span title="Registered CRM Member">
                                <Sparkles className="w-3 h-3 text-[#FF5900] shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#60646C] font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#8B8D98]" /> {cust.phone || 'No phone recorded'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block text-[9px] px-1.5 py-0.5 rounded-[4px] font-bold uppercase border ${getTierColor(
                            cust.tier
                          )}`}
                        >
                          {cust.tier}
                        </span>
                        <div className="text-[10px] text-[#8B8D98] mt-0.5">
                          {cust.totalVisits} {cust.totalVisits === 1 ? 'visit' : 'visits'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Customer Phone Input */}
        <div>
          <label className="block font-medium text-xs text-[#15191E] mb-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#FF5900]" /> {phoneLabel} {required && '*'}
          </label>
          <input
            type="tel"
            required={required}
            autoComplete="off"
            value={customerPhone}
            onChange={(e) => {
              setCustomerPhone(e.target.value);
            }}
            placeholder="Auto-filled from customer name..."
            className={`w-full h-[40px] px-3 rounded-[6px] bg-[#FFFFFF] border text-sm text-[#15191E] font-mono placeholder-[#8B8D98] focus:outline-none focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all ${
              selectedCustomer
                ? 'border-[#0D9926] bg-[#F2FAF3]'
                : 'border-[#B9BBC6] focus:border-[#006EF5]'
            }`}
          />
        </div>
      </div>

      {/* Verified Returning Customer Status Pill */}
      {selectedCustomer && (
        <div className="bg-[#D1F4D2]/40 border border-[#0D9926]/30 rounded-[6px] px-3 py-2 flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0D9926] shrink-0" />
            <span className="font-semibold text-[#0D9926]">Auto-Fetched Customer Details:</span>
            <span className="font-bold text-[#15191E]">{selectedCustomer.name}</span>
            <span className="text-[#60646C] font-mono font-medium">({selectedCustomer.phone})</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${getTierColor(
                selectedCustomer.tier
              )}`}
            >
              {selectedCustomer.tier} · {selectedCustomer.totalVisits} visits
            </span>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-[#60646C] hover:text-[#FF3D00] flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      )}

      {/* Quick Prompt if Phone Matches an Existing Record */}
      {!selectedCustomer && matchedPhoneCustomer && (
        <div className="bg-[#FFF8E6] border border-[#B25E00]/30 rounded-[6px] p-2.5 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B25E00] shrink-0" />
            <span className="text-[#B25E00]">
              Phone matches returning customer:{' '}
              <strong className="text-[#15191E]">{matchedPhoneCustomer.name}</strong> ({matchedPhoneCustomer.totalVisits} visits)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelect(matchedPhoneCustomer)}
            className="px-2.5 py-1 bg-[#FF5900] hover:bg-[#E64E00] text-white rounded-[4px] text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
          >
            Auto-fill Details <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
