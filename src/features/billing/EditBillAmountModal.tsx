/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState } from 'react';
import { Bill } from '../../types/billing.types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { KeyRound, History, ArrowRight, ShieldCheck } from 'lucide-react';

interface EditBillAmountModalProps {
  bill: Bill;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newAmount: number, reason: string, adminPin: string) => Promise<{ success: boolean; error?: string }>;
}

export const EditBillAmountModal: React.FC<EditBillAmountModalProps> = ({
  bill,
  isOpen,
  onClose,
  onSave,
}) => {
  const { pins } = useAuth();
  const { success, error: toastError } = useToast();

  const [newAmount, setNewAmount] = useState<number | ''>(bill.finalTotal);
  const [reason, setReason] = useState<string>('');
  const [adminPin, setAdminPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setNewAmount(bill.finalTotal);
    setReason('');
    setAdminPin('');
    setErrorMessage(null);
    onClose();
  };

  const numNew = Number(newAmount);
  const diff = !isNaN(numNew) ? numNew - bill.finalTotal : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isNaN(numNew) || numNew < 0) {
      setErrorMessage('Please enter a valid positive bill total in INR.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Please provide a mandatory reason for adjusting this bill.');
      return;
    }

    const enteredPin = adminPin.trim();
    if (enteredPin.length !== 4) {
      setErrorMessage('Admin PIN must be exactly 4 digits.');
      return;
    }

    if (enteredPin !== pins.admin) {
      setErrorMessage('Incorrect Admin PIN. Access denied.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSave(numNew, reason.trim(), enteredPin);
      if (res.success) {
        success(
          `Invoice #${bill.invoiceNumber} updated to ${formatINR(numNew)}.`,
          'Bill Amount Adjusted'
        );
        handleClose();
      } else {
        setErrorMessage(res.error || 'Failed to update bill amount.');
        toastError(res.error || 'Update failed', 'Action Rejected');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Edit Final Bill Amount: #${bill.invoiceNumber}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Notice Header */}
        <div className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[8px] p-3 text-xs space-y-1">
          <div className="flex justify-between items-center text-[#60646C]">
            <span>Customer: <strong className="text-[#15191E]">{bill.customerName}</strong></span>
            <span>Date: {formatDateTime(bill.settledAt || bill.createdAt)}</span>
          </div>
          <div className="text-[11px] text-[#60646C]">
            Table Time, Café Items, and hourly rates are locked to preserve audit integrity. Only the final settlement figure is editable.
          </div>
        </div>

        {/* Amount Adjustment Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px]">
          <div>
            <label className="block text-[11px] font-semibold text-[#60646C] uppercase tracking-wider mb-1">
              Current Final Amount
            </label>
            <div className="text-lg font-mono font-bold text-[#15191E]">
              {formatINR(bill.finalTotal)}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#006EF5] uppercase tracking-wider mb-1">
              New Final Amount (₹) <span className="text-[#FF5900]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-mono text-[#8B8D98]">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full h-[36px] pl-6 pr-3 font-mono font-bold text-sm bg-[#FFFFFF] border border-[#006EF5] rounded-[6px] text-[#15191E] focus:outline-none focus:ring-2 focus:ring-[#006EF5]/20"
              />
            </div>
          </div>
        </div>

        {/* Live Variance Calculation */}
        {diff !== 0 && (
          <div
            className={`p-2.5 rounded-[6px] border text-xs flex items-center justify-between font-mono ${
              diff < 0
                ? 'bg-[#EBF7EE] border-[#0D9926]/30 text-[#0D9926]'
                : 'bg-[#FFF4ED] border-[#FF5900]/30 text-[#FF5900]'
            }`}
          >
            <span>Adjustment Variance:</span>
            <span className="font-bold">
              {diff > 0 ? `+ ${formatINR(diff)} (Addition)` : `- ${formatINR(Math.abs(diff))} (Reduction)`}
            </span>
          </div>
        )}

        {/* Reason for Edit */}
        <div>
          <label className="block text-xs font-semibold text-[#15191E] mb-1">
            Reason for Adjustment <span className="text-[#FF5900]">*</span>
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. VIP discount approved by management, waived round-off"
            className="w-full h-[38px] px-3 text-xs bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[#15191E] focus:outline-none focus:border-[#FF5900]"
          />
        </div>

        {/* Admin PIN */}
        <div>
          <label className="block text-xs font-semibold text-[#15191E] mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#FF5900]" /> Admin Authorization PIN <span className="text-[#FF5900]">*</span>
            </span>
            <span className="text-[10px] text-[#8B8D98] font-mono">Default: 8888</span>
          </label>
          <input
            type="password"
            maxLength={4}
            required
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter 4-digit Admin PIN"
            className="w-full h-[38px] px-3 text-center tracking-[0.5em] font-mono font-bold text-sm bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[#15191E] focus:outline-none focus:border-[#FF5900]"
          />
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="text-xs text-[#CF1322] font-semibold bg-[#FFF1F0] p-2 rounded border border-[#FFCCC7]">
            {errorMessage}
          </div>
        )}

        {/* Past Audit Log entries if this bill was previously edited */}
        {bill.auditLog && bill.auditLog.length > 0 && (
          <div className="pt-2 border-t border-[#B9BBC6] space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#60646C] tracking-wider flex items-center gap-1">
              <History className="w-3 h-3" /> Audit Log ({bill.auditLog.length} previous adjustments)
            </span>
            <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] bg-[#F8F9FA] p-2 rounded border border-[#B9BBC6]/60">
              {bill.auditLog.map((log) => (
                <div key={log.id} className="text-[#60646C] font-mono flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[#15191E]">
                    <span>
                      {formatINR(log.originalAmount)} <ArrowRight className="inline w-2.5 h-2.5 mx-1" /> {formatINR(log.newAmount)}
                    </span>
                    <span className="text-[10px] text-[#8B8D98]">{log.changedBy}</span>
                  </div>
                  <div className="text-[10px] italic">"{log.reason}" · {formatDateTime(log.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-[#B9BBC6] flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="md" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || adminPin.length !== 4 || !reason.trim() || newAmount === ''}
            icon={<ShieldCheck className="w-4 h-4" />}
          >
            {isSubmitting ? 'Saving...' : 'Save Amount & Log Audit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
