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

export interface SettleSessionOptions {
  tableId: string;
  paymentMethod: PaymentMethod;
  splitShares?: SplitPaymentShare[];
  customDiscountAmount?: number;
  discountReason?: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  customItems?: { name: string; quantity: number; price: number }[];
  tableChargeOverride?: number;
}

export interface SettleCafeBillOptions {
  orderId?: string; // If settling an existing CafeOrder
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  items: { name: string; quantity: number; price: number; notes?: string }[];
  subtotal?: number;
  discountAmount?: number;
  discountReason?: string;
  paymentMethod: PaymentMethod;
  splitShares?: SplitPaymentShare[];
  destination?: 'counter' | 'takeaway';
  cashierName?: string;
  notes?: string;
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
  settleStandaloneCafeBill: (options: SettleCafeBillOptions) => Bill | null;
  addManualBill: (input: ManualBillInput) => Bill;
  deleteBill: (billId: string) => Promise<void>;
  clearAllBills: () => Promise<void>;
  refreshBills: () => Promise<void>;
  updateBillDetails: (
    billId: string,
    updates: { customerName?: string; customerPhone?: string; notes?: string }
  ) => Promise<void>;
  getPendingFolioForTable: (tableId: string) => {
    tableCharge: number;
    billedMinutes: number;
    billedHours: number;
    ratePerMinute: number;
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
  const { tables, activeSessionsMap, endSession, bookings } = useTables();
  const { orders, updateOrderStatus } = useCafe();
  const { customers, deductWallet, updateCustomer, addCustomer } = useCustomers();

  // Helper to ensure customer phone numbers from bookings & CRM are synced to bills
  const reconcileBillsWithBookings = (rawBills: Bill[]): Bill[] => {
    return rawBills.map((b) => {
      if (!b.customerPhone || b.customerPhone.trim() === '') {
        const trimmedName = b.customerName.toLowerCase().trim();
        // Check matching booking
        const matchedBkg = bookings.find(
          (bk) => bk.customerPhone && bk.customerName.toLowerCase().trim() === trimmedName
        );
        if (matchedBkg && matchedBkg.customerPhone) {
          return { ...b, customerPhone: matchedBkg.customerPhone };
        }
        // Check CRM customer
        const matchedCust = customers.find(
          (c) =>
            (b.customerId && c.id === b.customerId && c.phone) ||
            (c.phone && c.name.toLowerCase().trim() === trimmedName)
        );
        if (matchedCust && matchedCust.phone) {
          return { ...b, customerPhone: matchedCust.phone };
        }
      }
      return b;
    });
  };

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
            const reconciled = reconcileBillsWithBookings(remoteBills);
            setBills(reconciled);
            saveToStorage('bills', reconciled);
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
          const reconciled = reconcileBillsWithBookings(next);
          saveToStorage('bills', reconciled);
          return reconciled;
        });
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsubBill();
    };
  }, [bookings]);

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
    const { billedMinutes, billedHours, ratePerMinute, amount: tableCharge } = calculateSessionCharge(
      elapsedSeconds,
      session.ratePerHour,
      table.minMinutes,
      session.ratePerMinute
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
      ratePerMinute,
      elapsedSeconds,
      cafeCharge,
      cafeItems,
      subtotal,
      tierDiscountAmount,
      suggestedGst,
      estimatedTotal,
    };
  };

  const settleTableBill = (options: SettleSessionOptions): Bill | null => {
    const table = tables.find((t) => t.id === options.tableId);
    const session = activeSessionsMap[options.tableId];
    if (!table || !session) return null;

    const folio = getPendingFolioForTable(options.tableId);
    if (!folio) return null;

    const effectiveTableCharge =
      options.tableChargeOverride !== undefined ? options.tableChargeOverride : folio.tableCharge;

    const cafeItemsToBill =
      options.customItems !== undefined
        ? options.customItems
        : folio.cafeItems;

    const effectiveCafeCharge = cafeItemsToBill.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const subtotal = effectiveTableCharge + effectiveCafeCharge;
    const discount = (options.customDiscountAmount || 0) + folio.tierDiscountAmount;
    const finalTotal = Math.max(0, subtotal - discount);

    const sessionEndTime = session.endTime || session.pausedAt || new Date().toISOString();
    const invoiceNumber = `TCN-${new Date().getFullYear()}-${(bills.length + 1045).toString()}`;
    const newBillId = `bill_${Date.now()}`;

    const effectiveRatePerMinute =
      session.ratePerMinute ?? folio.ratePerMinute ?? Number((session.ratePerHour / 60).toFixed(2));

    // Line items
    const lineItems: BillLineItem[] = [
      {
        id: `li_${Date.now()}_table`,
        type: 'table_time',
        title: `${table.name} (${folio.billedMinutes} mins)`,
        subtitle: `Time: ${formatTimeOnly(session.startTime)} – ${formatTimeOnly(sessionEndTime)} (${folio.billedMinutes}m @ ₹${effectiveRatePerMinute.toFixed(2)}/min · ₹${session.ratePerHour}/hr)`,
        quantity: 1,
        unitPrice: effectiveTableCharge,
        totalPrice: effectiveTableCharge,
      },
      ...cafeItemsToBill.map((item, idx) => ({
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

    const finalCustomerName =
      (options.customerName && options.customerName.trim()) ||
      session.primaryCustomerName ||
      'Walk-in Guest';
    const finalCustomerPhone =
      options.customerPhone !== undefined
        ? options.customerPhone.trim() || undefined
        : session.primaryCustomerPhone;

    const settledBill: Bill = {
      id: newBillId,
      invoiceNumber,
      sessionId: session.id,
      tableId: table.id,
      tableName: table.name,
      sessionStartTime: session.startTime,
      sessionEndTime: sessionEndTime,
      customerId: session.customerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      items: lineItems,
      tableCharge: effectiveTableCharge,
      cafeCharge: effectiveCafeCharge,
      subtotal,
      discountAmount: discount,
      discountReason: options.discountReason || (folio.tierDiscountAmount > 0 ? 'Member Tier Privilege' : undefined),
      taxGstAmount: 0,
      finalTotal,
      status: 'settled',
      paymentMethod: options.paymentMethod,
      splitDetails: options.splitShares,
      createdAt: session.startTime,
      settledAt: new Date().toISOString(),
      settledByStaff: options.cashierName || 'Floor Manager',
    };

    // Update customer stats and phone if registered or new
    if (session.customerId) {
      const cust = customers.find((c) => c.id === session.customerId);
      if (cust) {
        updateCustomer(cust.id, {
          totalVisits: cust.totalVisits + 1,
          totalSpent: cust.totalSpent + finalTotal,
          lastVisit: new Date().toISOString().split('T')[0],
          phone: finalCustomerPhone || cust.phone,
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

  const updateBillDetails = async (
    billId: string,
    updates: { customerName?: string; customerPhone?: string; notes?: string }
  ) => {
    let targetBill: Bill | null = null;
    setBills((prev) => {
      const next = prev.map((b) => {
        if (b.id === billId) {
          targetBill = {
            ...b,
            customerName: updates.customerName !== undefined ? updates.customerName.trim() : b.customerName,
            customerPhone: updates.customerPhone !== undefined ? (updates.customerPhone.trim() || undefined) : b.customerPhone,
            notes: updates.notes !== undefined ? updates.notes.trim() : b.notes,
          };
          return targetBill;
        }
        return b;
      });
      saveToStorage('bills', next);
      return next;
    });

    if (targetBill) {
      await dbService.syncBill(targetBill);
    }
  };

  /**
   * Settles standalone snacks & drinks cafe order for separate customers
   */
  const settleStandaloneCafeBill = (options: SettleCafeBillOptions): Bill | null => {
    if (!options.items || options.items.length === 0) return null;

    const invoiceNumber = `TCN-${new Date().getFullYear()}-${(bills.length + 1045).toString()}`;
    const newBillId = `bill_cafe_${Date.now()}`;
    const subtotal =
      options.subtotal !== undefined
        ? options.subtotal
        : options.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = options.discountAmount || 0;
    const finalTotal = Math.max(0, subtotal - discount);

    const lineItems: BillLineItem[] = options.items.map((item, idx) => ({
      id: `li_${Date.now()}_cafe_${idx}`,
      type: 'cafe_item' as const,
      title: item.name,
      subtitle: item.notes ? `Note: ${item.notes}` : undefined,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    }));

    const finalCustomerName =
      (options.customerName && options.customerName.trim()) || 'Walk-in Guest';
    const finalCustomerPhone = options.customerPhone
      ? options.customerPhone.trim() || undefined
      : undefined;

    // Customer CRM management
    let customerId = options.customerId;
    if (finalCustomerPhone) {
      const cleanPhone = finalCustomerPhone.replace(/[\s-]/g, '');
      let matchedCust = customerId ? customers.find((c) => c.id === customerId) : undefined;
      if (!matchedCust) {
        matchedCust = customers.find(
          (c) => c.phone && c.phone.replace(/[\s-]/g, '') === cleanPhone
        );
      }
      if (matchedCust) {
        customerId = matchedCust.id;
        updateCustomer(matchedCust.id, {
          totalVisits: (matchedCust.totalVisits || 1) + 1,
          totalSpent: (matchedCust.totalSpent || 0) + finalTotal,
          lastVisit: new Date().toISOString().split('T')[0],
        });
      } else {
        const newCust = addCustomer({
          name: finalCustomerName,
          phone: finalCustomerPhone,
          notes: 'Customer created from snacks & drinks order',
        });
        customerId = newCust.id;
        updateCustomer(newCust.id, {
          totalSpent: finalTotal,
          lastVisit: new Date().toISOString().split('T')[0],
        });
      }
    }

    // Wallet deduction if customer pays with wallet
    if (options.paymentMethod === 'wallet' && customerId) {
      const ok = deductWallet(customerId, finalTotal, invoiceNumber);
      if (!ok) {
        alert('Insufficient wallet credit. Please select alternate payment method or top up.');
        return null;
      }
    }

    const existingOrder = options.orderId ? orders.find((o) => o.id === options.orderId) : null;

    const settledBill: Bill = {
      id: newBillId,
      invoiceNumber,
      tableName: options.destination === 'takeaway' ? 'Takeaway Counter' : 'Café Lounge / Counter',
      customerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      items: lineItems,
      tableCharge: 0,
      cafeCharge: subtotal,
      subtotal,
      discountAmount: discount,
      discountReason: options.discountReason || (discount > 0 ? 'Promo Discount' : undefined),
      taxGstAmount: 0,
      finalTotal,
      status: 'settled',
      paymentMethod: options.paymentMethod,
      splitDetails: options.splitShares,
      createdAt: existingOrder ? existingOrder.createdAt : new Date().toISOString(),
      settledAt: new Date().toISOString(),
      settledByStaff: options.cashierName || 'Café Cashier',
      notes: options.notes,
    };

    // If an existing orderId was passed, mark order as served and billed
    if (options.orderId) {
      const orderToUpdate = existingOrder || orders.find((o) => o.id === options.orderId);
      if (orderToUpdate) {
        const updatedOrder = {
          ...orderToUpdate,
          status: 'served' as const,
          isBilled: true,
          billId: settledBill.id,
          servedAt: new Date().toISOString(),
        };
        updateOrderStatus(orderToUpdate.id, 'served');
        dbService.syncOrder(updatedOrder);
      }
    }

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

    return settleStandaloneCafeBill({
      orderId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      subtotal: order.subtotal,
      paymentMethod,
      destination: order.destination === 'takeaway' ? 'takeaway' : 'counter',
    });
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
        settleStandaloneCafeBill,
        addManualBill,
        deleteBill,
        clearAllBills,
        refreshBills,
        updateBillDetails,
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
