/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { Table } from '../../types/table.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useTables } from '../../context/TableContext';
import { useCustomers } from '../../context/CustomerContext';
import { formatINR } from '../../utils/formatters';
import { User, Users, Play, Phone, Search, Star } from 'lucide-react';

interface StartSessionDialogProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StartSessionDialog: React.FC<StartSessionDialogProps> = ({
  table,
  isOpen,
  onClose,
}) => {
  const { startSession } = useTables();
  const { customers } = useCustomers();

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [playersCount, setPlayersCount] = useState(2);
  const [notes, setNotes] = useState('');

  if (!table) return null;

  // Filter matching registered members
  const matchedCustomers = customerSearch.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      ).slice(0, 3)
    : [];

  const handleSelectCustomer = (c: typeof customers[0]) => {
    setSelectedCustomerId(c.id);
    setGuestName(c.name);
    setGuestPhone(c.phone);
    setCustomerSearch('');
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Please enter a customer or player name.');
      return;
    }

    startSession({
      tableId: table.id,
      primaryCustomerName: guestName.trim(),
      primaryCustomerPhone: guestPhone.trim() || undefined,
      customerId: selectedCustomerId || undefined,
      playersCount,
      playerNames: [guestName.trim()],
      notes: notes.trim() || undefined,
    });

    // Reset & close
    setGuestName('');
    setGuestPhone('');
    setSelectedCustomerId('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Start Session - ${table.name}`}
      subtitle={`${table.size} · Rate: ${formatINR(table.ratePerHour)}/hr (Hourly billing)`}
      maxWidth="md"
    >
      <form onSubmit={handleStart} className="space-y-4">
        {/* Customer Search / Lookup */}
        <div>
          <label className="block text-xs font-semibold text-[#60646C] uppercase tracking-wider mb-1.5">
            Registered Member Lookup (Optional)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 sm:top-3 w-4 h-4 text-[#8B8D98]" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search"
              className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-9 pr-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
            />
          </div>

          {matchedCustomers.length > 0 && (
            <div className="mt-2 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-2 space-y-1">
              {matchedCustomers.map((cust) => (
                <button
                  type="button"
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust)}
                  className="w-full text-left p-2.5 sm:p-2 rounded-[6px] hover:bg-[#FFFFFF] border border-transparent hover:border-[#B9BBC6] flex items-center justify-between text-xs transition-colors min-h-[44px] sm:min-h-[36px]"
                >
                  <div>
                    <span className="font-semibold text-[#15191E]">{cust.name}</span>
                    <span className="text-[#60646C] ml-2 font-mono">{cust.phone}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#006EF5] flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> {cust.tier}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Guest Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1">
              Player / Host Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 sm:top-3 w-4 h-4 text-[#8B8D98]" />
              <input
                type="text"
                required
                autoComplete="name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-9 pr-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 sm:top-3 w-4 h-4 text-[#8B8D98]" />
              <input
                type="tel"
                autoComplete="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-9 pr-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Players count */}
        <div>
          <label className="block text-xs font-semibold text-[#60646C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Number of Players
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setPlayersCount(count)}
                className={`h-[44px] sm:h-[40px] rounded-[6px] text-xs font-medium transition-colors duration-150 active:scale-[0.98] ${
                  playersCount === count
                    ? 'bg-[#FF5900] text-white shadow-none font-semibold'
                    : 'bg-[#FFFFFF] border border-[#B9BBC6] text-[#15191E] hover:bg-[#15191E]/[0.05]'
                }`}
              >
                {count} {count === 1 ? 'Solo' : 'Players'}
              </button>
            ))}
          </div>
        </div>

        {/* Notes / Special Instructions */}
        <div>
          <label className="block text-xs font-medium text-[#15191E] mb-1">
            Session Notes / Cues Issued
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter your message"
            className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[#B9BBC6]">
          <Button variant="secondary" size="md" type="button" onClick={onClose} className="w-full sm:w-auto h-[44px] sm:h-auto">
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" icon={<Play className="w-4 h-4 fill-white" />} className="w-full sm:w-auto h-[44px] sm:h-auto">
            Start Game Clock
          </Button>
        </div>
      </form>
    </Modal>
  );
};

