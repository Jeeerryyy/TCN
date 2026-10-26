/* Brex & Thermal POS Design System – Exact Match to TCN Production Thermal Bill */

import React, { useState, useEffect } from 'react';
import { Bill } from '../../types/billing.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatINR, formatDateTime, formatTimeOnly } from '../../utils/formatters';
import { printThermalReceipt } from '../../utils/printReceipt';
import { getReceiptConfig, onReceiptConfigChange } from '../../utils/receiptStorage';
import { ReceiptConfig } from '../../types/receipt.types';
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
  const [config, setConfig] = useState<ReceiptConfig>(getReceiptConfig);

  useEffect(() => {
    setConfig(getReceiptConfig());
    const unsubscribe = onReceiptConfigChange((updated) => setConfig(updated));
    return unsubscribe;
  }, []);

  if (!bill) return null;

  const handlePrint = () => {
    printThermalReceipt(bill, config);
  };

  const copyReceiptSummary = () => {
    const text = `${config.venueName}
Invoice: ${bill.invoiceNumber}
Date: ${formatDateTime(bill.settledAt || bill.createdAt)}
Customer: ${bill.customerName}${bill.customerPhone ? ` (${bill.customerPhone})` : ''}
Table: ${bill.tableName || 'N/A'}${
      bill.sessionStartTime
        ? `\nStart Time: ${formatTimeOnly(bill.sessionStartTime)}\nEnd Time: ${formatTimeOnly(bill.sessionEndTime || bill.settledAt)}`
        : ''
    }
Total Paid: ${formatINR(bill.finalTotal)} via ${bill.paymentMethod.toUpperCase()}
${config.footerMessage1}`;

    navigator.clipboard.writeText(text);
    alert('Invoice details copied to clipboard!');
  };

  const startTimeStr = bill.sessionStartTime ? formatTimeOnly(bill.sessionStartTime) : null;
  const endTimeStr = bill.sessionEndTime
    ? formatTimeOnly(bill.sessionEndTime)
    : bill.settledAt
    ? formatTimeOnly(bill.settledAt)
    : null;

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
        <div className="bg-[#D1F4D2] border border-[#0D9926]/30 rounded-[6px] p-3 flex items-center gap-2.5 text-xs text-[#0D9926] font-semibold print:hidden">
          <CheckCircle className="w-5 h-5 shrink-0 text-[#0D9926]" />
          <span>Payment settled & table session released to floor inventory.</span>
        </div>

        {/* Thermal Receipt Paper Card (Matches Attached Image Pixel-for-Pixel) */}
        <div
          id="tcn-thermal-receipt-card"
          className="bg-[#FFFFFF] text-[#15191E] border border-[#B9BBC6] rounded-[8px] p-6 sm:p-7 font-mono text-xs shadow-[0px_4px_16px_rgba(0,0,0,0.06)] space-y-3.5 max-w-[380px] mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:w-full"
        >
          {/* Brand Header */}
          <div className="text-center space-y-1">
            <h2 className="text-base font-extrabold text-[#000000] font-sans tracking-wide uppercase">
              {config.venueName}
            </h2>
            {config.tagline && (
              <div className="text-[11px] text-[#555555]">
                {config.tagline}
              </div>
            )}
            {config.addressLine && (
              <div className="text-[10px] text-[#666666]">
                {config.addressLine}
              </div>
            )}
          </div>

          {/* Dashed Divider */}
          <div className="border-b border-dashed border-[#888888]" />

          {/* Metadata Section */}
          <div className="space-y-1 text-[11px] text-[#222222]">
            <div className="flex justify-between items-baseline">
              <span className="text-[#444444]">Invoice No:</span>
              <span className="font-bold text-[#000000]">{bill.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[#444444]">Date & Time:</span>
              <span className="text-[#111111]">{formatDateTime(bill.settledAt || bill.createdAt)}</span>
            </div>
            {config.showCustomerName && bill.customerName && (
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">Customer:</span>
                <span className="font-bold text-[#000000]">{bill.customerName}</span>
              </div>
            )}
            {bill.customerPhone && (
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">Phone:</span>
                <span className="font-bold text-[#000000]">{bill.customerPhone}</span>
              </div>
            )}
            {bill.tableName && (
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">Table:</span>
                <span className="text-[#111111]">{bill.tableName}</span>
              </div>
            )}
            {config.showStartEndTime && startTimeStr && (
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">Start Time:</span>
                <span className="font-bold text-[#000000]">{startTimeStr}</span>
              </div>
            )}
            {config.showStartEndTime && endTimeStr && (
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">End Time:</span>
                <span className="font-bold text-[#000000]">{endTimeStr}</span>
              </div>
            )}
            {config.showCashier && (
              <div className="flex justify-between items-baseline">
                <span className="text-[#444444]">Cashier:</span>
                <span className="text-[#111111]">
                  {bill.settledByStaff || config.defaultCashierName || 'Duty Cashier'}
                </span>
              </div>
            )}
          </div>

          {/* Dashed Divider */}
          <div className="border-b border-dashed border-[#888888]" />

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-[11px] text-[#000000] pb-1">
              <span>Description</span>
              <span>Amt (₹)</span>
            </div>

            {bill.items.map((item, idx) => (
              <div key={idx} className="text-[11px] text-[#15191E] space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className="pr-2 font-medium">
                    {item.quantity > 1 ? `${item.quantity}x ` : ''}
                    {item.title}
                  </span>
                  <span className="font-semibold text-[#000000]">{item.totalPrice}</span>
                </div>
                {item.subtitle && (
                  <div className="text-[10px] text-[#666666] pl-2 font-mono">
                    {item.subtitle}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dashed Divider */}
          <div className="border-b border-dashed border-[#888888]" />

          {/* Totals Section */}
          <div className="space-y-1.5 text-[11px] text-[#222222]">
            <div className="flex justify-between">
              <span className="text-[#444444]">Subtotal:</span>
              <span className="font-medium">₹ {bill.subtotal}</span>
            </div>

            {bill.discountAmount > 0 && (
              <div className="flex justify-between text-[#0D9926] font-semibold">
                <span>Discount ({bill.discountReason || 'Promo'}):</span>
                <span>- ₹ {bill.discountAmount}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-extrabold text-[#000000] pt-1.5 font-sans items-baseline">
              <span>TOTAL PAID:</span>
              <span className="font-mono font-bold text-[#FF5900] text-base">₹{bill.finalTotal}</span>
            </div>

            {config.showPaymentMode && (
              <div className="flex justify-between text-[10px] text-[#555555] pt-0.5">
                <span>Payment Mode:</span>
                <span className="uppercase font-semibold text-[#111111]">{bill.paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Dashed Divider */}
          <div className="border-b border-dashed border-[#888888]" />

          {/* Footer Messages */}
          <div className="text-center text-[10px] text-[#555555] space-y-0.5 pt-0.5">
            {config.footerMessage1 && <div>{config.footerMessage1}</div>}
            {config.footerMessage2 && (
              <div className="text-[9.5px] text-[#777777]">{config.footerMessage2}</div>
            )}
          </div>
        </div>

        {/* Modal Action Buttons (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#B9BBC6] print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={copyReceiptSummary}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5"
          >
            <Copy className="w-4 h-4 text-[#60646C]" />
            <span>Copy Summary</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Done
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#FF5900] hover:bg-[#E64E00] text-white"
            >
              <Printer className="w-4 h-4" />
              <span>Print Thermal Receipt</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
