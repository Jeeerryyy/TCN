/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState, useEffect } from 'react';
import { Table } from '../../types/table.types';
import { PaymentMethod, SplitPaymentShare } from '../../types/billing.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useBilling } from '../../context/BillingContext';
import { useCustomers } from '../../context/CustomerContext';
import { useTables } from '../../context/TableContext';
import { useCafe } from '../../context/CafeContext';
import { formatINR, formatTimeOnly } from '../../utils/formatters';
import { getReceiptConfig } from '../../utils/receiptStorage';
import {
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  Split,
  Tag,
  Check,
  Trash2,
  Plus,
  Minus,
  User,
  Phone,
  Clock,
  CupSoda,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface SettleBillModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EditableBillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isCustom?: boolean;
}

export const SettleBillModal: React.FC<SettleBillModalProps> = ({
  table,
  isOpen,
  onClose,
}) => {
  const { getPendingFolioForTable, settleTableBill } = useBilling();
  const { activeSessionsMap } = useTables();
  const { customers } = useCustomers();
  const { menu } = useCafe();
  const { warning, success } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');

  // Editable guest details
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Interactive items list
  const [itemsList, setItemsList] = useState<EditableBillItem[]>([]);

  // Add extra item state
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [showCustomItemRow, setShowCustomItemRow] = useState<boolean>(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number | ''>('');

  // Split payment state
  const [cashShare, setCashShare] = useState<number>(0);
  const [upiShare, setUpiShare] = useState<number>(0);

  const session = table ? activeSessionsMap[table.id] : null;
  const folio = table ? getPendingFolioForTable(table.id) : null;

  // Initialize or re-sync form state when modal opens
  useEffect(() => {
    if (isOpen && session && folio) {
      setGuestName(session.primaryCustomerName || '');
      setGuestPhone(session.primaryCustomerPhone || '');
      setPaymentMethod('upi');
      setCustomDiscount(0);
      setDiscountReason('');
      setShowCustomItemRow(false);
      setCustomItemName('');
      setCustomItemPrice('');
      setSelectedMenuItemId('');
      setAddQuantity(1);

      // Populate initial café items from table folio
      const initialItems: EditableBillItem[] = folio.cafeItems.map((item, idx) => ({
        id: `folio_${idx}_${Date.now()}`,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));
      setItemsList(initialItems);
    }
  }, [isOpen, table?.id]);

  if (!table || !session || !folio) return null;

  const customer = session.customerId
    ? customers.find((c) => c.id === session.customerId)
    : undefined;

  const sessionEndTime = session.endTime || session.pausedAt || new Date().toISOString();

  // Dynamic calculations based on modified items list
  const currentCafeTotal = itemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculatedSubtotal = folio.tableCharge + currentCafeTotal;
  const totalDiscount = folio.tierDiscountAmount + (customDiscount || 0);
  const finalTotal = Math.max(0, calculatedSubtotal - totalDiscount);

  // Line item handlers
  const handleRemoveItem = (id: string) => {
    setItemsList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setItemsList((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as EditableBillItem[]
    );
  };

  const handleAddFromMenu = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedMenuItemId) return;

    const menuItem = menu.find((m) => m.id === selectedMenuItemId);
    if (!menuItem) return;

    setItemsList((prev) => {
      const existingIdx = prev.findIndex((i) => i.name.toLowerCase() === menuItem.name.toLowerCase());
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + (addQuantity || 1),
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `menu_${menuItem.id}_${Date.now()}`,
          name: menuItem.name,
          price: menuItem.price,
          quantity: addQuantity || 1,
        },
      ];
    });

    setSelectedMenuItemId('');
    setAddQuantity(1);
    success(`Added ${menuItem.name} to bill tab.`, 'Item Added');
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) {
      warning('Please enter an item name (e.g. Extra Bottle, Soda).', 'Missing Name');
      return;
    }
    const priceNum = Number(customItemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      warning('Please enter a valid price.', 'Invalid Price');
      return;
    }

    setItemsList((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        name: customItemName.trim(),
        price: priceNum,
        quantity: addQuantity || 1,
        isCustom: true,
      },
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setAddQuantity(1);
    setShowCustomItemRow(false);
    success(`Added custom item "${customItemName.trim()}" to bill.`, 'Custom Item Added');
  };

  // Final bill settlement submission
  const handleFinalDone = (e: React.FormEvent) => {
    e.preventDefault();

    let splitShares: SplitPaymentShare[] | undefined;
    if (paymentMethod === 'split') {
      if (cashShare + upiShare !== finalTotal) {
        warning(
          `Split amounts must equal the final total of ${formatINR(finalTotal)}. Currently: ${formatINR(cashShare + upiShare)}`,
          'Split Total Mismatch'
        );
        return;
      }
      splitShares = [
        { method: 'cash', amount: cashShare },
        { method: 'upi', amount: upiShare },
      ];
    }

    const receiptConfig = getReceiptConfig();
    const bill = settleTableBill({
      tableId: table.id,
      paymentMethod,
      splitShares,
      customDiscountAmount: customDiscount || undefined,
      discountReason: discountReason || undefined,
      cashierName: receiptConfig.defaultCashierName || 'Duty Cashier',
      customerName: guestName.trim() || undefined,
      customerPhone: guestPhone.trim() || undefined,
      customItems: itemsList.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      tableChargeOverride: folio.tableCharge,
    });

    if (bill) {
      success(
        `Final bill generated for ${table.name}. Invoice #${bill.invoiceNumber}`,
        'Bill Finalized'
      );
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
      title={`Bill Preview & Adjustments · ${table.name}`}
      subtitle={`Session for ${guestName || session.primaryCustomerName} · Timer Frozen: ${formatTimeOnly(session.startTime)} – ${formatTimeOnly(sessionEndTime)} (${folio.billedHours} hr${folio.billedHours > 1 ? 's' : ''} billed)`}
      maxWidth="lg"
    >
      <form onSubmit={handleFinalDone} className="space-y-4">
        {/* Customer Details Header Bar (Editable in Preview) */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] p-3 space-y-2">
          <div className="text-xs font-semibold text-[#15191E] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF5900]" /> Guest Contact & Billing Info
            </span>
            <span className="text-[11px] text-[#60646C] font-mono">
              Table: {table.name} ({table.type.toUpperCase()})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-[#60646C] mb-1">
                Guest / Host Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8B8D98]" />
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full h-[36px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-8 pr-3 text-xs text-[#15191E] font-medium focus:outline-none focus:border-[#006EF5] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#60646C] mb-1">
                Mobile / Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8B8D98]" />
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full h-[36px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-8 pr-3 text-xs text-[#15191E] font-mono font-medium focus:outline-none focus:border-[#006EF5] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Folio Details (Interactive with Remove & Add) */}
        <div className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#B9BBC6]">
            <span className="font-semibold text-[#15191E] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF5900]" /> Game Session Duration & Table Charge
            </span>
            <span className="text-[#60646C] font-mono text-[11px] font-medium">
              Start: {formatTimeOnly(session.startTime)} · Stopped: {formatTimeOnly(sessionEndTime)}
            </span>
          </div>

          {/* Table Charge (Frozen duration) */}
          <div className="flex justify-between items-center text-xs">
            <div>
              <div className="font-medium text-[#000000]">
                {table.name} ({folio.billedMinutes} mins @ ₹{(session.ratePerMinute ?? folio.ratePerMinute ?? (session.ratePerHour / 60)).toFixed(2)}/min)
              </div>
              <div className="text-[11px] text-[#60646C] font-mono">
                Rate: ₹{(session.ratePerMinute ?? folio.ratePerMinute ?? (session.ratePerHour / 60)).toFixed(2)}/min ({formatINR(session.ratePerHour)}/hr) · Total Duration: {folio.billedMinutes} mins
              </div>
            </div>
            <span className="font-mono font-bold text-[#15191E] text-sm">
              {formatINR(folio.tableCharge)}
            </span>
          </div>

          {/* Consumables & Beverages List (With Remove & Quantity Adjusters) */}
          <div className="pt-2 border-t border-[#B9BBC6] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-semibold text-[#60646C] uppercase tracking-wider flex items-center gap-1">
                <CupSoda className="w-3.5 h-3.5 text-[#006EF5]" /> Beverages & Café Items ({itemsList.length})
              </span>
              <span className="text-[11px] text-[#60646C] font-mono">
                Tab: {formatINR(currentCafeTotal)}
              </span>
            </div>

            {itemsList.length === 0 ? (
              <div className="text-xs text-[#8B8D98] italic py-1 bg-[#FFFFFF] rounded p-2.5 text-center border border-dashed border-[#B9BBC6]">
                No beverages or food items attached yet. You can add extra bottles or snacks below.
              </div>
            ) : (
              <div className="space-y-1.5 bg-[#FFFFFF] rounded-[6px] p-2.5 border border-[#B9BBC6] max-h-48 overflow-y-auto">
                {itemsList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs text-[#15191E] p-1.5 rounded hover:bg-[#F3F3F7] transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="text-[10px] text-[#60646C] font-mono">
                        @{formatINR(item.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-[#F3F3F7] border border-[#B9BBC6] rounded p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#FFFFFF] text-[#15191E] transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#FFFFFF] text-[#15191E] transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <span className="font-mono font-semibold text-[#15191E] w-14 text-right">
                        {formatINR(item.price * item.quantity)}
                      </span>

                      {/* Remove Entry Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-6 h-6 flex items-center justify-center text-[#CF1322] hover:bg-[#FFF1F0] rounded transition-colors"
                        title="Remove this entry from bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick-Add Extra Item / Beverage / Bottle Section */}
          <div className="pt-2 border-t border-[#B9BBC6]">
            {!showCustomItemRow ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#15191E] flex items-center justify-between">
                  <span>+ Add Extra Bottle / Beverage / Snack to Bill</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomItemRow(true)}
                    className="text-[#006EF5] hover:underline font-normal text-[11px]"
                  >
                    Custom item not in menu?
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={selectedMenuItemId}
                    onChange={(e) => setSelectedMenuItemId(e.target.value)}
                    className="flex-1 h-[36px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-2 text-xs text-[#15191E] focus:outline-none focus:border-[#006EF5]"
                  >
                    <option value="">-- Choose item from café menu --</option>
                    {menu
                      .filter((m) => m.isAvailable)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.category}) — {formatINR(m.price)}
                        </option>
                      ))}
                  </select>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-[#60646C]">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-12 h-[36px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-2 text-center text-xs font-mono font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddFromMenu()}
                    disabled={!selectedMenuItemId}
                    className="h-[36px] px-3 bg-[#FFFFFF] border border-[#B9BBC6] hover:bg-[#F3F3F7] active:bg-[#E5E5EB] disabled:opacity-40 text-xs font-semibold text-[#15191E] rounded-[6px] flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#006EF5]" /> Add Item
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] p-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#15191E]">
                  <span>Add Custom Off-Menu Item (e.g. Extra Bottle, Cigarettes, Juice)</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomItemRow(false)}
                    className="text-[#60646C] hover:text-[#15191E] text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="Item Name (e.g. Extra Bottle)"
                    className="h-[36px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-2.5 text-xs text-[#15191E]"
                  />
                  <input
                    type="number"
                    min="0"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Price (₹)"
                    className="h-[36px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-2.5 text-xs text-[#15191E] font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="h-[36px] bg-[#FF5900] hover:bg-[#E64E00] text-white rounded-[6px] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add to Tab
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Subtotal Display */}
          <div className="pt-2 border-t border-[#B9BBC6] flex justify-between text-xs font-semibold text-[#15191E]">
            <span>Subtotal (Table + Beverages)</span>
            <span className="font-mono font-bold text-sm text-[#15191E]">
              {formatINR(calculatedSubtotal)}
            </span>
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
              max={calculatedSubtotal}
              value={customDiscount || ''}
              onChange={(e) => setCustomDiscount(Number(e.target.value))}
              placeholder="Custom discount (₹)"
              className="w-full sm:w-1/2 h-[38px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-xs text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5]"
            />
            <input
              type="text"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="Discount reason (e.g. Regular guest courtesy)"
              className="flex-1 h-[38px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-xs text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5]"
            />
          </div>

          {/* Grand Total */}
          <div className="pt-2 border-t border-[#B9BBC6]">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-[#15191E]">Final Amount to Collect</span>
              <span className="text-xl font-mono text-[#FF5900] font-bold">
                {formatINR(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Methods Selection */}
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
                className={`p-3 rounded-[6px] text-left flex items-center gap-2.5 transition-colors duration-150 min-h-[44px] active:scale-[0.98] ${
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
                  placeholder="Enter cash share"
                  className="w-full h-[38px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-xs text-[#15191E] font-mono focus:outline-none focus:border-[#006EF5]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#60646C] mb-1 font-medium">UPI Share (₹)</label>
                <input
                  type="number"
                  value={upiShare || ''}
                  onChange={(e) => setUpiShare(Number(e.target.value))}
                  placeholder="Enter UPI share"
                  className="w-full h-[38px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-xs text-[#15191E] font-mono focus:outline-none focus:border-[#006EF5]"
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

        {/* Action Controls - Final Done Button */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[#B9BBC6]">
          <Button
            variant="secondary"
            size="md"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-[44px] sm:h-auto"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            type="submit"
            icon={<Check className="w-5 h-5 text-white" />}
            className="w-full sm:w-auto h-[44px] sm:h-auto font-bold text-sm bg-[#0D9926] hover:bg-[#0B8220] active:bg-[#096B1A] border-none shadow-md"
          >
            ✓ Final Done — Generate Bill ({formatINR(finalTotal)})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
