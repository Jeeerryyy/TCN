/**
 * Billing and Settlement Types
 * Integrates table game play time, cafe items, split-payments, and GST tax calculations.
 */

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet' | 'split';

export interface SplitPaymentShare {
  method: Exclude<PaymentMethod, 'split'>;
  amount: number;
  referenceNotes?: string; // e.g. "GPay Txn Ref #8932"
}

export interface BillLineItem {
  id: string;
  type: 'table_time' | 'cafe_item' | 'surcharge' | 'discount';
  title: string;
  subtitle?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Bill {
  id: string;
  invoiceNumber: string;    // e.g., 'TCN-2026-0842'
  sessionId?: string;
  tableId?: string;
  tableName?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  
  // Customer details
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  membershipTier?: string;
  
  // Line items
  items: BillLineItem[];
  
  // Financial breakdown
  tableCharge: number;
  cafeCharge: number;
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxGstAmount: number;      // 5% default for cafe / sports entertainment
  finalTotal: number;
  
  // Payment settlement
  status: 'pending' | 'settled' | 'voided';
  paymentMethod: PaymentMethod;
  splitDetails?: SplitPaymentShare[];
  
  createdAt: string;
  settledAt?: string;
  settledByStaff: string;

  // Manual / Notebook backdated entry
  isManualEntry?: boolean;
  notes?: string;
}

