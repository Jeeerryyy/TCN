/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useTables } from '../../context/TableContext';
import { useCustomers } from '../../context/CustomerContext';
import { useBilling, ManualBillInput } from '../../context/BillingContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/formatters';
import { PaymentMethod } from '../../types/billing.types';
import { Customer } from '../../types/customer.types';
import {
  BookOpen,
  Calendar,
  User,
  DollarSign,
  Coffee,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
} from 'lucide-react';

interface ManualNotebookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (billId: string) => void;
  preselectedCustomerId?: string;
}

export const ManualNotebookEntryModal: React.FC<ManualNotebookEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedCustomerId,
}) => {
  const { tables } = useTables();
  const { customers } = useCustomers();
  const { addManualBill, setActiveBillModal } = useBilling();
  const { currentUser } = useAuth();
  const { success, warning } = useToast();

  // Date and Time State (Defaults to today and 1 hour ago)
  const todayStr = new Date().toISOString().split('T')[0];
  const [entryDate, setEntryDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>('16:00');
  const [endTime, setEndTime] = useState<string>('17:30');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);

  // Entry Category
  const [entryType, setEntryType] = useState<'table' | 'cafe' | 'both'>('table');

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saveToCrm, setSaveToCrm] = useState(true);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Table State
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [customTableCharge, setCustomTableCharge] = useState<number | ''>('');
  const [isCustomRate, setIsCustomRate] = useState(false);

  // Cafe State
  const [cafeCharge, setCafeCharge] = useState<number | ''>('');
  const [cafeNotes, setCafeNotes] = useState('');

  // Discount & Settlement
  const [discountAmount, setDiscountAmount] = useState<number | ''>('');
  const [discountReason, setDiscountReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notebookRef, setNotebookRef] = useState('');
  const [cashierName, setCashierName] = useState('');

  // Auto-fill operator
  useEffect(() => {
    if (currentUser?.name) {
      setCashierName(currentUser.name);
    }
  }, [currentUser]);

  // Set default table on open
  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id);
    }
  }, [tables, selectedTableId]);

  // Handle preselected customer
  useEffect(() => {
    if (preselectedCustomerId) {
      const found = customers.find((c) => c.id === preselectedCustomerId);
      if (found) {
        setSelectedCustomer(found);
        setCustomerName(found.name);
        setCustomerPhone(found.phone);
        setCustomerSearch(`${found.name} (${found.phone})`);
      }
    }
  }, [preselectedCustomerId, customers]);

  // Recalculate duration when start or end time changes
  useEffect(() => {
    if (!startTime || !endTime) return;
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let diffMins = eh * 60 + em - (sh * 60 + sm);
      if (diffMins < 0) diffMins += 24 * 60; // Overnight shift crossover
      setDurationMinutes(diffMins);
    } catch {
      // keep existing
    }
  }, [startTime, endTime]);

  // Selected table helper
  const currentTable = tables.find((t) => t.id === selectedTableId) || tables[0];
  const ratePerHour = currentTable ? currentTable.ratePerHour : 240;
  const ratePerMinute = currentTable?.ratePerMinute ?? Number((ratePerHour / 60).toFixed(2));

  // Calculate table charge based on total time multiplied by price per minute
  const calculatedTableCharge = currentTable
    ? Math.round(durationMinutes * ratePerMinute)
    : 0;

  const effectiveTableCharge =
    isCustomRate && typeof customTableCharge === 'number'
      ? customTableCharge
      : calculatedTableCharge;

  const effectiveCafeCharge = typeof cafeCharge === 'number' ? cafeCharge : 0;
  const effectiveDiscount = typeof discountAmount === 'number' ? discountAmount : 0;

  const subtotal =
    entryType === 'table'
      ? effectiveTableCharge
      : entryType === 'cafe'
      ? effectiveCafeCharge
      : effectiveTableCharge + effectiveCafeCharge;

  const finalTotal = Math.max(0, subtotal - effectiveDiscount);

  // Customer search filtering
  const matchingCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return false;
    const q = customerSearch.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerSearch(`${c.name} (${c.phone})`);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerSearch('');
  };

  const handleQuickDuration = (mins: number) => {
    setDurationMinutes(mins);
    if (!startTime) return;
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const totalStart = sh * 60 + sm;
      const totalEnd = (totalStart + mins) % (24 * 60);
      const endH = String(Math.floor(totalEnd / 60)).padStart(2, '0');
      const endM = String(totalEnd % 60).padStart(2, '0');
      setEndTime(`${endH}:${endM}`);
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      warning('Please provide a customer name or guest identifier.', 'Missing Name');
      return;
    }

    if (finalTotal <= 0 && subtotal <= 0) {
      warning('Bill amount must be greater than zero.', 'Invalid Total');
      return;
    }

    const payload: ManualBillInput = {
      date: entryDate,
      startTime,
      endTime,
      durationMinutes,
      entryType,
      tableId: entryType !== 'cafe' ? currentTable?.id : undefined,
      tableName: entryType !== 'cafe' ? currentTable?.name : 'Cafe Counter',
      ratePerHour: entryType !== 'cafe' ? ratePerHour : undefined,
      tableCharge: entryType !== 'cafe' ? effectiveTableCharge : 0,
      cafeCharge: entryType !== 'table' ? effectiveCafeCharge : 0,
      discountAmount: effectiveDiscount > 0 ? effectiveDiscount : undefined,
      discountReason: discountReason.trim() || undefined,
      finalTotal,
      paymentMethod,
      customerId: selectedCustomer?.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      shouldCreateOrUpdateCustomer: saveToCrm,
      notes: notebookRef.trim() ? `Ref: ${notebookRef.trim()}` : (cafeNotes.trim() || undefined),
      cashierName: cashierName.trim() || 'Floor Manager',
    };

    const newBill = addManualBill(payload);

    success(
      `Notebook entry logged for ${customerName} (${formatINR(finalTotal)}) on ${entryDate}. Synced with database.`,
      'Notebook Entry Saved'
    );

    onClose();
    if (onSuccess) {
      onSuccess(newBill.id);
    } else {
      setActiveBillModal(newBill);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Past / Notebook Customer Entry"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs text-[#15191E]">
        {/* Banner note explaining notebook reconcilation */}
        <div className="bg-[#FFF8F0] border border-[#FF5900]/30 rounded-[8px] p-3 flex items-start gap-2.5">
          <BookOpen className="w-4 h-4 text-[#FF5900] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#30333B] leading-relaxed">
            <span className="font-semibold text-[#000000]">Backdated Register Reconciliation: </span>
            Use this to record customer sessions and payments that were written in a notebook during peak rush or network downtime. It immediately updates customer CRM visit counts, lifetime spend, and revenue reports with the past date.
          </div>
        </div>

        {/* 1. Category Switcher */}
        <div>
          <label className="block text-[11px] font-semibold text-[#60646C] uppercase tracking-wider mb-1.5">
            Entry Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setEntryType('table')}
              className={`py-2 px-3 rounded-[6px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                entryType === 'table'
                  ? 'bg-[#FF5900] border-[#FF5900] text-white shadow-sm'
                  : 'bg-white border-[#B9BBC6] text-[#15191E] hover:bg-[#F3F3F7]'
              }`}
            >
              <span>🎱 Table Session</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryType('cafe')}
              className={`py-2 px-3 rounded-[6px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                entryType === 'cafe'
                  ? 'bg-[#FF5900] border-[#FF5900] text-white shadow-sm'
                  : 'bg-white border-[#B9BBC6] text-[#15191E] hover:bg-[#F3F3F7]'
              }`}
            >
              <span>☕ Café Tab Only</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryType('both')}
              className={`py-2 px-3 rounded-[6px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                entryType === 'both'
                  ? 'bg-[#FF5900] border-[#FF5900] text-white shadow-sm'
                  : 'bg-white border-[#B9BBC6] text-[#15191E] hover:bg-[#F3F3F7]'
              }`}
            >
              <span>🎱 + ☕ Combined</span>
            </button>
          </div>
        </div>

        {/* 2. Customer Selection / CRM Link */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-3.5 space-y-3 shadow-[0px_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-[#000000] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF5900]" /> Customer & Player Details
            </label>
            {selectedCustomer && (
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-[10px] text-[#006EF5] hover:underline"
              >
                Change / Clear
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search existing member by phone or name..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-2 text-xs focus:outline-none focus:border-[#FF5900]"
            />

            {showCustomerDropdown && matchingCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#B9BBC6] rounded-[6px] shadow-lg max-h-40 overflow-y-auto z-50 divide-y divide-[#F3F3F7]">
                {matchingCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full px-3 py-2 text-left hover:bg-[#FFF8F0] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#000000]">{c.name}</span>
                      <span className="text-[11px] text-[#60646C] ml-2 font-mono">{c.phone}</span>
                    </div>
                    <span className="text-[10px] bg-[#E4E6EE] text-[#30333B] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                      {c.tier} • {c.totalVisits} visits
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Customer Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma or Guest 3"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-2 text-xs focus:outline-none focus:border-[#FF5900]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-2 text-xs focus:outline-none focus:border-[#FF5900]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="saveCrm"
              checked={saveToCrm}
              onChange={(e) => setSaveToCrm(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#FF5900] rounded"
            />
            <label htmlFor="saveCrm" className="text-[11px] text-[#60646C] cursor-pointer">
              Automatically record this visit in customer's CRM profile and increment visit history
            </label>
          </div>
        </div>

        {/* 3. Session Date and Timing */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-3.5 space-y-3 shadow-[0px_1px_3px_rgba(0,0,0,0.04)]">
          <label className="text-[11px] font-semibold text-[#000000] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#FF5900]" /> Past Session Date & Timing
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Date Played / Visited</label>
              <input
                type="date"
                required
                max={todayStr}
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5900]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5900]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#60646C] mb-1 font-medium">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5900]"
              />
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-[#60646C] font-medium mr-1">Quick Durations:</span>
            {[30, 45, 60, 90, 120, 150, 180].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleQuickDuration(mins)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  durationMinutes === mins
                    ? 'bg-[#FF5900] text-white border-[#FF5900] font-bold'
                    : 'bg-[#F3F3F7] border-[#B9BBC6] text-[#30333B] hover:bg-white'
                }`}
              >
                {mins < 60 ? `${mins}m` : `${mins / 60}h`}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-mono font-semibold text-[#006EF5]">
              {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m billed
            </span>
          </div>
        </div>

        {/* 4. Table Details (Shown for 'table' or 'both') */}
        {entryType !== 'cafe' && (
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-3.5 space-y-3 shadow-[0px_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#000000] flex items-center gap-1.5">
                <span>🎱 Table & Play Charges</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customRate"
                  checked={isCustomRate}
                  onChange={(e) => setIsCustomRate(e.target.checked)}
                  className="w-3 h-3 accent-[#FF5900] rounded"
                />
                <label htmlFor="customRate" className="text-[10px] text-[#60646C] cursor-pointer">
                  Custom / Flat Amount
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Select Arena Table</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-2 text-xs focus:outline-none focus:border-[#FF5900]"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type === 'pool' ? 'Pool' : 'Snooker'} @ ₹{t.ratePerHour}/hr · ₹{(t.ratePerMinute ?? t.ratePerHour / 60).toFixed(2)}/min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#60646C] mb-1 font-medium">
                  {isCustomRate ? 'Custom Table Charge (₹) *' : 'Computed Table Charge (₹)'}
                </label>
                {isCustomRate ? (
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter agreed flat table fee"
                    value={customTableCharge}
                    onChange={(e) => setCustomTableCharge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#FF5900]"
                  />
                ) : (
                  <div className="w-full bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] px-3 py-2 text-xs font-mono font-bold text-[#15191E] flex items-center justify-between">
                    <span>{formatINR(calculatedTableCharge)}</span>
                    <span className="text-[10px] text-[#60646C] font-normal">
                      ({durationMinutes}m @ ₹{ratePerMinute.toFixed(2)}/min)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. Café Details (Shown for 'cafe' or 'both') */}
        {entryType !== 'table' && (
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-3.5 space-y-3 shadow-[0px_1px_3px_rgba(0,0,0,0.04)]">
            <label className="text-[11px] font-semibold text-[#000000] flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-[#FF5900]" /> Café & Refreshment Charges
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Café Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Total food/drinks charge from notebook"
                  value={cafeCharge}
                  onChange={(e) => setCafeCharge(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#FF5900]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Items / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2x Cold Coffee, 1x Sandwich"
                  value={cafeNotes}
                  onChange={(e) => setCafeNotes(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-2 text-xs focus:outline-none focus:border-[#FF5900]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. Settlement, Discount & Staff Audit */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-3.5 space-y-3 shadow-[0px_1px_3px_rgba(0,0,0,0.04)]">
          <label className="text-[11px] font-semibold text-[#000000] flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-[#0D9926]" /> Settlement & Payment Mode
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['cash', 'upi', 'card', 'wallet'] as PaymentMethod[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMethod(mode)}
                className={`py-2 px-2.5 rounded-[6px] border text-xs font-medium capitalize flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMethod === mode
                    ? 'bg-[#15191E] border-[#15191E] text-white shadow-sm'
                    : 'bg-[#FFFFFF] border-[#B9BBC6] text-[#15191E] hover:bg-[#F3F3F7]'
                }`}
              >
                {mode === 'cash' && <Banknote className="w-3.5 h-3.5 text-[#0D9926]" />}
                {mode === 'upi' && <QrCode className="w-3.5 h-3.5 text-[#FF5900]" />}
                {mode === 'card' && <CreditCard className="w-3.5 h-3.5 text-[#006EF5]" />}
                {mode === 'wallet' && <Wallet className="w-3.5 h-3.5 text-[#3C16D5]" />}
                <span>{mode}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Discount (₹ & Reason)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  placeholder="₹ 0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-20 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#FF5900]"
                />
                <input
                  type="text"
                  placeholder="Reason (Optional)"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="flex-1 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#FF5900]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Notebook Reference / Ref #</label>
              <input
                type="text"
                placeholder="e.g. Notebook Pg #14, Shift 2"
                value={notebookRef}
                onChange={(e) => setNotebookRef(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5900]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#60646C] mb-1 font-medium">Cashier / Staff Name</label>
              <input
                type="text"
                placeholder="Operator name"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5900]"
              />
            </div>
          </div>
        </div>

        {/* 7. Total Summary Banner */}
        <div className="bg-[#15191E] text-white rounded-[8px] p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#8B8D98]">Net Settlement Total:</div>
            <div className="text-2xl font-bold font-mono text-[#FF5900] tracking-tight">
              {formatINR(finalTotal)}
            </div>
          </div>
          <div className="text-right text-[11px] text-[#B9BBC6] space-y-0.5">
            <div>
              Subtotal: <span className="font-mono">{formatINR(subtotal)}</span>
            </div>
            {effectiveDiscount > 0 && (
              <div className="text-[#0D9926]">
                Discount: -<span className="font-mono">{formatINR(effectiveDiscount)}</span>
              </div>
            )}
            <div className="capitalize text-white font-medium">
              Mode: <span className="text-[#FF5900]">{paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* 8. Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Log Entry & Update Database
          </Button>
        </div>
      </form>
    </Modal>
  );
};
