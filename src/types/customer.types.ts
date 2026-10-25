/**
 * Customer Relationship Management (CRM) Types
 * Handles player profiles, membership tiers, loyalty credits, and visit ledgers.
 */

export type MembershipTier = 'standard' | 'silver' | 'gold' | 'platinum';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tier: MembershipTier;
  walletBalance: number;     // Prepaid balance usable for quick checkout
  totalVisits: number;
  totalSpent: number;
  preferredGame: 'pool' | 'snooker' | 'both';
  preferredTableCode?: string;
  memberSince: string;       // ISO date
  lastVisit: string;         // ISO date
  notes?: string;            // Cue preferences, locker details, etc.
}

export interface WalletTransaction {
  id: string;
  customerId: string;
  type: 'credit' | 'debit';  // 'credit' = top-up, 'debit' = paid from wallet
  amount: number;
  description: string;
  timestamp: string;
  balanceAfter: number;
  referenceBillId?: string;
}

export interface TierBenefit {
  tier: MembershipTier;
  label: string;
  tableDiscountPercent: number;
  cafeDiscountPercent: number;
  colorHex: string;
}
