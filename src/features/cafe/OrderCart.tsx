/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { useCafe } from '../../context/CafeContext';
import { useTables } from '../../context/TableContext';
import { Button } from '../../components/ui/Button';
import { formatINR } from '../../utils/formatters';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Send,
  UtensilsCrossed,
  AlertCircle,
  Receipt,
  Coffee,
  Grid,
  Phone,
  User,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { SettleCafeBillModal } from './SettleCafeBillModal';

export const OrderCart: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartDestination,
    setCartDestination,
    selectedTableId,
    setSelectedTableId,
    cartCustomerName,
    setCartCustomerName,
    cartCustomerPhone,
    setCartCustomerPhone,
    submitCartOrder,
  } = useCafe();

  const { tables, activeSessionsMap } = useTables();
  const { warning, success } = useToast();
  const [orderSentMessage, setOrderSentMessage] = useState<string | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Filter occupied tables eligible to receive table orders
  const occupiedTables = tables.filter((t) => t.status === 'occupied' || t.status === 'paused');

  const isStandalone = cartDestination === 'counter' || cartDestination === 'takeaway';

  const handleSendKOT = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;

    if (cartDestination === 'table' && !selectedTableId) {
      warning('Please select an active table to link this order.', 'Table Required');
      return;
    }

    const created = submitCartOrder();
    if (created) {
      success(`KOT #${created.orderNumber} sent to kitchen.`, 'Order Dispatched');
      setOrderSentMessage(`KOT #${created.orderNumber} dispatched to Kitchen.`);
      setTimeout(() => setOrderSentMessage(null), 4000);
    }
  };

  const handleOpenSettle = () => {
    if (cart.length === 0) {
      warning('Add items to order before generating bill.', 'Cart Empty');
      return;
    }
    setIsSettleModalOpen(true);
  };

  return (
    <>
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 sm:p-6 flex flex-col h-full shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#B9BBC6]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#FF5900]" />
            <h3 className="text-sm font-medium text-[#000000]">Active POS Order</h3>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-[#60646C] hover:text-[#FF3D00] transition-colors font-normal"
            >
              Clear All
            </button>
          )}
        </div>

        {orderSentMessage && (
          <div className="mt-3 p-3 bg-[#D1F4D2] border border-[#0D9926]/30 rounded-[6px] text-xs text-[#0D9926] font-semibold">
            {orderSentMessage}
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[300px]">
          {cart.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center text-center text-[#8B8D98] space-y-1">
              <UtensilsCrossed className="w-8 h-8 text-[#8B8D98] stroke-1" />
              <p className="text-xs font-medium text-[#15191E]">No items in order</p>
              <p className="text-[11px] text-[#60646C]">Select items from menu to start order</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] p-3 flex items-center justify-between text-xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-medium text-xs text-[#000000] truncate">{item.name}</div>
                  <div className="text-[11px] text-[#60646C] font-mono mt-0.5">
                    {formatINR(item.price)} each
                  </div>
                </div>

                {/* Quantity Adjusters */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      className="p-1 hover:bg-[#15191E]/[0.05] text-[#15191E] transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono font-semibold text-[#15191E] text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-[#15191E]/[0.05] text-[#15191E] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 text-[#60646C] hover:text-[#FF3D00] transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Type / Destination Config */}
        <div className="pt-3 border-t border-[#B9BBC6] space-y-3">
          {/* Order Type Toggle: Separate Snacks & Drinks vs Table Tab */}
          <div>
            <label className="block text-xs font-semibold text-[#60646C] uppercase tracking-wider mb-1.5">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-1 bg-[#F3F3F7] border border-[#B9BBC6] p-1 rounded-[6px]">
              <button
                type="button"
                onClick={() => setCartDestination('counter')}
                className={`py-1.5 px-2 rounded-[4px] text-xs transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                  isStandalone
                    ? 'bg-[#FF5900] text-white font-medium shadow-sm'
                    : 'text-[#60646C] hover:text-[#15191E] font-normal'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Snacks & Drinks Only</span>
              </button>
              <button
                type="button"
                onClick={() => setCartDestination('table')}
                className={`py-1.5 px-2 rounded-[4px] text-xs transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                  cartDestination === 'table'
                    ? 'bg-[#FF5900] text-white font-medium shadow-sm'
                    : 'text-[#60646C] hover:text-[#15191E] font-normal'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Link to Table Tab</span>
              </button>
            </div>
          </div>

          {/* Standalone Customer Details (No Table required) */}
          {isStandalone && (
            <div className="space-y-2.5 bg-[#FFF4ED]/60 border border-[#FF5900]/25 rounded-[6px] p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#FF5900] uppercase tracking-wider flex items-center gap-1">
                  <Coffee className="w-3 h-3" /> Separate Customer
                </span>
                {/* Counter vs Takeaway toggle */}
                <div className="flex bg-[#FFFFFF] border border-[#B9BBC6] rounded-[4px] p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCartDestination('counter')}
                    className={`px-2 py-0.5 rounded-[3px] font-medium transition-colors ${
                      cartDestination === 'counter'
                        ? 'bg-[#FF5900] text-white'
                        : 'text-[#60646C]'
                    }`}
                  >
                    Dine-in Lounge
                  </button>
                  <button
                    type="button"
                    onClick={() => setCartDestination('takeaway')}
                    className={`px-2 py-0.5 rounded-[3px] font-medium transition-colors ${
                      cartDestination === 'takeaway'
                        ? 'bg-[#FF5900] text-white'
                        : 'text-[#60646C]'
                    }`}
                  >
                    Takeaway
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="name"
                    value={cartCustomerName}
                    onChange={(e) => setCartCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="w-full h-[34px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[4px] pl-7 pr-2.5 text-xs text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5]"
                  />
                  <User className="w-3 h-3 text-[#8B8D98] absolute left-2.5 top-2.5" />
                </div>

                <div className="relative">
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={cartCustomerPhone}
                    onChange={(e) => setCartCustomerPhone(e.target.value)}
                    placeholder="Phone Number (for SMS & Invoice)"
                    className="w-full h-[34px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[4px] pl-7 pr-2.5 text-xs text-[#15191E] font-mono placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5]"
                  />
                  <Phone className="w-3 h-3 text-[#8B8D98] absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          )}

          {/* Table Selector (if destination is Table) */}
          {cartDestination === 'table' && (
            <div>
              <label className="block text-xs font-medium text-[#15191E] mb-1">
                Select Active Game Table
              </label>
              {occupiedTables.length === 0 ? (
                <div className="p-3 bg-[#FFA500]/15 border border-[#FFA500]/30 rounded-[6px] text-xs text-[#15191E] flex flex-col gap-1.5 font-medium">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#FF5900]" />
                    <span>No tables currently playing.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCartDestination('counter')}
                    className="text-left text-xs text-[#FF5900] underline font-semibold mt-0.5"
                  >
                    Switch to Snacks & Drinks Only
                  </button>
                </div>
              ) : (
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  required
                  className="w-full h-[38px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-xs text-[#15191E] focus:outline-none focus:border-[#006EF5]"
                >
                  <option value="" disabled>Select a table</option>
                  {occupiedTables.map((t) => {
                    const sess = activeSessionsMap[t.id];
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} ({sess ? sess.primaryCustomerName : 'Guest'})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {/* Subtotal Display */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[#60646C] font-normal">Order Subtotal</span>
            <span className="text-base font-mono font-bold text-[#FF5900]">{formatINR(subtotal)}</span>
          </div>

          {/* Action Buttons */}
          {isStandalone ? (
            <div className="space-y-2">
              {/* Primary Direct Billing & Settlement CTA */}
              <Button
                variant="primary"
                size="md"
                className="w-full font-semibold bg-[#FF5900] hover:bg-[#E64E00]"
                type="button"
                onClick={handleOpenSettle}
                disabled={cart.length === 0}
                icon={<Receipt className="w-4 h-4" />}
              >
                Settle & Generate Bill ({formatINR(subtotal)})
              </Button>

              {/* Secondary Send KOT to Kitchen (Pay Later) */}
              <Button
                variant="secondary"
                size="sm"
                className="w-full font-normal text-xs text-[#60646C]"
                type="button"
                onClick={handleSendKOT}
                disabled={cart.length === 0}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Send KOT to Kitchen (Pay Later)
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="w-full font-normal"
              type="button"
              onClick={handleSendKOT}
              disabled={cart.length === 0 || !selectedTableId}
              icon={<Send className="w-4 h-4" />}
            >
              Send KOT & Charge Table
            </Button>
          )}
        </div>
      </div>

      {/* Settle Modal for Separate Snack/Drink Customer */}
      <SettleCafeBillModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        cartItems={cart.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          notes: i.notes,
        }))}
        initialCustomerName={cartCustomerName}
        initialCustomerPhone={cartCustomerPhone}
        initialDestination={cartDestination === 'takeaway' ? 'takeaway' : 'counter'}
        onSuccess={() => {
          clearCart();
        }}
      />
    </>
  );
};

