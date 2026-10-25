/**
 * Receipt Template Customization Types
 */

export interface ReceiptConfig {
  venueName: string;
  tagline: string;
  addressLine: string;
  contactPhone: string;
  footerMessage1: string;
  footerMessage2: string;
  defaultCashierName: string;
  paperWidth: '80mm' | '58mm';
  showCashier: boolean;
  showStartEndTime: boolean;
  showPaymentMode: boolean;
  showCustomerName: boolean;
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  venueName: 'THE CUE NATION',
  tagline: 'Billiards · Snooker · Artisanal Café',
  addressLine: 'FC Road / Senapati Bapat Marg, Pune, MH',
  contactPhone: '+91 98220 14820',
  footerMessage1: 'Visit Again! Keep cueing at TCN',
  footerMessage2: 'For feedback or tournament entries: +91 98220 14820',
  defaultCashierName: 'Duty Cashier',
  paperWidth: '80mm',
  showCashier: true,
  showStartEndTime: true,
  showPaymentMode: true,
  showCustomerName: true,
};
