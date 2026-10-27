/**
 * Table and Session Management Types
 * Defines data structures for billiard and snooker table floor operations.
 */

export type TableType = 'pool' | 'snooker';

export type TableStatus = 'available' | 'occupied' | 'paused' | 'maintenance' | 'reserved';

export interface Table {
  id: string;
  name: string;             // e.g., 'Pool Table 1', 'Championship Snooker 1'
  shortCode: string;        // e.g., 'P1', 'S1'
  type: TableType;
  size: string;             // e.g., '7 ft Standard', '8 ft English', '12 ft Tournament'
  clothColor: string;       // e.g., 'Tournament Green', 'Electric Blue', 'Burgundy'
  ratePerHour: number;      // Standard hourly fee in INR (e.g., 150, 180, 300)
  ratePerMinute?: number;   // Price per minute in INR (e.g., 2.50, 3.00, 5.00)
  minMinutes: number;       // Minimum billing threshold (e.g., 0 or 15 mins)
  status: TableStatus;
  currentSessionId?: string;
  locationZone?: string;    // e.g., 'Main Floor', 'VIP Lounge', 'Smoking Zone'
}

export interface Player {
  id?: string;
  name: string;
  isRegisteredCustomer?: boolean;
}

export interface TableSession {
  id: string;
  tableId: string;
  tableName: string;
  tableType: TableType;
  ratePerHour: number;
  ratePerMinute?: number;
  
  // Timing metrics
  startTime: string;        // ISO timestamp
  endTime?: string;         // ISO timestamp when ended
  pausedAt?: string;        // ISO timestamp when current pause started
  totalPausedDurationMs: number; // Accumulated paused milliseconds
  
  // Players and customer link
  primaryCustomerName: string;
  primaryCustomerPhone?: string;
  customerId?: string;      // Links to CRM customer profile if registered
  playersCount: number;
  playerNames: string[];
  
  // Operational details
  status: 'active' | 'paused' | 'completed';
  notes?: string;
  assignedStaffId?: string;
  
  // Attached Cafe Orders (Consolidated Billing)
  linkedCafeOrderIds: string[];
}

export interface SessionTransferPayload {
  sessionId: string;
  fromTableId: string;
  toTableId: string;
  reason?: string;
  transferredAt: string;
}

export interface TableBooking {
  id: string;
  tableId: string;
  tableName: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:MM (e.g. '18:00')
  durationMinutes: number; // e.g. 60 or 120
  advanceDeposit: number;
  playersCount: number;
  status: 'confirmed' | 'checked-in' | 'cancelled';
  notes?: string;
  createdAt: string;
}
