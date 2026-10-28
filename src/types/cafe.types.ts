/**
 * Cafe & POS Domain Types
 * Covers menu catalog, item classifications, and kitchen order tickets (KOT).
 */

export type CafeCategory = 
  | 'coffee' 
  | 'beverages' 
  | 'shakes' 
  | 'snacks' 
  | 'sandwiches' 
  | 'quick_bites' 
  | 'desserts';

export interface MenuItem {
  id: string;
  name: string;
  category: CafeCategory;
  price: number;
  description?: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  prepTimeMinutes: number;
  imageUrl?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string; // Special instructions like "no sugar", "extra spicy"
}

export type OrderDestination = 'table' | 'counter' | 'takeaway';

export type KitchenStatus = 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled';

export interface CafeOrder {
  id: string;
  orderNumber: string; // e.g. "ORD-1042"
  destination: OrderDestination;
  tableId?: string; // Present if charged to an active billiard/snooker table
  tableName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  status: KitchenStatus;
  isBilled: boolean; // True once absorbed into a settled folio
  billId?: string;
  createdAt: string; // ISO string
  servedAt?: string;
}
