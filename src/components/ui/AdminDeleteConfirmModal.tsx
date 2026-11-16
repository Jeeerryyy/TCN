/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, ShieldAlert, KeyRound } from 'lucide-react';

interface AdminDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityType: 'bill' | 'session' | 'order';
  itemDetails: string;
  onConfirm: (reason: string, adminPin: string) => Promise<{ success: boolean; error?: string }>;
}

export const AdminDeleteConfirmModal: React.FC<AdminDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  entityType,
  itemDetails,
  onConfirm,
}) => {
  const { pins } = useAuth();
  const { success, error: toastError } = useToast();

  const [adminPin, setAdminPin] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setAdminPin('');
    setDeleteReason('');
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. PIN verification
    const enteredPin = adminPin.trim();
    if (enteredPin.length !== 4) {
      setErrorMessage('Admin PIN must be exactly 4 digits.');
      return;
    }

    if (enteredPin !== pins.admin) {
      setErrorMessage('Incorrect Admin PIN. Access denied.');
      return;
    }

    // 2. Reason verification
    if (!deleteReason.trim()) {
      setErrorMessage('Please state a reason for archiving/deleting this record.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onConfirm(deleteReason.trim(), enteredPin);
      if (res.success) {
        success(`Successfully deleted and archived ${entityType} record.`, 'Record Archived');
        handleClose();
      } else {
        setErrorMessage(res.error || 'Failed to delete record.');
        toastError(res.error || 'Deletion failed', 'Action Rejected');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEntityLabel = () => {
    switch (entityType) {
      case 'bill':
        return 'Tax Invoice & Bill Record';
      case 'session':
        return 'Table Game Session';
      case 'order':
        return 'Café Order Ticket';
      default:
        return 'Record';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Callout */}
        <div className="bg-[#FFF1F0] border border-[#FFCCC7] rounded-[8px] p-3.5 flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-[#CF1322] shrink-0 mt-0.5" />
          <div className="text-xs text-[#820014] space-y-1">
            <div className="font-bold">Permanent Soft-Delete & Audit Archive</div>
            <p className="text-[11px] leading-relaxed">
              This will exclude this {getEntityLabel().toLowerCase()} from all revenue totals, register reports, and graphs. An audit entry with your admin signature will be retained.
            </p>
          </div>
        </div>

        {/* Target Details */}
        <div className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-3 text-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#60646C] tracking-wider">
            Target Item
          </span>
          <div className="font-semibold text-[#15191E]">{itemDetails}</div>
        </div>

        {/* Deletion Reason Field */}
        <div>
          <label className="block text-xs font-semibold text-[#15191E] mb-1">
            Reason for Deletion <span className="text-[#CF1322]">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="e.g. Customer cancelled order / Test transaction / Billing dispute"
            className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[#15191E] focus:outline-none focus:border-[#CF1322]"
          />
        </div>

        {/* Admin PIN Authentication */}
        <div>
          <label className="block text-xs font-semibold text-[#15191E] mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#CF1322]" /> Admin Authorization PIN <span className="text-[#CF1322]">*</span>
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
            className="w-full h-[40px] px-3 text-center tracking-[0.5em] font-mono font-bold text-base bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[#15191E] focus:outline-none focus:border-[#CF1322]"
          />
        </div>

        {/* Error display */}
        {errorMessage && (
          <div className="text-xs text-[#CF1322] font-semibold bg-[#FFF1F0] p-2 rounded border border-[#FFCCC7]">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#B9BBC6]">
          <Button type="button" variant="secondary" size="md" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <button
            type="submit"
            disabled={isSubmitting || adminPin.length !== 4 || !deleteReason.trim()}
            className="h-[40px] px-4 rounded-[6px] bg-[#CF1322] hover:bg-[#A8071A] disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            {isSubmitting ? 'Archiving...' : 'Confirm Soft Delete'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
