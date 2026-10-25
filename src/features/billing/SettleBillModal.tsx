/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { Table } from '../../types/table.types';
import { PaymentMethod, SplitPaymentShare } from '../../types/billing.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useBilling } from '../../context/BillingContext';
import { useCustomers } from '../../context/CustomerContext';
import { useTables } from '../../context/TableContext';
import { formatINR, formatTimeOnly } from '../../utils/formatters';
import { CreditCard, Banknote, QrCode, Wallet, Split, Tag, Check } from 'lucide-react';

interface SettleBillModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SettleBillModal: React.FC<SettleBillModalProps> = ({
  table,
  isOpen,
  onClose,
}) => {
  const { getPendingFolioForTable, settleTableBill } = useBilling();
  const { activeSessionsMap } = useTables();
  const { customers } = useCustomers();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  
  // Split payment state
  const [cashShare, setCashShare] = useState<number>(0);
  const [upiShare, setUpiShare] = useState<number>(0);

  if (!table) return null;

  const session = activeSessionsMap[table.id];
  const folio = getPendingFolioForTable(table.id);

  if (!session || !folio) return null;

  const customer = session.customerId
    ? customers.find((c) => c.id === session.customerId)
    : undefined;

  const sessionEndTime = session.endTime || session.pausedAt || new Date().toISOString();
  const totalDiscount = folio.tierDiscountAmount + (customDiscount || 0);
  const finalTotal = Math.max(0, folio.subtotal - totalDiscount);

  const handleSettle = (e: React.FormEvent) => {
    e.preventDefault();

    let splitShares: SplitPaymentShare[] | undefined;
    if (paymentMethod === 'split') {
      if (cashShare + upiShare !== finalTotal) {
        alert(`Split amounts must equal the final total of ${formatINR(finalTotal)}. Currently: ${formatINR(cashShare + upiShare)}`);
        return;
      }
      splitShares = [
        { method: 'cash', amount: cashShare },
        { method: 'upi', amount: upiShare },
      ];
    }

    const bill = settleTableBill({
      tableId: table.id,
      paymentMethod,
      splitShares,
      customDiscountAmount: customDiscount || undefined,
      discountReason: discountReason || undefined,
      cashierName: 'Duty Cashier',
    });

    if (bill) {
      onClose();
    }
  };

  const paymentOptions: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'upi', label: 'UPI / QR Code', icon: <QrCode className="w-4 h-4 text-[#0D9926]" /> },
    { id: 'cash', label: 'Cash Drawer', icon: <Banknote className="w-4 h-4 text-[#FF5900]" /> },
    { id: 'card', label: 'Card POS Terminal', icon: <CreditCard className="w-4 h-4 text-[#006EF5]" /> },
    { id: 'wallet', label: 'Member Wallet', icon: <Wallet className="w-4 h-4 text-[#3C16D5]" /> },
    { id: 'split', label: 'Split Payment', icon: <Split className="w-4 h-4 text-[#15191E]" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Settle Bill · ${table.name}`}
      subtitle={`Session for ${session.primaryCustomerName} · ${formatTimeOnly(session.startTime)} – ${formatTimeOnly(sessionEndTime)} (${folio.billedHours} hr${folio.billedHours > 1 ? 's' : ''} billed)`}
      maxWidth="lg"
    >
      <form onSubmit={handleSettle} className="space-y-4">
        {/* Bill Breakdown Container */}
        <div className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#B9BBC6]">
            <span className="font-semibold text-[#15191E]">Itemized Folio Details</span>
            <span className="text-[#60646C] font-mono text-[11px] font-medium">
              Start: {formatTimeOnly(session.startTime)} · End: {formatTimeOnly(sessionEndTime)}
            </span>
          </div>

          {/* Table Charge */}
          <div className="flex justify-between items-center text-xs">
            <div>
              <div className="font-medium text-[#000000]">
                {table.name} ({folio.billedHours} hr${folio.billedHours > 1 ? 's' : ''})
              </div>
              <div className="text-[11px] text-[#60646C] font-mono">
                Rate: {formatINR(session.ratePerHour)}/hr
              </div>
            </div>
            <span className="font-mono font-semibold text-[#15191E]">{formatINR(folio.tableCharge)}</span>
          </div>

          {/* Linked Cafe Items */}
          {folio.cafeItems.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#B9BBC6]">
              <div className="text-[10px] font-semibold text-[#60646C] uppercase tracking-wider">
                Café Consumption
              </div>
              {folio.cafeItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-[#15191E]">
                  <span>
                    <span className="text-[#60646C] font-mono font-bold mr-1">{item.quantity}x</span>
                    {item.name}
                  </span>
                  <span className="font-mono font-semibold text-[#15191E]">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Subtotal */}
          <div className="pt-2 border-t border-[#B9BBC6] flex justify-between text-xs font-semibold text-[#15191E]">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-[#15191E]">{formatINR(folio.subtotal)}</span>
          </div>

          {/* Tier Discount Display */}
          {folio.tierDiscountAmount > 0 && (
            <div className="flex justify-between text-xs text-[#0D9926] font-semibold">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#0D9926]" /> Member Tier Benefit ({customer?.tier?.toUpperCase()})
              </span>
              <span className="font-mono font-bold">- {formatINR(folio.tierDiscountAmount)}</span>
            </div>
          )}

          {/* Custom Discount Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="number"
              min="0"
              max={folio.subtotal}
              value={customDiscount || ''}
              onChange={(e) => setCustomDiscount(Number(e.target.value))}
              placeholder="Enter the amount"
              className="w-full sm:w-1/2 h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
            />
            <input
              type="text"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="Enter the reason"
              className="flex-1 h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
            />
          </div>

          {/* Grand Total (GST Removed) */}
          <div className="pt-2 border-t border-[#B9BBC6]">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-[#15191E]">Final Amount to Pay</span>
              <span className="text-xl font-mono text-[#FF5900] font-bold">
                {formatINR(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <label className="block text-xs font-semibold text-[#60646C] uppercase tracking-wider mb-2">
            Payment Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {paymentOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPaymentMethod(opt.id)}
                className={`p-3 rounded-[6px] text-left flex items-center gap-2.5 transition-colors duration-150 min-h-[48px] sm:min-h-[44px] active:scale-[0.98] ${
                  paymentMethod === opt.id
                    ? 'border-2 border-[#FF5900] bg-[#FF5900]/10 text-[#FF5900] font-semibold'
                    : 'border border-[#B9BBC6] bg-[#FFFFFF] text-[#15191E] hover:bg-[#15191E]/[0.04]'
                }`}
              >
                {opt.icon}
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Split Payment Share Inputs */}
        {paymentMethod === 'split' && (
          <div className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-3 space-y-2">
            <div className="text-xs font-semibold text-[#15191E]">Enter Split Breakdown</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-[#60646C] mb-1 font-medium">Cash Share (₹)</label>
                <input
                  type="number"
                  value={cashShare || ''}
                  onChange={(e) => setCashShare(Number(e.target.value))}
                  placeholder="Enter the amount"
                  className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#60646C] mb-1 font-medium">UPI Share (₹)</label>
                <input
                  type="number"
                  value={upiShare || ''}
                  onChange={(e) => setUpiShare(Number(e.target.value))}
                  placeholder="Enter the amount"
                  className="w-full h-[44px] sm:h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
                />
              </div>
            </div>
            <div className="text-[11px] text-[#60646C] flex justify-between pt-1 font-medium">
              <span>Remaining to allocate:</span>
              <span className="font-mono font-bold text-[#15191E]">
                {formatINR(finalTotal - (cashShare + upiShare))}
              </span>
            </div>
          </div>
        )}

        {/* Member Wallet Balance Check */}
        {paymentMethod === 'wallet' && customer && (
          <div className="p-3 bg-[#D5E8FB] border border-[#006EF5]/30 rounded-[6px] flex items-center justify-between text-xs">
            <div>
              <div className="text-[#60646C] font-medium">Available Member Credit</div>
              <div className="text-[#006EF5] font-mono font-bold text-sm">
                {formatINR(customer.walletBalance)}
              </div>
            </div>
            {customer.walletBalance < finalTotal ? (
              <span className="text-[#FF3D00] text-[11px] font-semibold">Insufficient Balance</span>
            ) : (
              <span className="text-[#0D9926] text-[11px] font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#0D9926]" /> Sufficient Credit
              </span>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[#B9BBC6]">
          <Button variant="secondary" size="md" type="button" onClick={onClose} className="w-full sm:w-auto h-[44px] sm:h-auto">
            Cancel
          </Button>
          <Button variant="primary" size="lg" type="submit" icon={<CreditCard className="w-4 h-4" />} className="w-full sm:w-auto h-[44px] sm:h-auto">
            Confirm Payment ({formatINR(finalTotal)})
          </Button>
        </div>
      </form>
    </Modal>
  );
};

