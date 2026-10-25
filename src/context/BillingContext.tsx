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

interface BillingContextType {
  bills: Bill[];
  settleTableBill: (options: SettleSessionOptions) => Bill | null;
  settleQuickCafeBill: (orderId: string, paymentMethod: PaymentMethod) => Bill | null;
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
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tables, activeSessionsMap, endSession } = useTables();
  const { orders, updateOrderStatus } = useCafe();
  const { customers, deductWallet, updateCustomer } = useCustomers();

  const [bills, setBills] = useState<Bill[]>(() =>
    loadFromStorage('bills', INITIAL_BILLS)
  );

  const [activeBillModal, setActiveBillModal] = useState<Bill | null>(null);

  useEffect(() => {
    const syncBillsFromCloud = () => {
      dbService.fetchBills().then((remoteBills) => {
        if (remoteBills !== null) {
          setBills(remoteBills);
          saveToStorage('bills', remoteBills);
        }
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
        deleteBill,
        clearAllBills,
        refreshBills,
        getPendingFolioForTable,
        activeBillModal,
        setActiveBillModal,
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
