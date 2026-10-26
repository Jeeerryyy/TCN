/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { SearchInput } from '../../components/ui/SearchInput';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { Bill } from '../../types/billing.types';
import { InvoiceReceipt } from './InvoiceReceipt';
import { ManualNotebookEntryModal } from './ManualNotebookEntryModal';
import { Receipt, Eye, CreditCard, Banknote, QrCode, Wallet, Split, Trash2, RefreshCw, BookOpen, Phone, Pencil, User, Check } from 'lucide-react';
import { TransactionHistorySkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export const TransactionHistory: React.FC = () => {
  const { bills, deleteBill, clearAllBills, refreshBills, updateBillDetails, isLoading } = useBilling();
  const [search, setSearch] = useState('');
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Edit customer & phone state for any bill
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const handleOpenEditCustomer = (bill: Bill) => {
    setEditingBill(bill);
    setEditCustomerName(bill.customerName);
    setEditCustomerPhone(bill.customerPhone || '');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    setIsSavingCustomer(true);
    await updateBillDetails(editingBill.id, {
      customerName: editCustomerName.trim() || editingBill.customerName,
      customerPhone: editCustomerPhone.trim(),
    });
    setIsSavingCustomer(false);
    setEditingBill(null);
  };

  if (isLoading && bills.length === 0) {
    return <TransactionHistorySkeleton />;
  }

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

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsManualModalOpen(true)}
            icon={<BookOpen className="w-4 h-4" />}
          >
            + Notebook Entry
          </Button>

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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[#15191E]">{bill.customerName}</span>
                        {bill.isManualEntry && (
                          <span className="text-[9px] bg-[#FFF0E6] text-[#FF5900] border border-[#FF5900]/30 px-1.5 py-0.2 rounded font-mono font-semibold">
                            Notebook
                          </span>
                        )}
                      </div>
                      {/* Customer Phone Display */}
                      <div className="mt-1 flex items-center gap-1">
                        {bill.customerPhone ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#006EF5] font-semibold bg-[#D5E8FB]/70 px-1.5 py-0.5 rounded border border-[#006EF5]/20">
                            <Phone className="w-3 h-3 text-[#006EF5]" />
                            {bill.customerPhone}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditCustomer(bill)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#FF5900] hover:underline font-mono"
                            title="Click to add phone number"
                          >
                            <Phone className="w-3 h-3" />
                            <span>+ Add Phone</span>
                          </button>
                        )}
                      </div>
                      {bill.tableName && (
                        <div className="text-[11px] text-[#60646C] font-medium mt-0.5">{bill.tableName}</div>
                      )}
                      {bill.notes && (
                        <div className="text-[10px] text-[#8B8D98] truncate max-w-[200px]" title={bill.notes}>
                          {bill.notes}
                        </div>
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
                          onClick={() => handleOpenEditCustomer(bill)}
                          className="w-8 h-8 rounded-[6px] bg-[#F3F3F7] border border-[#B9BBC6] hover:bg-[#FFFFFF] inline-flex items-center justify-center text-[#60646C] hover:text-[#006EF5] transition-colors"
                          title="Edit Customer Name & Phone Number"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
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

      {/* Manual / Notebook Entry Modal */}
      <ManualNotebookEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={(billId) => {
          const created = bills.find((b) => b.id === billId);
          if (created) {
            setPreviewBill(created);
          }
        }}
      />

      {/* Edit Customer & Phone Modal */}
      {editingBill && (
        <Modal
          isOpen={!!editingBill}
          onClose={() => setEditingBill(null)}
          title={`Edit Booking Details · ${editingBill.invoiceNumber}`}
          subtitle="Update customer details and mobile number for this registered booking"
          maxWidth="sm"
        >
          <form onSubmit={handleSaveCustomer} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#15191E] mb-1">
                Customer / Player Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-[#8B8D98]" />
                <input
                  type="text"
                  required
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-9 pr-3 text-sm text-[#15191E] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#15191E] mb-1">
                Customer Mobile / Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-[#8B8D98]" />
                <input
                  type="tel"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-9 pr-3 text-sm text-[#15191E] font-mono focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]"
                />
              </div>
              <p className="text-[11px] text-[#60646C] mt-1">
                This updates the customer contact details on this booking in the register and receipt.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#B9BBC6]">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setEditingBill(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isSavingCustomer}
                icon={<Check className="w-4 h-4" />}
              >
                {isSavingCustomer ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};



