import { Customer, TierBenefit } from '../types/customer.types';

export const MEMBERSHIP_BENEFITS: Record<string, TierBenefit> = {
  standard: {
    tier: 'standard',
    label: 'Standard Guest',
    tableDiscountPercent: 0,
    cafeDiscountPercent: 0,
    colorHex: '#94A3B8',
  },
  silver: {
    tier: 'silver',
    label: 'Silver Cue Club',
    tableDiscountPercent: 10,
    cafeDiscountPercent: 5,
    colorHex: '#CBD5E1',
  },
  gold: {
    tier: 'gold',
    label: 'Gold Pro Member',
    tableDiscountPercent: 15,
    cafeDiscountPercent: 10,
    colorHex: '#E5B869',
  },
  platinum: {
    tier: 'platinum',
    label: 'Platinum Masters',
    tableDiscountPercent: 20,
    cafeDiscountPercent: 15,
    colorHex: '#60A5FA',
  },
};

// Sanitized: Zero fake customers. Real customer records are added live through the CRM or at checkout.
export const INITIAL_CUSTOMERS: Customer[] = [];
