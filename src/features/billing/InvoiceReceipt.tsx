/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React from 'react';
import { Bill } from '../../types/billing.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatINR, formatDateTime, formatTimeOnly } from '../../utils/formatters';
import { Printer, CheckCircle, Copy } from 'lucide-react';

interface InvoiceReceiptProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({
  bill,
  isOpen,
  onClose,
}) => {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const copyReceiptSummary = () => {
    const text = `The Cue Nation, Pune
Invoice: ${bill.invoiceNumber}
Date: ${formatDateTime(bill.settledAt || bill.createdAt)}
Customer: ${bill.customerName}
Table: ${bill.tableName || 'N/A'}${bill.sessionStartTime ? `\nStart Time: ${formatTimeOnly(bill.sessionStartTime)}\nEnd Time: ${formatTimeOnly(bill.sessionEndTime || bill.settledAt)}` : ''}
Final Paid: ${formatINR(bill.finalTotal)} via ${bill.paymentMethod.toUpperCase()}
Thank you for playing at TCN!`;

    navigator.clipboard.writeText(text);
    alert('Invoice details copied to clipboard!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settlement Complete"
      subtitle={`Invoice #${bill.invoiceNumber} finalized successfully`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Success Banner */}
        <div className="bg-[#D1F4D2] border border-[#0D9926]/30 rounded-[6px] p-3 flex items-center gap-2.5 text-xs text-[#0D9926] font-semibold">
          <CheckCircle className="w-5 h-5 shrink-0 text-[#0D9926]" />
          <span>Payment settled & table session released to floor inventory.</span>
        </div>

        {/* Printable Receipt Paper */}
        <div className="bg-[#FFFFFF] text-[#15191E] border border-[#B9BBC6] rounded-[8px] p-6 font-mono text-xs shadow-[0px_2px_8px_rgba(0,0,0,0.08)] space-y-4 print:p-0 print:m-0 print:text-black">
          {/* Receipt Brand Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-[#B9BBC6]">
            <h2 className="text-base font-bold text-[#000000] font-sans">
              THE CUE NATION
            </h2>
            <div className="text-[11px] text-[#60646C]">
              Billiards · Snooker · Artisanal Café
            </div>
            <div className="text-[10px] text-[#60646C]">
              FC Road / Senapati Bapat Marg, Pune, MH
            </div>
          </div>

          {/* Meta Info */}
          <div className="space-y-1 text-[11px] text-[#15191E]">
            <div className="flex justify-between">
              <span>Invoice No:</span>
              <span className="font-bold">{bill.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span>{formatDateTime(bill.settledAt || bill.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-bold">{bill.customerName}</span>
            </div>
            {bill.tableName && (
              <div className="flex justify-between">
                <span>Table:</span>
                <span>{bill.tableName}</span>
              </div>
            )}
            {bill.sessionStartTime && (
              <>
                <div className="flex justify-between">
                  <span>Start Time:</span>
                  <span className="font-bold">{formatTimeOnly(bill.sessionStartTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>End Time:</span>
                  <span className="font-bold">{formatTimeOnly(bill.sessionEndTime || bill.settledAt)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{bill.settledByStaff}</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-2 border-y border-dashed border-[#B9BBC6] space-y-2">
            <div className="flex justify-between font-bold text-[11px] text-[#000000]">
              <span>Description</span>
              <span>Amt (₹)</span>
            </div>
            {bill.items.map((item, idx) => (
              <div key={idx} className="text-[11px] text-[#15191E] space-y-0.5">
                <div className="flex justify-between">
                  <span className="pr-2 font-medium">
                    {item.quantity > 1 ? `${item.quantity}x ` : ''}
                    {item.title}
                  </span>
                  <span className="font-semibold">{item.totalPrice}</span>
                </div>
                {item.subtitle && (
                  <div className="text-[10px] text-[#60646C] pl-2 font-mono">
                    {item.subtitle}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Subtotals & Net Summary (GST Removed) */}
          <div className="space-y-1 text-[11px] text-[#15191E]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹ {bill.subtotal}</span>
            </div>

            {bill.discountAmount > 0 && (
              <div className="flex justify-between text-[#0D9926] font-semibold">
                <span>Discount ({bill.discountReason || 'Promo'}):</span>
                <span>- ₹ {bill.discountAmount}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-semibold text-[#000000] pt-2 border-t border-[#B9BBC6] font-sans">
              <span>TOTAL PAID:</span>
              <span className="font-mono font-bold text-[#FF5900]">{formatINR(bill.finalTotal)}</span>
            </div>

            <div className="flex justify-between text-[10px] text-[#60646C] pt-1">
              <span>Payment Mode:</span>
              <span className="uppercase font-semibold">{bill.paymentMethod}</span>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center text-[10px] text-[#60646C] pt-2 border-t border-dashed border-[#B9BBC6] space-y-0.5">
            <div>Visit Again! Keep cueing at TCN</div>
            <div>For feedback or tournament entries: +91 98220 14820</div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-[#B9BBC6]">
          <Button variant="secondary" size="md" onClick={copyReceiptSummary} icon={<Copy className="w-3.5 h-3.5" />} className="w-full sm:w-auto h-[44px] sm:h-auto">
            Copy Summary
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="secondary" size="md" onClick={handlePrint} icon={<Printer className="w-4 h-4" />} className="w-full sm:w-auto h-[44px] sm:h-auto">
              Print Receipt
            </Button>
            <Button variant="primary" size="md" onClick={onClose} className="w-full sm:w-auto h-[44px] sm:h-auto">
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
