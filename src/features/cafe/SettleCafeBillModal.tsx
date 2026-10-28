/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState, useEffect } from 'react';
import { CafeOrder } from '../../types/cafe.types';
import { PaymentMethod, SplitPaymentShare } from '../../types/billing.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useBilling } from '../../context/BillingContext';
import { useCustomers } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/formatters';
import {
  CreditCard,
  Banknote,
  QrCode,
  Split,
  Tag,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  Coffee,
  Check,
  ShoppingBag,
} from 'lucide-react';

interface EditableItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface SettleCafeBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If settling an existing CafeOrder (e.g. from Kitchen or Active Standalone list)
  order?: CafeOrder | null;
  // If settling directly from active cart
  cartItems?: { name: string; quantity: number; price: number; notes?: string }[];
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialDestination?: 'counter' | 'takeaway';
  onSuccess?: () => void;
}

export const SettleCafeBillModal: React.FC<SettleCafeBillModalProps> = ({
  isOpen,
  onClose,
  order,
  cartItems,
  initialCustomerName = '',
  initialCustomerPhone = '',
  initialDestination = 'counter',
  onSuccess,
}) => {
  const { settleStandaloneCafeBill } = useBilling();
  const { customers } = useCustomers();
  const { currentUser } = useAuth();
  const { success, warning } = useToast();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [destination, setDestination] = useState<'counter' | 'takeaway'>(initialDestination);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [cashShare, setCashShare] = useState<number>(0);
  const [upiShare, setUpiShare] = useState<number>(0);

  // Sync state whenever modal opens or order/cartItems change
  useEffect(() => {
    if (isOpen) {
      if (order) {
        setItems(
          order.items.map((i, idx) => ({
            id: `item_${idx}_${Date.now()}`,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            notes: i.notes,
          }))
        );
        setCustomerName(order.customerName || '');
        setCustomerPhone(order.customerPhone || '');
        setDestination(order.destination === 'takeaway' ? 'takeaway' : 'counter');
      } else if (cartItems && cartItems.length > 0) {
        setItems(
          cartItems.map((i, idx) => ({
            id: `item_${idx}_${Date.now()}`,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            notes: i.notes,
          }))
        );
        setCustomerName(initialCustomerName || '');
        setCustomerPhone(initialCustomerPhone || '');
        setDestination(initialDestination);
      }
      setPaymentMethod('upi');
      setDiscountAmount(0);
      setDiscountReason('');
      setCashReceived('');
    }
  }, [isOpen, order, cartItems, initialCustomerName, initialCustomerPhone, initialDestination]);

  // Handle phone auto-complete from CRM
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    const cleaned = val.replace(/[\s-]/g, '');
    if (cleaned.length >= 10) {
      const match = customers.find(
        (c) => c.phone && c.phone.replace(/[\s-]/g, '') === cleaned
      );
      if (match && (!customerName || customerName === 'Walk-in Guest' || customerName === 'Counter Guest')) {
        setCustomerName(match.name);
      }
    }
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as EditableItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const finalTotal = Math.max(0, subtotal - (discountAmount || 0));

  // Auto initialize split shares when switching to split
  useEffect(() => {
    if (paymentMethod === 'split') {
      const half = Math.round(finalTotal / 2);
      setCashShare(half);
      setUpiShare(finalTotal - half);
    }
  }, [paymentMethod, finalTotal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      warning('Please add at least one item to settle.', 'Empty Order');
      return;
    }

    let splitShares: SplitPaymentShare[] | undefined = undefined;
    if (paymentMethod === 'split') {
      const totalSplit = Number(cashShare) + Number(upiShare);
      if (totalSplit !== finalTotal) {
        warning(
          `Split shares (${formatINR(totalSplit)}) must match total (${formatINR(finalTotal)})`,
          'Split Mismatch'
        );
        return;
      }
      splitShares = [
        { method: 'cash', amount: Number(cashShare) },
        { method: 'upi', amount: Number(upiShare) },
      ];
    }

    const settled = settleStandaloneCafeBill({
      orderId: order?.id,
      customerName: customerName.trim() || 'Walk-in Guest',
      customerPhone: customerPhone.trim() || undefined,
      items: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        notes: i.notes,
      })),
      subtotal,
      discountAmount: discountAmount || 0,
      discountReason: discountReason.trim() || undefined,
      paymentMethod,
      splitShares,
      destination,
      cashierName: currentUser?.name || 'Café Cashier',
    });

    if (settled) {
      success(
        `Invoice #${settled.invoiceNumber} for ${formatINR(settled.finalTotal)} settled.`,
        'Bill Generated'
      );
      onSuccess?.();
      onClose();
    }
  };

  const cashChange =
    paymentMethod === 'cash' && typeof cashReceived === 'number' && cashReceived >= finalTotal
      ? cashReceived - finalTotal
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settle Snacks & Drinks Bill"
      subtitle="Generate invoice and complete payment for separate café customer"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Tag */}
        <div className="bg-[#FFF4ED] border border-[#FF5900]/30 rounded-[6px] p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#FF5900] font-semibold">
            <Coffee className="w-4 h-4" />
            <span>Standalone Customer (No Table Game Tab)</span>
          </div>
          <span className="font-mono text-[11px] text-[#60646C]">
            {order ? order.orderNumber : 'Direct POS Checkout'}
          </span>
        </div>

        {/* Customer Details & Service Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1">
              Customer Name
            </label>
            <div className="relative">
              <input
                type="text"
                autoComplete="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Guest"
                className="w-full h-[38px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-8 pr-3 text-xs text-[#15191E] focus:outline-none focus:border-[#006EF5]"
              />
              <User className="w-3.5 h-3.5 text-[#8B8D98] absolute left-2.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1">
              Mobile Phone (Receipt / CRM)
            </label>
            <div className="relative">
              <input
                type="tel"
                autoComplete="tel"
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="10-digit number"
                className="w-full h-[38px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] pl-8 pr-3 text-xs text-[#15191E] font-mono focus:outline-none focus:border-[#006EF5]"
              />
              <Phone className="w-3.5 h-3.5 text-[#8B8D98] absolute left-2.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1">
              Dining Mode
            </label>
            <div className="grid grid-cols-2 gap-1 bg-[#F3F3F7] border border-[#B9BBC6] p-1 rounded-[6px] h-[38px]">
              <button
                type="button"
                onClick={() => setDestination('counter')}
                className={`text-xs font-medium rounded-[4px] transition-colors ${
                  destination === 'counter'
                    ? 'bg-[#FF5900] text-white shadow-sm'
                    : 'text-[#60646C] hover:text-[#15191E]'
                }`}
              >
                Dine-in / Lounge
              </button>
              <button
                type="button"
                onClick={() => setDestination('takeaway')}
                className={`text-xs font-medium rounded-[4px] transition-colors ${
                  destination === 'takeaway'
                    ? 'bg-[#FF5900] text-white shadow-sm'
                    : 'text-[#60646C] hover:text-[#15191E]'
                }`}
              >
                Takeaway
              </button>
            </div>
          </div>
        </div>

        {/* Ordered Snacks & Drinks Items */}
        <div className="border border-[#B9BBC6] rounded-[6px] p-3 bg-[#FFFFFF] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#15191E] border-b border-[#B9BBC6] pb-2">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#FF5900]" />
              Items to Settle ({items.length})
            </span>
            <span className="font-mono text-[#60646C]">Subtotal: {formatINR(subtotal)}</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 py-1 pr-1">
            {items.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8B8D98]">
                No items in order
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-medium text-[#15191E] truncate">{item.name}</div>
                    <div className="text-[11px] text-[#60646C] font-mono">
                      {formatINR(item.price)} each {item.notes ? `· (${item.notes})` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-[#FFFFFF] border border-[#B9BBC6] rounded-[4px] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="px-2 py-1 hover:bg-[#F3F3F7] text-[#15191E]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="px-2 py-1 hover:bg-[#F3F3F7] text-[#15191E]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-[#15191E] w-16 text-right">
                      {formatINR(item.price * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-[#60646C] hover:text-[#FF3D00]"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#60646C] uppercase tracking-wider mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'upi' as PaymentMethod, label: 'UPI / QR', icon: QrCode, color: 'text-[#0D9926]' },
              { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote, color: 'text-[#FF5900]' },
              { id: 'card' as PaymentMethod, label: 'Card / POS', icon: CreditCard, color: 'text-[#006EF5]' },
              { id: 'split' as PaymentMethod, label: 'Split Pay', icon: Split, color: 'text-[#15191E]' },
            ].map((pm) => {
              const Icon = pm.icon;
              const isSelected = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`h-11 px-3 rounded-[6px] border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isSelected
                      ? 'border-[#FF5900] bg-[#FFF4ED] text-[#FF5900] shadow-[0px_2px_8px_rgba(255,89,0,0.15)] ring-1 ring-[#FF5900]'
                      : 'border-[#B9BBC6] bg-[#FFFFFF] text-[#15191E] hover:bg-[#F3F3F7]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF5900]' : pm.color}`} />
                  <span>{pm.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#FF5900] ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Tender & Change Calculator (if Cash chosen) */}
        {paymentMethod === 'cash' && (
          <div className="p-3 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-[#60646C] uppercase mb-1">
                Cash Tendered / Received
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#15191E]">₹</span>
                <input
                  type="number"
                  min={finalTotal}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`Exact (${finalTotal})`}
                  className="w-32 h-[34px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[4px] px-2.5 text-sm font-mono font-bold text-[#15191E] focus:outline-none focus:border-[#006EF5]"
                />
                <button
                  type="button"
                  onClick={() => setCashReceived(finalTotal)}
                  className="px-2 py-1 bg-[#FFFFFF] border border-[#B9BBC6] rounded text-[11px] font-medium hover:bg-[#15191E]/[0.05]"
                >
                  Exact
                </button>
              </div>
            </div>

            {cashChange !== null && (
              <div className="text-right sm:border-l sm:border-[#B9BBC6] sm:pl-4">
                <span className="text-[11px] text-[#60646C] uppercase font-semibold">Change to Return</span>
                <div className="text-base font-mono font-bold text-[#0D9926]">
                  {formatINR(cashChange)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Split Details (if Split chosen) */}
        {paymentMethod === 'split' && (
          <div className="p-3 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] space-y-2 text-xs">
            <div className="text-xs font-semibold text-[#15191E] uppercase">Split Shares Breakdown</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#60646C] mb-1">Cash Share (₹)</label>
                <input
                  type="number"
                  value={cashShare}
                  onChange={(e) => {
                    const c = Number(e.target.value) || 0;
                    setCashShare(c);
                    setUpiShare(Math.max(0, finalTotal - c));
                  }}
                  className="w-full h-[34px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[4px] px-2.5 font-mono text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#60646C] mb-1">UPI Share (₹)</label>
                <input
                  type="number"
                  value={upiShare}
                  onChange={(e) => {
                    const u = Number(e.target.value) || 0;
                    setUpiShare(u);
                    setCashShare(Math.max(0, finalTotal - u));
                  }}
                  className="w-full h-[34px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[4px] px-2.5 font-mono text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Optional Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#8B8D98]" /> Discount Amount (Optional)
            </label>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs text-[#60646C]">₹</span>
              <input
                type="number"
                min={0}
                max={subtotal}
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Math.min(subtotal, Math.max(0, Number(e.target.value) || 0)))}
                placeholder="0"
                className="w-full h-[34px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-2.5 text-xs font-mono font-semibold text-[#15191E] focus:outline-none focus:border-[#006EF5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1">
              Discount Reason
            </label>
            <input
              type="text"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="e.g. Happy Hour / Friend & Family"
              disabled={!discountAmount}
              className="w-full h-[34px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-2.5 text-xs text-[#15191E] focus:outline-none focus:border-[#006EF5] disabled:bg-[#F3F3F7]"
            />
          </div>
        </div>

        {/* Financial Summary & Action */}
        <div className="border-t border-[#B9BBC6] pt-3 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#60646C]">Total Snacks & Drinks</span>
            <span className="font-mono font-semibold text-xs text-[#15191E]">{formatINR(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-baseline justify-between text-xs text-[#0D9926] font-semibold">
              <span>Discount {discountReason ? `(${discountReason})` : ''}</span>
              <span className="font-mono">- {formatINR(discountAmount)}</span>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t border-[#B9BBC6] pt-2">
            <span className="text-sm font-bold text-[#000000]">Net Amount to Collect</span>
            <span className="text-xl font-mono font-extrabold text-[#FF5900]">
              {formatINR(finalTotal)}
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={items.length === 0}
              className="flex-[2] text-xs font-semibold bg-[#FF5900] hover:bg-[#E64E00]"
              icon={<Check className="w-4 h-4" />}
            >
              Collect {formatINR(finalTotal)} & Print Invoice
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
