import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bill, BillLineItem, PaymentMethod, SplitPaymentShare } from '../types/billing.types';
import { INITIAL_BILLS } from '../data/mockBills';
import { loadFromStorage, saveToStorage, clearBillsStorage } from '../utils/storage';
import { useTables } from './TableContext';
import { useCafe } from './CafeContext';
import { useCustomers } from './CustomerContext';
import { calculateElapsedSeconds, calculateSessionCharge } from '../utils/timer';
import { formatTimeOnly } from '../utils/formatters';
import { MEMBERSHIP_BENEFITS } from '../data/initialCustomers';
import { dbService } from '../services/db';

interface SettleSessionOptions {
  tableId: string;
  paymentMethod: PaymentMethod;
  splitShares?: SplitPaymentShare[];
  customDiscountAmount?: number;
  discountReason?: string;
  cashierName?: string;
}

export interface ManualBillInput {
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes?: number;
  entryType: 'table' | 'cafe' | 'both';
  tableId?: string;
  tableName?: string;
  ratePerHour?: number;
  tableCharge: number;
  cafeCharge: number;
  discountAmount?: number;
  discountReason?: string;
  finalTotal: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  shouldCreateOrUpdateCustomer?: boolean;
  notes?: string;
  cashierName?: string;
}

interface BillingContextType {
  bills: Bill[];
  settleTableBill: (options: SettleSessionOptions) => Bill | null;
  settleQuickCafeBill: (orderId: string, paymentMethod: PaymentMethod) => Bill | null;
  addManualBill: (input: ManualBillInput) => Bill;
  deleteBill: (billId: string) => Promise<void>;
  clearAllBills: () => Promise<void>;
  refreshBills: () => Promise<void>;
  getPendingFolioForTable: (tableId: string) => {
    tableCharge: number;
    billedMinutes: number;
    billedHours: number;
    elapsedSeconds: number;
    cafeCharge: number;
    cafeItems: { name: string; quantity: number; price: number }[];
    subtotal: number;
    tierDiscountAmount: number;
    suggestedGst: number;
    estimatedTotal: number;
  } | null;
  activeBillModal: Bill | null;
  setActiveBillModal: (bill: Bill | null) => void;
  isLoading: boolean;
  isSyncing: boolean;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tables, activeSessionsMap, endSession } = useTables();
  const { orders, updateOrderStatus } = useCafe();
  const { customers, deductWallet, updateCustomer, addCustomer } = useCustomers();

  const [bills, setBills] = useState<Bill[]>(() =>
    loadFromStorage('bills', INITIAL_BILLS)
  );

  const [activeBillModal, setActiveBillModal] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const syncBillsFromCloud = () => {
      setIsSyncing(true);
      dbService
        .fetchBills()
        .then((remoteBills) => {
          if (remoteBills !== null) {
            setBills(remoteBills);
            saveToStorage('bills', remoteBills);
          }
        })
        .finally(() => {
          setIsLoading(false);
          setIsSyncing(false);
        });
    };

    // Initial fetch on mount
    syncBillsFromCloud();

    // Background cloud polling every 4 seconds to guarantee multi-device live sync
    const pollTimer = setInterval(syncBillsFromCloud, 4000);

    // Listen to live bill settlements and deletions (Staff POS settlements streaming to Admin)
    const unsubBill = dbService.onBillChange((bill, action) => {
      if (action === 'DELETE') {
        if (bill.id === '__ALL__') {
          setBills([]);
          clearBillsStorage();
          saveToStorage('bills', []);
        } else {
          setBills((prev) => {
            const next = prev.filter((b) => b.id !== bill.id);
            saveToStorage('bills', next);
            return next;
          });
        }
      } else {
        setBills((prev) => {
          const idx = prev.findIndex((b) => b.id === bill.id);
          let next: Bill[];
          if (idx > -1) {
            next = [...prev];
            next[idx] = bill;
          } else {
            next = [bill, ...prev];
          }
          saveToStorage('bills', next);
          return next;
        });
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsubBill();
    };
  }, []);

  useEffect(() => {
    saveToStorage('bills', bills);
  }, [bills]);

  /**
   * Previews current live table charges and attached cafe orders before committing
   */
  const getPendingFolioForTable = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    const session = activeSessionsMap[tableId];
    if (!table || !session) return null;

    const elapsedSeconds = calculateElapsedSeconds(session);
    const { billedMinutes, billedHours, amount: tableCharge } = calculateSessionCharge(
      elapsedSeconds,
      session.ratePerHour,
      table.minMinutes
    );

    // Collect all active cafe orders linked to this session
    const linkedOrders = orders.filter(
      (o) =>
        !o.isBilled &&
        o.status !== 'cancelled' &&
        ((session.linkedCafeOrderIds && session.linkedCafeOrderIds.includes(o.id)) ||
          o.tableId === session.tableId)
    );
    const cafeCharge = linkedOrders.reduce((sum, o) => sum + o.subtotal, 0);

    const cafeItems = linkedOrders.flatMap((o) =>
      o.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      }))
    );

    const subtotal = tableCharge + cafeCharge;

    // Membership tier discount check
    let tierDiscountAmount = 0;
    if (session.customerId) {
      const customer = customers.find((c) => c.id === session.customerId);
      if (customer && customer.tier) {
        const benefit = MEMBERSHIP_BENEFITS[customer.tier];
        if (benefit) {
          const tableDisc = (tableCharge * benefit.tableDiscountPercent) / 100;
          const cafeDisc = (cafeCharge * benefit.cafeDiscountPercent) / 100;
          tierDiscountAmount = Math.round(tableDisc + cafeDisc);
        }
      }
    }

    const netBeforeTax = Math.max(0, subtotal - tierDiscountAmount);
    const suggestedGst = 0; // GST removed per operational standard
    const estimatedTotal = netBeforeTax;

    return {
      tableCharge,
      billedMinutes,
      billedHours,
      elapsedSeconds,
      cafeCharge,
      cafeItems,
      subtotal,
      tierDiscountAmount,
      suggestedGst,
      estimatedTotal,
    };
  };

  /**
   * Finalizes table session, discharges table to available, marks orders billed, and creates Bill record
   */
  const settleTableBill = (options: SettleSessionOptions): Bill | null => {
    const table = tables.find((t) => t.id === options.tableId);
    const session = activeSessionsMap[options.tableId];
    if (!table || !session) return null;

    const folio = getPendingFolioForTable(options.tableId);
    if (!folio) return null;

    const discount = (options.customDiscountAmount || 0) + folio.tierDiscountAmount;
    const taxableSubtotal = Math.max(0, folio.subtotal - discount);
    const taxGstAmount = 0; // GST completely removed
    const finalTotal = taxableSubtotal;

    const sessionEndTime = session.endTime || session.pausedAt || new Date().toISOString();
    const invoiceNumber = `TCN-${new Date().getFullYear()}-${(bills.length + 1045).toString()}`;
    const newBillId = `bill_${Date.now()}`;

    // Line items
    const lineItems: BillLineItem[] = [
      {
        id: `li_${Date.now()}_table`,
        type: 'table_time',
        title: `${table.name} (${folio.billedHours} hr${folio.billedHours > 1 ? 's' : ''})`,
        subtitle: `Time: ${formatTimeOnly(session.startTime)} – ${formatTimeOnly(sessionEndTime)} (${folio.billedMinutes}m billed @ ₹${session.ratePerHour}/hr)`,
        quantity: 1,
        unitPrice: folio.tableCharge,
        totalPrice: folio.tableCharge,
      },
      ...folio.cafeItems.map((item, idx) => ({
        id: `li_${Date.now()}_cafe_${idx}`,
        type: 'cafe_item' as const,
        title: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
      })),
    ];

    // Handle wallet deduction if selected
    if (options.paymentMethod === 'wallet' && session.customerId) {
      const ok = deductWallet(session.customerId, finalTotal, invoiceNumber);
      if (!ok) {
        alert('Insufficient wallet credit. Please select alternate payment method or top up.');
        return null;
      }
    }

    const settledBill: Bill = {
      id: newBillId,
      invoiceNumber,
      sessionId: session.id,
      tableId: table.id,
      tableName: table.name,
      sessionStartTime: session.startTime,
      sessionEndTime: sessionEndTime,
      customerId: session.customerId,
      customerName: session.primaryCustomerName,
      customerPhone: session.primaryCustomerPhone,
      items: lineItems,
      tableCharge: folio.tableCharge,
      cafeCharge: folio.cafeCharge,
      subtotal: folio.subtotal,
      discountAmount: discount,
      discountReason: options.discountReason || (folio.tierDiscountAmount > 0 ? 'Member Tier Privilege' : undefined),
      taxGstAmount,
      finalTotal,
      status: 'settled',
      paymentMethod: options.paymentMethod,
      splitDetails: options.splitShares,
      createdAt: session.startTime,
      settledAt: new Date().toISOString(),
      settledByStaff: options.cashierName || 'Floor Manager',
    };

    // Update customer stats
    if (session.customerId) {
      const cust = customers.find((c) => c.id === session.customerId);
      if (cust) {
        updateCustomer(cust.id, {
          totalVisits: cust.totalVisits + 1,
          totalSpent: cust.totalSpent + finalTotal,
          lastVisit: new Date().toISOString().split('T')[0],
        });
      }
    }

    // Mark linked cafe orders as served & billed in local state and Supabase
    const linkedOrders = orders.filter(
      (o) =>
        !o.isBilled &&
        o.status !== 'cancelled' &&
        ((session.linkedCafeOrderIds && session.linkedCafeOrderIds.includes(o.id)) ||
          o.tableId === session.tableId)
    );
    linkedOrders.forEach((o) => {
      const updatedOrder = { ...o, status: 'served' as const, isBilled: true, billId: settledBill.id };
      updateOrderStatus(o.id, 'served');
      dbService.syncOrder(updatedOrder);
    });

    // Finalize session & free up table
    endSession(options.tableId);

    // Save bill
    setBills((prev) => [settledBill, ...prev]);
    setActiveBillModal(settledBill);
    dbService.syncBill(settledBill);

    return settledBill;
  };

  /**
   * Settles standalone counter cafe order immediately
   */
  const settleQuickCafeBill = (orderId: string, paymentMethod: PaymentMethod): Bill | null => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const invoiceNumber = `TCN-${new Date().getFullYear()}-${(bills.length + 1045).toString()}`;
    const taxGstAmount = 0; // GST completely removed
    const finalTotal = order.subtotal;

    const lineItems: BillLineItem[] = order.items.map((i, idx) => ({
      id: `li_${Date.now()}_${idx}`,
      type: 'cafe_item',
      title: i.name,
      quantity: i.quantity,
      unitPrice: i.price,
      totalPrice: i.price * i.quantity,
    }));

    const bill: Bill = {
      id: `bill_${Date.now()}`,
      invoiceNumber,
      customerName: order.customerName || 'Walk-in Guest',
      items: lineItems,
      tableCharge: 0,
      cafeCharge: order.subtotal,
      subtotal: order.subtotal,
      discountAmount: 0,
      taxGstAmount,
      finalTotal,
      status: 'settled',
      paymentMethod,
      createdAt: order.createdAt,
      settledAt: new Date().toISOString(),
      settledByStaff: 'Cafe Counter POS',
    };

    updateOrderStatus(orderId, 'served');
    const updatedOrder = { ...order, status: 'served' as const, isBilled: true, billId: bill.id };
    dbService.syncOrder(updatedOrder);
    setBills((prev) => [bill, ...prev]);
    setActiveBillModal(bill);
    dbService.syncBill(bill);

    return bill;
  };

  /**
   * Records a manual / notebook backdated customer entry into the database & CRM
   */
  const addManualBill = (input: ManualBillInput): Bill => {
    const rawDate = input.date || new Date().toISOString().split('T')[0];
    const startTimeStr = input.startTime || '12:00';
    const endTimeStr = input.endTime || '13:00';

    let sessionStartTime: string;
    let sessionEndTime: string;
    try {
      sessionStartTime = new Date(`${rawDate}T${startTimeStr}:00`).toISOString();
    } catch {
      sessionStartTime = new Date().toISOString();
    }

    try {
      sessionEndTime = new Date(`${rawDate}T${endTimeStr}:00`).toISOString();
    } catch {
      sessionEndTime = sessionStartTime;
    }

    const year = new Date(rawDate).getFullYear() || new Date().getFullYear();
    const invoiceNumber = `TCN-${year}-MAN-${(bills.length + 1045).toString()}`;
    const newBillId = `bill_man_${Date.now()}`;

    // Line items
    const lineItems: BillLineItem[] = [];

    if (input.tableCharge > 0 || input.entryType === 'table' || input.entryType === 'both') {
      const durationMins = input.durationMinutes || 60;
      const hrs = Number((durationMins / 60).toFixed(1));
      lineItems.push({
        id: `li_${Date.now()}_table`,
        type: 'table_time',
        title: `${input.tableName || 'Game Table'} (${hrs} hr${hrs > 1 ? 's' : ''})`,
        subtitle: `Notebook Record: ${startTimeStr} – ${endTimeStr} (${durationMins}m @ ₹${input.ratePerHour || 0}/hr)`,
        quantity: 1,
        unitPrice: input.tableCharge,
        totalPrice: input.tableCharge,
      });
    }

    if (input.cafeCharge > 0 || input.entryType === 'cafe' || input.entryType === 'both') {
      lineItems.push({
        id: `li_${Date.now()}_cafe`,
        type: 'cafe_item',
        title: 'Café & Snack Tab',
        subtitle: input.notes ? `Notebook Record: ${input.notes}` : 'Logged from paper notebook register',
        quantity: 1,
        unitPrice: input.cafeCharge,
        totalPrice: input.cafeCharge,
      });
    }

    if (lineItems.length === 0) {
      lineItems.push({
        id: `li_${Date.now()}_gen`,
        type: 'surcharge',
        title: 'Notebook Settlement Charge',
        subtitle: input.notes || 'Manual register backdated entry',
        quantity: 1,
        unitPrice: input.finalTotal,
        totalPrice: input.finalTotal,
      });
    }

    // Customer CRM management
    let customerId = input.customerId;
    if (input.shouldCreateOrUpdateCustomer !== false && input.customerName.trim()) {
      const cleanPhone = (input.customerPhone || '').trim();
      let matchedCust = customerId ? customers.find((c) => c.id === customerId) : undefined;
      if (!matchedCust && cleanPhone) {
        matchedCust = customers.find(
          (c) => c.phone.replace(/[\s-]/g, '') === cleanPhone.replace(/[\s-]/g, '')
        );
      }

      if (matchedCust) {
        customerId = matchedCust.id;
        updateCustomer(matchedCust.id, {
          totalVisits: (matchedCust.totalVisits || 1) + 1,
          totalSpent: (matchedCust.totalSpent || 0) + input.finalTotal,
          lastVisit: rawDate,
        });
      } else if (cleanPhone) {
        const newCust = addCustomer({
          name: input.customerName.trim(),
          phone: cleanPhone,
          notes: `Added from manual notebook backdated entry (${rawDate})`,
        });
        customerId = newCust.id;
        updateCustomer(newCust.id, {
          totalSpent: input.finalTotal,
          lastVisit: rawDate,
        });
      }
    }

    const manualBill: Bill = {
      id: newBillId,
      invoiceNumber,
      tableId: input.tableId,
      tableName: input.tableName || (input.entryType === 'cafe' ? 'Counter POS' : 'Table Session'),
      sessionStartTime,
      sessionEndTime,
      customerId,
      customerName: input.customerName.trim() || 'Walk-in Guest',
      customerPhone: input.customerPhone?.trim(),
      items: lineItems,
      tableCharge: input.tableCharge,
      cafeCharge: input.cafeCharge,
      subtotal: input.tableCharge + input.cafeCharge,
      discountAmount: input.discountAmount || 0,
      discountReason: input.discountReason || (input.notes ? `Notebook: ${input.notes}` : 'Manual Paper Register Entry'),
      taxGstAmount: 0,
      finalTotal: input.finalTotal,
      status: 'settled',
      paymentMethod: input.paymentMethod || 'cash',
      createdAt: sessionStartTime,
      settledAt: sessionEndTime,
      settledByStaff: input.cashierName || 'Staff Reconcile',
      isManualEntry: true,
      notes: input.notes,
    };

    setBills((prev) => {
      const next = [manualBill, ...prev];
      saveToStorage('bills', next);
      return next;
    });
    dbService.syncBill(manualBill);

    return manualBill;
  };

  const refreshBills = async () => {
    const remote = await dbService.fetchBills();
    if (remote !== null) {
      setBills(remote);
      saveToStorage('bills', remote);
    }
  };

  const deleteBill = async (billId: string) => {
    setBills((prev) => {
      const next = prev.filter((b) => b.id !== billId);
      saveToStorage('bills', next);
      return next;
    });
    await dbService.deleteBillRemote(billId);
  };

  const clearAllBills = async () => {
    setBills([]);
    clearBillsStorage();
    saveToStorage('bills', []);
    await dbService.clearAllBillsRemote();
  };

  return (
    <BillingContext.Provider
      value={{
        bills,
        settleTableBill,
        settleQuickCafeBill,
        addManualBill,
        deleteBill,
        clearAllBills,
        refreshBills,
        getPendingFolioForTable,
        activeBillModal,
        setActiveBillModal,
        isLoading,
        isSyncing,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = (): BillingContextType => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};
