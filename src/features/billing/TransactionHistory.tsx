/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { SearchInput } from '../../components/ui/SearchInput';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { Bill } from '../../types/billing.types';
import { InvoiceReceipt } from './InvoiceReceipt';
import { Receipt, Eye, CreditCard, Banknote, QrCode, Wallet, Split, Trash2, RefreshCw } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const { bills, deleteBill, clearAllBills, refreshBills } = useBilling();
  const [search, setSearch] = useState('');
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBills();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredBills = bills.filter((b) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      b.invoiceNumber.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      (b.customerPhone && b.customerPhone.includes(q)) ||
      (b.tableName && b.tableName.toLowerCase().includes(q))
    );
  });

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'upi':
        return <QrCode className="w-3.5 h-3.5 text-[#0D9926]" />;
      case 'cash':
        return <Banknote className="w-3.5 h-3.5 text-[#FF5900]" />;
      case 'card':
        return <CreditCard className="w-3.5 h-3.5 text-[#006EF5]" />;
      case 'wallet':
        return <Wallet className="w-3.5 h-3.5 text-[#3C16D5]" />;
      case 'split':
        return <Split className="w-3.5 h-3.5 text-[#15191E]" />;
      default:
        return null;
    }
  };

  const totalSettledRevenue = bills.reduce((sum, b) => sum + b.finalTotal, 0);

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-[#000000] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#FF5900]" /> Billing & Invoice Register
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Audit history of all settled table folios, counter sales, and tax receipts
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] px-4 py-2.5 rounded-[8px] flex items-center gap-3 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
            <span className="text-xs text-[#60646C] font-medium">Total Registered Revenue:</span>
            <span className="text-lg font-mono font-bold text-[#FF5900]">
              {formatINR(totalSettledRevenue)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 px-3 bg-[#FFFFFF] border border-[#B9BBC6] hover:bg-[#F3F3F7] rounded-[8px] text-xs font-semibold text-[#15191E] flex items-center gap-1.5 transition-colors shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
            title="Sync latest register from cloud database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FF5900] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          {bills.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all invoices from the database and all devices?')) {
                  clearAllBills();
                }
              }}
              className="h-10 px-3 bg-[#FFF1F0] border border-[#FFCCC7] hover:bg-[#FF4D4F] hover:text-[#FFFFFF] rounded-[8px] text-xs font-semibold text-[#CF1322] flex items-center gap-1.5 transition-colors shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
              title="Clear all invoices from register"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search"
          className="w-full sm:w-96"
        />
      </div>

      {/* Bills Table */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-[#F3F3F7] text-[#60646C] font-semibold border-b border-[#B9BBC6] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Customer / Table</th>
                <th className="p-4">Breakdown</th>
                <th className="p-4">Payment</th>
                <th className="p-4 text-right">Total Paid</th>
                <th className="p-4 text-center">Receipt & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B9BBC6] text-[#15191E]">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8B8D98]">
                    No matching invoices found in register. All systems synced and live.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-[#15191E]/[0.02] transition-colors">
                    <td className="p-4 font-mono font-bold text-[#15191E]">
                      {bill.invoiceNumber}
                    </td>
                    <td className="p-4 text-[#60646C] font-mono">
                      {formatDateTime(bill.settledAt || bill.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-[#15191E]">{bill.customerName}</div>
                      {bill.tableName && (
                        <div className="text-[11px] text-[#006EF5] font-medium">{bill.tableName}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-[11px] text-[#60646C]">
                        Table: {formatINR(bill.tableCharge)} | Café: {formatINR(bill.cafeCharge)}
                      </div>
                      {bill.discountAmount > 0 && (
                        <div className="text-[10px] text-[#0D9926] font-bold">
                          Disc: - {formatINR(bill.discountAmount)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-medium capitalize text-[#15191E]">
                        {getMethodIcon(bill.paymentMethod)}
                        <span>{bill.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sm text-[#15191E]">
                      {formatINR(bill.finalTotal)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewBill(bill)}
                          className="w-8 h-8 rounded-[6px] bg-[#F3F3F7] border border-[#B9BBC6] hover:bg-[#FFFFFF] inline-flex items-center justify-center text-[#60646C] hover:text-[#15191E] transition-colors"
                          title="View & Re-print Tax Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Permanently delete invoice ${bill.invoiceNumber} for ${bill.customerName}?`)) {
                              deleteBill(bill.id);
                            }
                          }}
                          className="w-8 h-8 rounded-[6px] bg-[#FFF1F0] border border-[#FFCCC7] hover:bg-[#FF4D4F] hover:text-[#FFFFFF] inline-flex items-center justify-center text-[#CF1322] transition-colors"
                          title="Delete this invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal Preview */}
      <InvoiceReceipt
        bill={previewBill}
        isOpen={!!previewBill}
        onClose={() => setPreviewBill(null)}
      />
    </div>
  );
};



