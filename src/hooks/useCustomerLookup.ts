import { useMemo, useCallback } from 'react';
import { useCustomers } from '../context/CustomerContext';
import { useTables } from '../context/TableContext';
import { useBilling } from '../context/BillingContext';

export interface KnownCustomerSummary {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  tier: string;
  totalVisits: number;
  walletBalance: number;
  totalSpent: number;
  preferredGame?: 'pool' | 'snooker' | 'both';
  preferredTableCode?: string;
  notes?: string;
  isCrmMember: boolean;
  lastVisit?: string;
}

/**
 * Normalizes phone numbers for fuzzy matching (removes non-digits, extracts last 10 digits)
 */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Custom hook to aggregate all customer records across:
 * 1. CRM Customer Database
 * 2. Previous Table Sessions
 * 3. Previous Advance Bookings
 * 4. Previous Settle Bills
 *
 * Provides instant live auto-suggest, lookup, and auto-filling of customer details.
 */
export function useCustomerLookup() {
  const { customers } = useCustomers();
  const { sessions, bookings } = useTables();
  const { bills } = useBilling();

  // Unified directory of known visitors
  const knownCustomers = useMemo(() => {
    const directory = new Map<string, KnownCustomerSummary>();

    // 1. Add all registered CRM customers first (highest authority)
    customers.forEach((cust) => {
      const normPhone = normalizePhone(cust.phone);
      const key = normPhone || cust.name.toLowerCase().trim();
      directory.set(key, {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        tier: cust.tier,
        totalVisits: cust.totalVisits || 1,
        walletBalance: cust.walletBalance || 0,
        totalSpent: cust.totalSpent || 0,
        preferredGame: cust.preferredGame,
        preferredTableCode: cust.preferredTableCode,
        notes: cust.notes,
        isCrmMember: true,
        lastVisit: cust.lastVisit,
      });
    });

    // Count appearances in historical records
    const visitCounts = new Map<string, number>();

    // 2. Scan past bills
    bills.forEach((bill) => {
      if (bill.isDeleted || bill.status === 'voided') return;
      const bName = bill.customerName?.trim();
      const bPhone = bill.customerPhone?.trim() || '';
      if (!bName) return;

      const normPhone = normalizePhone(bPhone);
      const key = normPhone || bName.toLowerCase();
      visitCounts.set(key, (visitCounts.get(key) || 0) + 1);

      if (!directory.has(key)) {
        directory.set(key, {
          name: bName,
          phone: bPhone,
          tier: 'visitor',
          totalVisits: 1,
          walletBalance: 0,
          totalSpent: bill.finalTotal || 0,
          isCrmMember: false,
          lastVisit: bill.settledAt || bill.createdAt,
        });
      }
    });

    // 3. Scan past table sessions
    sessions.forEach((sess) => {
      if (sess.isDeleted) return;
      const sName = sess.primaryCustomerName?.trim();
      const sPhone = sess.primaryCustomerPhone?.trim() || '';
      if (!sName || sName.toLowerCase().includes('live game')) return;

      const normPhone = normalizePhone(sPhone);
      const key = normPhone || sName.toLowerCase();
      visitCounts.set(key, (visitCounts.get(key) || 0) + 1);

      if (!directory.has(key)) {
        directory.set(key, {
          name: sName,
          phone: sPhone,
          tier: 'visitor',
          totalVisits: 1,
          walletBalance: 0,
          totalSpent: 0,
          preferredGame: sess.tableType,
          notes: sess.notes,
          isCrmMember: false,
          lastVisit: sess.startTime,
        });
      }
    });

    // 4. Scan past bookings
    bookings.forEach((bk) => {
      const bkName = bk.customerName?.trim();
      const bkPhone = bk.customerPhone?.trim() || '';
      if (!bkName) return;

      const normPhone = normalizePhone(bkPhone);
      const key = normPhone || bkName.toLowerCase();
      visitCounts.set(key, (visitCounts.get(key) || 0) + 1);

      if (!directory.has(key)) {
        directory.set(key, {
          name: bkName,
          phone: bkPhone,
          tier: 'visitor',
          totalVisits: 1,
          walletBalance: 0,
          totalSpent: 0,
          notes: bk.notes,
          isCrmMember: false,
          lastVisit: bk.bookingDate,
        });
      }
    });

    // Update non-CRM visitor total visits with calculated history count
    directory.forEach((item, key) => {
      if (!item.isCrmMember) {
        const histCount = visitCounts.get(key) || 1;
        item.totalVisits = histCount;
      }
    });

    return Array.from(directory.values());
  }, [customers, sessions, bookings, bills]);

  /**
   * Search customers by partial name or partial phone
   */
  const searchCustomers = useCallback(
    (query: string, limit: number = 6): KnownCustomerSummary[] => {
      const clean = query.trim().toLowerCase();
      if (!clean) return [];

      const cleanDigits = clean.replace(/\D/g, '');

      const matches = knownCustomers.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(clean);
        const phoneMatch = cleanDigits.length >= 3 && normalizePhone(c.phone).includes(cleanDigits);
        return nameMatch || phoneMatch;
      });

      // Sort by relevance:
      // 1. Exact name match
      // 2. Name starts with query
      // 3. CRM members first
      // 4. Higher visits count
      matches.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        if (aName === clean && bName !== clean) return -1;
        if (bName === clean && aName !== clean) return 1;

        const aStarts = aName.startsWith(clean);
        const bStarts = bName.startsWith(clean);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        if (a.isCrmMember && !b.isCrmMember) return -1;
        if (!a.isCrmMember && b.isCrmMember) return 1;

        return b.totalVisits - a.totalVisits;
      });

      return matches.slice(0, limit);
    },
    [knownCustomers]
  );

  /**
   * Find a customer by exact or high-confidence name match
   */
  const findCustomerByName = useCallback(
    (name: string): KnownCustomerSummary | undefined => {
      const clean = name.trim().toLowerCase();
      if (!clean) return undefined;
      return knownCustomers.find((c) => c.name.trim().toLowerCase() === clean);
    },
    [knownCustomers]
  );

  /**
   * Find a customer by exact phone match
   */
  const findCustomerByPhone = useCallback(
    (phone: string): KnownCustomerSummary | undefined => {
      const norm = normalizePhone(phone);
      if (!norm || norm.length < 5) return undefined;
      return knownCustomers.find((c) => normalizePhone(c.phone) === norm);
    },
    [knownCustomers]
  );

  return {
    knownCustomers,
    searchCustomers,
    findCustomerByName,
    findCustomerByPhone,
  };
}
