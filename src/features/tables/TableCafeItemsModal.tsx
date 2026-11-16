/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState, useMemo } from 'react';
import { Table, TableSession } from '../../types/table.types';
import { useCafe } from '../../context/CafeContext';
import { formatINR, formatTimeOnly } from '../../utils/formatters';
import {
  Utensils,
  Plus,
  Minus,
  Trash2,
  X,
  Clock,
  Coffee,
  PlusCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

interface TableCafeItemsModalProps {
  table: Table;
  session?: TableSession | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TableCafeItemsModal: React.FC<TableCafeItemsModalProps> = ({
  table,
  session,
  isOpen,
  onClose,
}) => {
  const { menu, orders, addItemToTableOrder, updateTableOrderItemQty, removeTableOrderItem } = useCafe();
  const { success, warning } = useToast();

  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState<number | ''>('');

  // Collect all unbilled active orders explicitly linked to this session/table
  const linkedOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        !o.isBilled &&
        !o.isDeleted &&
        o.status !== 'cancelled' &&
        (Boolean(session?.linkedCafeOrderIds?.includes(o.id)) || o.tableId === table.id)
    );
  }, [orders, session?.linkedCafeOrderIds, table.id]);

  // Flatten items with their parent orderId and index
  const flattenedItems = useMemo(() => {
    const list: {
      orderId: string;
      orderNumber: string;
      itemIndex: number;
      name: string;
      price: number;
      quantity: number;
      notes?: string;
      createdAt: string;
    }[] = [];

    linkedOrders.forEach((ord) => {
      ord.items.forEach((item, idx) => {
        list.push({
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          itemIndex: idx,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
          createdAt: ord.createdAt,
        });
      });
    });

    return list;
  }, [linkedOrders]);

  const cafeSubtotal = useMemo(() => {
    return flattenedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [flattenedItems]);

  if (!isOpen) return null;

  const isSnooker = table.type === 'snooker';

  const handleAddFromMenu = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedMenuItemId) return;

    const menuItem = menu.find((m) => m.id === selectedMenuItemId);
    if (!menuItem) return;

    addItemToTableOrder(table.id, {
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: addQty || 1,
    });

    success(`Added ${addQty || 1}x ${menuItem.name} to ${table.name}`, 'Café Tab Updated');
    setSelectedMenuItemId('');
    setAddQty(1);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      warning('Please enter an item name (e.g. Energy Drink, Soda).', 'Name Required');
      return;
    }
    const priceNum = Number(customPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      warning('Please enter a valid price in INR.', 'Invalid Price');
      return;
    }

    addItemToTableOrder(table.id, {
      name: customName.trim(),
      price: priceNum,
      quantity: addQty || 1,
    });

    success(`Added custom item "${customName.trim()}" to ${table.name}`, 'Item Attached');
    setCustomName('');
    setCustomPrice('');
    setAddQty(1);
    setShowCustomForm(false);
  };

  const availableMenuItems = menu.filter((m) => m.isAvailable);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet Box */}
      <div
        className="relative z-10 w-full sm:max-w-xl bg-[#FFFFFF] rounded-t-[16px] sm:rounded-[12px] border border-[#B9BBC6] shadow-[0px_8px_32px_rgba(0,0,0,0.16)] max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#B9BBC6] bg-[#FFFFFF] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-[8px] flex items-center justify-center font-bold text-xs ${
                isSnooker
                  ? 'bg-[#D5E8FB] text-[#006EF5] border border-[#006EF5]/30'
                  : 'bg-[#FF5900]/15 text-[#FF5900] border border-[#FF5900]/30'
              }`}
            >
              {table.shortCode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#000000]">{table.name}</h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isSnooker ? 'bg-[#D5E8FB] text-[#006EF5]' : 'bg-[#FFF4ED] text-[#FF5900]'
                  }`}
                >
                  {isSnooker ? 'Snooker' : 'Pool'}
                </span>
              </div>
              <p className="text-xs text-[#60646C]">
                Guest:{' '}
                <strong className="text-[#15191E]">
                  {session?.primaryCustomerName || 'Walk-in Guest'}
                </strong>
                {session?.primaryCustomerPhone && ` (${session.primaryCustomerPhone})`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] hover:bg-[#F3F3F7] text-[#60646C] hover:text-[#000000] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Items & Controls Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Ordered Items Table / List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#60646C] flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-[#FF5900]" />
                Attached Café Orders ({flattenedItems.length})
              </span>
              <span className="text-xs font-mono font-semibold text-[#FF5900]">
                Subtotal: {formatINR(cafeSubtotal)}
              </span>
            </div>

            {flattenedItems.length === 0 ? (
              <div className="bg-[#F8F9FA] border border-dashed border-[#B9BBC6] rounded-[8px] p-6 text-center space-y-2">
                <Coffee className="w-8 h-8 text-[#8B8D98] mx-auto opacity-60" />
                <p className="text-xs font-medium text-[#15191E]">No drinks or snacks ordered yet</p>
                <p className="text-[11px] text-[#60646C]">
                  Select from the menu below or add custom items to charge onto this table.
                </p>
              </div>
            ) : (
              <div className="border border-[#B9BBC6] rounded-[8px] overflow-hidden divide-y divide-[#B9BBC6] bg-[#FFFFFF]">
                {flattenedItems.map((item, idx) => (
                  <div
                    key={`${item.orderId}_${idx}`}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F8F9FA] transition-colors"
                  >
                    {/* Item Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#15191E] truncate">
                          {item.name}
                        </span>
                        {item.notes && (
                          <span className="text-[10px] text-[#FF5900] bg-[#FFF4ED] px-1.5 py-0.2 rounded border border-[#FF5900]/20">
                            {item.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#60646C]">
                        <span>{formatINR(item.price)} each</span>
                        <span>·</span>
                        <span className="font-mono text-[10px] text-[#8B8D98] flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimeOnly(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls & Line Total */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Qty +/- */}
                      <div className="flex items-center border border-[#B9BBC6] rounded-[6px] overflow-hidden bg-[#FFFFFF]">
                        <button
                          type="button"
                          onClick={() => updateTableOrderItemQty(item.orderId, item.itemIndex, -1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#F3F3F7] text-[#15191E] transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-mono font-bold text-[#15191E]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateTableOrderItemQty(item.orderId, item.itemIndex, 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#F3F3F7] text-[#15191E] transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <span className="w-16 text-right font-mono font-bold text-xs text-[#15191E]">
                        {formatINR(item.price * item.quantity)}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeTableOrderItem(item.orderId, item.itemIndex)}
                        className="w-7 h-7 rounded-[4px] hover:bg-[#FFF1F0] text-[#8B8D98] hover:text-[#FF4D4F] flex items-center justify-center transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add Item Section */}
          <div className="bg-[#F8F9FA] border border-[#B9BBC6] rounded-[8px] p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-[#15191E] flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-[#006EF5]" /> Add More Items
              </span>
              <button
                type="button"
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="text-[11px] font-semibold text-[#006EF5] hover:underline"
              >
                {showCustomForm ? '← Choose from Menu' : '+ Custom Open Item'}
              </button>
            </div>

            {!showCustomForm ? (
              /* Menu Picker */
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3">
                    <select
                      value={selectedMenuItemId}
                      onChange={(e) => setSelectedMenuItemId(e.target.value)}
                      className="w-full h-[38px] px-3 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                    >
                      <option value="">Select item from café menu...</option>
                      {availableMenuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} – {formatINR(m.price)} ({m.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-[#B9BBC6] rounded-[6px] bg-[#FFFFFF] overflow-hidden h-[38px] w-24">
                      <button
                        type="button"
                        onClick={() => setAddQty(Math.max(1, addQty - 1))}
                        className="w-7 h-full flex items-center justify-center hover:bg-[#F3F3F7]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={addQty}
                        onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 text-center font-mono text-xs font-semibold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setAddQty(addQty + 1)}
                        className="w-7 h-full flex items-center justify-center hover:bg-[#F3F3F7]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="flex-1 h-[38px]"
                      onClick={handleAddFromMenu}
                      disabled={!selectedMenuItemId}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Custom Item Form */
              <form onSubmit={handleAddCustom} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Item name (e.g. Soda, Cigarette)"
                    className="h-[38px] px-3 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-xs text-[#15191E] focus:outline-none focus:border-[#FF5900] sm:col-span-1"
                  />
                  <div className="relative sm:col-span-1">
                    <span className="absolute left-3 top-2.5 text-xs text-[#8B8D98]">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Price"
                      className="w-full h-[38px] pl-6 pr-3 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-xs font-mono text-[#15191E] focus:outline-none focus:border-[#FF5900]"
                    />
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-1">
                    <div className="flex items-center border border-[#B9BBC6] rounded-[6px] bg-[#FFFFFF] overflow-hidden h-[38px] w-20 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAddQty(Math.max(1, addQty - 1))}
                        className="w-6 h-full flex items-center justify-center hover:bg-[#F3F3F7]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-mono text-xs font-semibold">
                        {addQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAddQty(addQty + 1)}
                        className="w-6 h-full flex items-center justify-center hover:bg-[#F3F3F7]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <Button type="submit" variant="primary" size="sm" className="flex-1 h-[38px]">
                      Add Custom
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#B9BBC6] bg-[#FFFFFF] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] text-[#60646C]">Current Café Total:</span>
            <div className="text-base font-mono font-bold text-[#FF5900]">
              {formatINR(cafeSubtotal)}
            </div>
          </div>

          <Button variant="primary" size="md" onClick={onClose}>
            Done & Save
          </Button>
        </div>
      </div>
    </div>
  );
};
