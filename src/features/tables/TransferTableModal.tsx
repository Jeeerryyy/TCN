/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { Table } from '../../types/table.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useTables } from '../../context/TableContext';
import { formatINR } from '../../utils/formatters';
import { ArrowRightLeft } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface TransferTableModalProps {
  sourceTable: Table | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransferTableModal: React.FC<TransferTableModalProps> = ({
  sourceTable,
  isOpen,
  onClose,
}) => {
  const { tables, transferSession } = useTables();
  const { warning, error: toastError, success: toastSuccess } = useToast();
  const [targetTableId, setTargetTableId] = useState('');
  const [reason, setReason] = useState('');

  if (!sourceTable) return null;

  // Tables that are free to accept transfers
  const availableTables = tables.filter(
    (t) => t.status === 'available' && t.id !== sourceTable.id
  );

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) {
      warning('Please select an available destination table.', 'Target Required');
      return;
    }

    const ok = transferSession(sourceTable.id, targetTableId, reason);
    if (ok) {
      toastSuccess(`Session transferred successfully to destination table.`, 'Table Transferred');
      onClose();
    } else {
      toastError('Could not transfer table. Destination table might no longer be available.', 'Transfer Failed');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Table Session"
      subtitle={`Move active session from ${sourceTable.name} to another table`}
      maxWidth="md"
    >
      <form onSubmit={handleTransfer} className="space-y-4">
        {availableTables.length === 0 ? (
          <div className="p-4 bg-[rgba(255,61,0,0.08)] border border-[#FF3D00] rounded-[6px] text-center">
            <p className="text-xs text-[#FF3D00] font-medium">
              No other tables are currently available for transfer.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-[#60646C] uppercase tracking-wider mb-2">
              Select Destination Table
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableTables.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTargetTableId(t.id)}
                  className={`p-3 rounded-[6px] text-left transition-colors duration-150 ${
                    targetTableId === t.id
                      ? 'border-2 border-[#FF5900] bg-[#FF5900]/10 text-[#15191E]'
                      : 'border border-[#B9BBC6] bg-[#FFFFFF] text-[#15191E] hover:bg-[#15191E]/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-[#000000]">{t.name}</span>
                    <span className="text-xs font-mono font-semibold text-[#FF5900]">{formatINR(t.ratePerHour)}/hr (₹{(t.ratePerMinute ?? (t.ratePerHour / 60)).toFixed(2)}/m)</span>
                  </div>
                  <div className="text-[11px] text-[#60646C] mt-1 font-mono">
                    {t.size} · {t.clothColor}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#15191E] mb-1">
            Reason for Transfer
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for transfer"
            className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[#B9BBC6]">
          <Button variant="secondary" size="md" type="button" onClick={onClose} className="w-full sm:w-auto h-[44px] sm:h-auto">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={!targetTableId || availableTables.length === 0}
            icon={<ArrowRightLeft className="w-4 h-4" />}
            className="w-full sm:w-auto h-[44px] sm:h-auto"
          >
            Confirm Shift
          </Button>
        </div>
      </form>
    </Modal>
  );
};
