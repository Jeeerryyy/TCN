/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { useCafe } from '../../context/CafeContext';
import { useTables } from '../../context/TableContext';
import { Button } from '../../components/ui/Button';
import { formatINR } from '../../utils/formatters';
import { ShoppingBag, Plus, Minus, Trash2, Send, UtensilsCrossed, AlertCircle } from 'lucide-react';

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
    submitCartOrder,
  } = useCafe();

  const { tables, activeSessionsMap } = useTables();
  const [orderSentMessage, setOrderSentMessage] = useState<string | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Filter occupied tables eligible to receive table orders
  const occupiedTables = tables.filter((t) => t.status === 'occupied' || t.status === 'paused');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (cartDestination === 'table' && !selectedTableId) {
      alert('Please select an active table to link this order.');
      return;
    }

    const created = submitCartOrder();
    if (created) {
      setOrderSentMessage(`KOT #${created.orderNumber} dispatched to Kitchen.`);
      setTimeout(() => setOrderSentMessage(null), 4000);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 flex flex-col h-full shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
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
      <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[320px]">
        {cart.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-[#8B8D98] space-y-1">
            <UtensilsCrossed className="w-8 h-8 text-[#8B8D98] stroke-1" />
            <p className="text-xs font-medium text-[#15191E]">No items in order</p>
            <p className="text-[11px] text-[#60646C]">Select items from the menu to build KOT</p>
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
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Destination & Order Config */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-[#B9BBC6] space-y-3">
        {/* Destination Toggle */}
        <div>
          <label className="block text-xs font-semibold text-[#60646C] uppercase tracking-wider mb-1.5">
            Order Destination
          </label>
          <div className="grid grid-cols-2 gap-1 bg-[#F3F3F7] border border-[#B9BBC6] p-1 rounded-[6px]">
            <button
              type="button"
              onClick={() => setCartDestination('table')}
              className={`py-1.5 rounded-[4px] text-xs transition-colors duration-150 ${
                cartDestination === 'table'
                  ? 'bg-[#FF5900] text-white font-medium'
                  : 'text-[#60646C] hover:text-[#15191E] font-normal'
              }`}
            >
              Add to Table Tab
            </button>
            <button
              type="button"
              onClick={() => setCartDestination('counter')}
              className={`py-1.5 rounded-[4px] text-xs transition-colors duration-150 ${
                cartDestination === 'counter'
                  ? 'bg-[#FF5900] text-white font-medium'
                  : 'text-[#60646C] hover:text-[#15191E] font-normal'
              }`}
            >
              Walk-in Counter
            </button>
          </div>
        </div>

        {/* Table Selector (if destination is Table) */}
        {cartDestination === 'table' && (
          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1">
              Select Active Table
            </label>
            {occupiedTables.length === 0 ? (
              <div className="p-3 bg-[#FFA500]/15 border border-[#FFA500]/30 rounded-[6px] text-xs text-[#15191E] flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#FF5900]" /> No occupied tables right now.
              </div>
            ) : (
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                required
                className="w-full h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-sm text-[#15191E] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
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

        {/* Counter Guest Name (if destination is Counter) */}
        {cartDestination === 'counter' && (
          <div>
            <label className="block text-xs font-medium text-[#15191E] mb-1">
              Guest Name (Optional)
            </label>
            <input
              type="text"
              autoComplete="name"
              value={cartCustomerName}
              onChange={(e) => setCartCustomerName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full h-[40px] bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 text-sm text-[#15191E] placeholder-[#8B8D98] focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
            />
          </div>
        )}

        {/* Subtotal Display */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[#60646C] font-normal">Order Subtotal</span>
          <span className="text-base font-mono font-bold text-[#FF5900]">{formatINR(subtotal)}</span>
        </div>

        {/* Submit to Kitchen Button */}
        <Button
          variant="primary"
          size="md"
          className="w-full font-normal"
          type="submit"
          disabled={cart.length === 0 || (cartDestination === 'table' && !selectedTableId)}
          icon={<Send className="w-4 h-4" />}
        >
          {cartDestination === 'table' ? 'Send KOT & Charge Table' : 'Send KOT Order'}
        </Button>
      </form>
    </div>
  );
};
