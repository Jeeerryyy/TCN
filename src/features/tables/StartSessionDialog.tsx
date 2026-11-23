/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { Table } from '../../types/table.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useTables } from '../../context/TableContext';
import { useCustomers } from '../../context/CustomerContext';
import { formatINR } from '../../utils/formatters';
import { Users, Play } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { CustomerAutoSuggestInput } from '../../components/ui/CustomerAutoSuggestInput';
import { KnownCustomerSummary } from '../../hooks/useCustomerLookup';

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
  const { customers, addCustomer, updateCustomer } = useCustomers();
  const { warning, success } = useToast();

  const [selectedCustomer, setSelectedCustomer] = useState<KnownCustomerSummary | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [playersCount, setPlayersCount] = useState(2);
  const [notes, setNotes] = useState('');

  if (!table) return null;

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      warning('Please enter a customer or player name.', 'Missing Player Name');
      return;
    }

    const cleanName = guestName.trim();
    const cleanPhone = guestPhone.trim();
    let finalCustomerId = selectedCustomer?.id;

    // If customer is already in CRM, update their last visit; if not, automatically save them to CRM
    const existingCrm = customers.find(
      (c) =>
        c.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '') ||
        c.name.toLowerCase().trim() === cleanName.toLowerCase()
    );

    if (existingCrm) {
      finalCustomerId = existingCrm.id;
      updateCustomer(existingCrm.id, {
        lastVisit: new Date().toISOString(),
        notes: notes.trim()
          ? existingCrm.notes
            ? `${existingCrm.notes}; ${notes.trim()}`
            : notes.trim()
          : existingCrm.notes,
      });
    } else if (cleanPhone) {
      // Auto-register customer so their details are permanently available for auto-fetch
      const newCust = addCustomer({
        name: cleanName,
        phone: cleanPhone,
        tier: 'standard',
        preferredGame: table.type,
        notes: notes.trim() || undefined,
      });
      finalCustomerId = newCust.id;
    }

    startSession({
      tableId: table.id,
      primaryCustomerName: cleanName,
      primaryCustomerPhone: cleanPhone || undefined,
      customerId: finalCustomerId || undefined,
      playersCount,
      playerNames: [cleanName],
      notes: notes.trim() || undefined,
    });

    success(`Session started on ${table.name}.`, 'Game Started');

    // Reset & close
    setGuestName('');
    setGuestPhone('');
    setSelectedCustomer(null);
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Start Session - ${table.name}`}
      subtitle={`${table.size} · Rate: ${formatINR(table.ratePerHour)}/hr (₹${(table.ratePerMinute ?? (table.ratePerHour / 60)).toFixed(2)}/min)`}
      maxWidth="md"
    >
      <form onSubmit={handleStart} className="space-y-4">
        {/* Customer Name & Phone with Auto-Fetch */}
        <CustomerAutoSuggestInput
          customerName={guestName}
          setCustomerName={setGuestName}
          customerPhone={guestPhone}
          setCustomerPhone={setGuestPhone}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          nameLabel="Player / Host Name"
          phoneLabel="Mobile Number"
          required={true}
          onCustomerSelected={(cust) => {
            if (cust.notes && !notes) {
              setNotes(cust.notes);
            }
          }}
        />

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

