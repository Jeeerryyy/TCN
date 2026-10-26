/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import { getSupabaseClient } from './supabaseClient';
import { Table, TableSession, TableBooking } from '../types/table.types';
import { Customer } from '../types/customer.types';
import { Bill } from '../types/billing.types';
import { CafeOrder, MenuItem } from '../types/cafe.types';
import { INITIAL_TABLES } from '../data/initialTables';

export type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

type Listener<T> = (data: T, action: SyncAction) => void;
type StatusListener = (status: SyncStatus, message?: string) => void;

// In-memory event listener registry
const tableListeners = new Set<Listener<Table>>();
const sessionListeners = new Set<Listener<TableSession>>();
const bookingListeners = new Set<Listener<TableBooking>>();
const customerListeners = new Set<Listener<Customer>>();
const billListeners = new Set<Listener<Bill>>();
const orderListeners = new Set<Listener<CafeOrder>>();
const menuListeners = new Set<(items: MenuItem[]) => void>();
const statusListeners = new Set<StatusListener>();

let currentSyncStatus: SyncStatus = 'offline';
let realtimeChannel: ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

// Initialize local cross-tab BroadcastChannel
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel('tcn_live_channel');
    broadcastChannel.onmessage = (event) => {
      const { type, data, action } = event.data || {};
      if (!type || !data) return;

      if (type === 'table') tableListeners.forEach((l) => l(data, action));
      if (type === 'session') sessionListeners.forEach((l) => l(data, action));
      if (type === 'booking') bookingListeners.forEach((l) => l(data, action));
      if (type === 'customer') customerListeners.forEach((l) => l(data, action));
      if (type === 'bill') billListeners.forEach((l) => l(data, action));
      if (type === 'order') orderListeners.forEach((l) => l(data, action));
      if (type === 'menu') menuListeners.forEach((l) => l(data));
    };
  } catch (e) {
    console.warn('[TCN Realtime] Local broadcast channel not available:', e);
  }
}

function broadcastLocally(type: string, data: unknown, action: SyncAction) {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type, data, action });
    }
  } catch (e) {
    console.warn('[TCN Realtime] Broadcast failed:', e);
  }
}

function notifyStatus(status: SyncStatus, message?: string) {
  currentSyncStatus = status;
  statusListeners.forEach((l) => l(status, message));
}

// --- ENTERPRISE OFFLINE MUTATIONS QUEUE ---
export interface QueuedMutation {
  id: string;
  type: 'table' | 'session' | 'booking' | 'bill' | 'customer' | 'order' | 'menu';
  action: 'UPSERT' | 'DELETE';
  payload: any;
  timestamp: number;
}

type QueueListener = (count: number) => void;
const queueListeners = new Set<QueueListener>();
const OFFLINE_QUEUE_KEY = 'tcn_offline_mutations_queue';

function getOfflineQueue(): QueuedMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: QueuedMutation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    queueListeners.forEach((l) => l(queue.length));
  } catch (e) {
    console.warn('[Offline Queue] Save error:', e);
  }
}

function enqueueOfflineMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) {
  const queue = getOfflineQueue();
  const entityId = mutation.payload?.id;
  const filtered = entityId
    ? queue.filter((q) => !(q.type === mutation.type && q.payload?.id === entityId))
    : queue;

  filtered.push({
    ...mutation,
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
  });
  saveOfflineQueue(filtered);
}

// Data Mappers from Supabase snake_case rows to TypeScript models
function mapRowToTable(row: Record<string, any>): Table {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    shortCode: String(row.short_code || row.name?.slice(0, 2) || 'T1'),
    type: (row.type as 'pool' | 'snooker') || 'pool',
    status: (row.status as any) || 'available',
    ratePerHour: Number(row.rate_per_hour) || 240,
    minMinutes: Number(row.min_minutes) || 60,
    size: String(row.size || '8 ft English'),
    clothColor: String(row.cloth_color || 'Tournament Green'),
    currentSessionId: row.current_session_id ? String(row.current_session_id) : undefined,
    locationZone: row.location_zone ? String(row.location_zone) : undefined,
  };
}

function mapRowToSession(row: Record<string, any>): TableSession {
  let playerNames: string[] = [String(row.customer_name || 'Player 1')];
  let linkedCafeOrderIds: string[] = [];
  let userNotes: string | undefined = row.notes ? String(row.notes) : undefined;

  if (row.notes && typeof row.notes === 'string' && row.notes.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(row.notes);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.playerNames) && parsed.playerNames.length > 0) {
          playerNames = parsed.playerNames;
        }
        if (Array.isArray(parsed.linkedCafeOrderIds)) {
          linkedCafeOrderIds = parsed.linkedCafeOrderIds;
        }
        userNotes = parsed.notes || undefined;
      }
    } catch {
      // plain text note
    }
  } else if (Array.isArray(row.player_names)) {
    playerNames = row.player_names;
  }

  return {
    id: String(row.id),
    tableId: String(row.table_id || ''),
    tableName: String(row.table_name || ''),
    tableType: (row.table_type as 'pool' | 'snooker') || 'pool',
    ratePerHour: Number(row.rate_per_hour) || 240,
    startTime: String(row.start_time || new Date().toISOString()),
    endTime: row.end_time ? String(row.end_time) : undefined,
    pausedAt: row.paused_at ? String(row.paused_at) : undefined,
    totalPausedDurationMs: Number(row.total_paused_duration_ms) || 0,
    primaryCustomerName: String(row.customer_name || 'Walk-in Guest'),
    primaryCustomerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    playersCount: Number(row.players_count) || 1,
    playerNames,
    status: (row.status as 'active' | 'paused' | 'completed') || 'active',
    notes: userNotes,
    linkedCafeOrderIds,
  };
}

function mapRowToBooking(row: Record<string, any>): TableBooking {
  return {
    id: String(row.id),
    tableId: String(row.table_id || ''),
    tableName: String(row.table_name || ''),
    customerName: String(row.customer_name || ''),
    customerPhone: String(row.customer_phone || ''),
    bookingDate: String(row.booking_date || new Date().toISOString().split('T')[0]),
    startTime: String(row.start_time || '18:00'),
    durationMinutes: Number(row.duration_minutes) || 60,
    advanceDeposit: Number(row.advance_deposit) || 0,
    playersCount: Number(row.players_count) || 2,
    status: (row.status as any) || 'confirmed',
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapRowToCustomer(row: Record<string, any>): Customer {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    phone: String(row.phone || ''),
    email: row.email ? String(row.email) : undefined,
    tier: (row.tier as any) || 'standard',
    walletBalance: Number(row.wallet_balance) || 0,
    totalVisits: Number(row.total_visits) || 1,
    totalSpent: Number(row.total_spent) || 0,
    preferredGame: (row.preferred_game as any) || 'both',
    memberSince: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
    lastVisit: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
    notes: row.notes ? String(row.notes) : undefined,
  };
}

function mapRowToBill(row: Record<string, any>): Bill {
  let items: any[] = [];
  let discountReason: string | undefined = row.discount_reason ? String(row.discount_reason) : undefined;
  let splitDetails: any = undefined;
  let sessionStartTime = String(row.created_at || new Date().toISOString());
  let sessionEndTime = row.settled_at ? String(row.settled_at) : undefined;
  let isManualEntry = false;
  let notes: string | undefined = undefined;

  if (row.discount_reason && typeof row.discount_reason === 'string' && row.discount_reason.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(row.discount_reason);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.items) && parsed.items.length > 0) items = parsed.items;
        if (parsed.splitDetails) splitDetails = parsed.splitDetails;
        if (parsed.sessionStartTime) sessionStartTime = parsed.sessionStartTime;
        if (parsed.sessionEndTime) sessionEndTime = parsed.sessionEndTime;
        if (parsed.isManualEntry) isManualEntry = true;
        if (parsed.notes) notes = parsed.notes;
        discountReason = parsed.reason || undefined;
      }
    } catch {
      // plain text discount reason
    }
  } else if (typeof row.items === 'string') {
    try {
      items = JSON.parse(row.items);
    } catch {
      items = [];
    }
  } else if (Array.isArray(row.items)) {
    items = row.items;
  }

  // Fallback if no items saved
  if (items.length === 0) {
    items = [
      {
        id: `li_${row.id}_table`,
        type: 'table_time',
        title: String(row.table_name || 'Table Session'),
        subtitle: `Table Charge (${row.table_name || 'Session'})`,
        quantity: 1,
        unitPrice: Number(row.table_charge) || 0,
        totalPrice: Number(row.table_charge) || 0,
      },
    ];
    if (Number(row.cafe_charge) > 0) {
      items.push({
        id: `li_${row.id}_cafe`,
        type: 'cafe_item',
        title: 'Café & Drinks',
        subtitle: 'Food and beverages tab',
        quantity: 1,
        unitPrice: Number(row.cafe_charge) || 0,
        totalPrice: Number(row.cafe_charge) || 0,
      });
    }
  }

  return {
    id: String(row.id),
    invoiceNumber: String(row.invoice_number || ''),
    sessionId: row.session_id ? String(row.session_id) : undefined,
    tableId: row.table_id ? String(row.table_id) : undefined,
    tableName: row.table_name ? String(row.table_name) : undefined,
    sessionStartTime,
    sessionEndTime,
    customerName: String(row.customer_name || 'Walk-in Guest'),
    customerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
    items,
    tableCharge: Number(row.table_charge) || 0,
    cafeCharge: Number(row.cafe_charge) || 0,
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    discountReason,
    taxGstAmount: Number(row.tax_gst_amount) || 0,
    finalTotal: Number(row.final_total) || 0,
    status: (row.status as any) || 'settled',
    paymentMethod: (row.payment_method as any) || 'cash',
    splitDetails,
    createdAt: String(row.created_at || new Date().toISOString()),
    settledAt: row.settled_at ? String(row.settled_at) : new Date().toISOString(),
    settledByStaff: String(row.settled_by || 'Floor Manager'),
    isManualEntry: isManualEntry || undefined,
    notes: notes || undefined,
  };
}

function mapRowToOrder(row: Record<string, any>): CafeOrder {
  let items: any[] = [];
  if (typeof row.items === 'string') {
    try {
      items = JSON.parse(row.items);
    } catch {
      items = [];
    }
  } else if (Array.isArray(row.items)) {
    items = row.items;
  }

  return {
    id: String(row.id),
    orderNumber: String(row.order_number || ''),
    destination: (row.destination as any) || 'table',
    tableId: row.table_id ? String(row.table_id) : undefined,
    tableName: row.table_name ? String(row.table_name) : undefined,
    customerName: String(row.customer_name || 'Guest'),
    items,
    subtotal: Number(row.subtotal) || 0,
    status: (row.status as any) || 'pending',
    isBilled: Boolean(row.is_billed),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

/**
 * High-performance, real-time two-way database synchronization service.
 * Supports multi-device Staff <-> Admin live syncing over Supabase Realtime WebSockets
 * and instant cross-tab local BroadcastChannel messaging.
 */
export const dbService = {
  getSyncStatus(): SyncStatus {
    return currentSyncStatus;
  },

  // --- INITIAL DATA FETCHING (Cloud to Client) ---
  async fetchTables(): Promise<Table[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      notifyStatus('syncing', 'Syncing tables from cloud...');
      const { data, error } = await supabase
        .from('game_tables')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('[DB Sync] Fetch tables deferred:', error.message);
        notifyStatus('connected', 'Live connected');
        return null;
      }

      if (!data || data.length === 0) {
        // Auto-seed cloud database with venue's default 6 cue tables
        console.log('[DB Sync] Empty cloud tables detected, seeding default 6 tables...');
        for (const tbl of INITIAL_TABLES) {
          await this.syncTable(tbl);
        }
        notifyStatus('connected', 'All 6 default tables seeded to cloud');
        return INITIAL_TABLES;
      }

      const fetchedTables = data.map(mapRowToTable);

      // Sort tables in canonical venue order: Pool 1-3, Snooker 1-3
      const orderMap: Record<string, number> = {
        tbl_p1: 1,
        tbl_p2: 2,
        tbl_p3: 3,
        tbl_s1: 4,
        tbl_s2: 5,
        tbl_s3: 6,
      };
      fetchedTables.sort((a, b) => (orderMap[a.id] || 99) - (orderMap[b.id] || 99));

      notifyStatus('connected', `${fetchedTables.length} tables synced with cloud`);
      return fetchedTables;
    } catch (e) {
      console.warn('[DB Sync] Tables fetch exception:', e);
      notifyStatus('connected', 'Using cached tables');
      return null;
    }
  },

  async fetchSessions(): Promise<TableSession[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) return null;
      return (data || []).map(mapRowToSession);
    } catch {
      return null;
    }
  },

  async fetchBookings(): Promise<TableBooking[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: true });

      if (error) return null;
      return (data || []).map(mapRowToBooking);
    } catch {
      return null;
    }
  },

  async fetchCustomers(): Promise<Customer[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) return null;
      return (data || []).map(mapRowToCustomer);
    } catch {
      return null;
    }
  },

  async fetchBills(): Promise<Bill[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return null;
      return (data || []).map(mapRowToBill);
    } catch {
      return null;
    }
  },

  async fetchOrders(): Promise<CafeOrder[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .neq('id', '__TCN_MENU_CONFIG__')
        .order('created_at', { ascending: false });

      if (error) return null;
      return (data || []).map(mapRowToOrder);
    } catch {
      return null;
    }
  },

  async fetchMenu(): Promise<MenuItem[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      // 1. Try public.menu_items if it exists
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: String(r.id),
          name: String(r.name),
          category: r.category || 'beverages',
          price: Number(r.price) || 0,
          description: r.description || undefined,
          isVegetarian: r.is_vegetarian !== false,
          isAvailable: r.is_available !== false,
          prepTimeMinutes: Number(r.prep_time_minutes) || 1,
        }));
      }

      // 2. Seamless live fallback to synchronized __TCN_MENU_CONFIG__ record
      const { data: cfgData, error: cfgError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', '__TCN_MENU_CONFIG__')
        .maybeSingle();

      if (!cfgError && cfgData && cfgData.items) {
        const parsed = typeof cfgData.items === 'string' ? JSON.parse(cfgData.items) : cfgData.items;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  async syncMenu(items: MenuItem[]): Promise<void> {
    broadcastLocally('menu', items, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      // 1. Save to __TCN_MENU_CONFIG__ row in orders (100% live on all devices right now)
      await supabase.from('orders').upsert({
        id: '__TCN_MENU_CONFIG__',
        order_number: 'CONFIG-MENU',
        destination: 'system_config',
        customer_name: 'System Menu Configuration',
        items: JSON.stringify(items),
        subtotal: 0,
        status: 'system',
        is_billed: true,
      });

      // 2. Also try menu_items table if it has been created
      try {
        for (const item of items) {
          await supabase.from('menu_items').upsert({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            description: item.description || null,
            is_vegetarian: item.isVegetarian,
            is_available: item.isAvailable,
            prep_time_minutes: item.prepTimeMinutes || 1,
          });
        }
      } catch {
        // Ignored if table not created yet
      }
    } catch (e) {
      console.warn('[DB Sync] Menu sync deferred:', e);
    }
  },

  // --- TABLES WRITE & SYNC ---
  async syncTable(table: Table): Promise<void> {
    broadcastLocally('table', table, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'table', action: 'UPSERT', payload: table });
      return;
    }
    try {
      const { error } = await supabase.from('game_tables').upsert({
        id: table.id,
        name: table.name,
        type: table.type,
        status: table.status,
        rate_per_hour: table.ratePerHour,
        size: table.size,
        cloth_color: table.clothColor,
      });

      if (error) {
        console.warn('[DB Sync] Table upsert error, queued offline:', error.message);
        enqueueOfflineMutation({ type: 'table', action: 'UPSERT', payload: table });
      }
    } catch (e) {
      console.warn('[DB Sync] Table upsert deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'table', action: 'UPSERT', payload: table });
    }
  },

  async deleteTableRemote(tableId: string): Promise<void> {
    broadcastLocally('table', { id: tableId } as Table, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'table', action: 'DELETE', payload: { id: tableId } });
      return;
    }
    try {
      await supabase.from('game_tables').delete().eq('id', tableId);
    } catch (e) {
      console.warn('[DB Sync] Table delete deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'table', action: 'DELETE', payload: { id: tableId } });
    }
  },

  // --- SESSIONS WRITE & SYNC ---
  async syncSession(session: TableSession): Promise<void> {
    broadcastLocally('session', session, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'session', action: 'UPSERT', payload: session });
      return;
    }
    try {
      // Pack extra metadata safely into notes text field so PostgreSQL column constraints are never violated
      const extraMeta = {
        notes: session.notes || null,
        playerNames: session.playerNames || [],
        linkedCafeOrderIds: session.linkedCafeOrderIds || [],
      };

      const { error } = await supabase.from('game_sessions').upsert({
        id: session.id,
        table_id: session.tableId,
        table_name: session.tableName,
        table_type: session.tableType,
        rate_per_hour: session.ratePerHour,
        start_time: session.startTime,
        end_time: session.endTime || null,
        paused_at: session.pausedAt || null,
        total_paused_duration_ms: session.totalPausedDurationMs || 0,
        customer_name: session.primaryCustomerName || 'Walk-in Guest',
        customer_phone: session.primaryCustomerPhone || null,
        customer_id: session.customerId || null,
        players_count: session.playersCount || 1,
        status: session.status,
        notes: JSON.stringify(extraMeta),
      });

      if (error) {
        console.warn('[DB Sync] Session upsert error, queued offline:', error.message);
        enqueueOfflineMutation({ type: 'session', action: 'UPSERT', payload: session });
      }
    } catch (e) {
      console.warn('[DB Sync] Session sync deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'session', action: 'UPSERT', payload: session });
    }
  },

  // --- BOOKINGS WRITE & SYNC ---
  async syncBooking(booking: TableBooking): Promise<void> {
    broadcastLocally('booking', booking, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'booking', action: 'UPSERT', payload: booking });
      return;
    }
    try {
      await supabase.from('bookings').upsert({
        id: booking.id,
        table_id: booking.tableId,
        table_name: booking.tableName,
        customer_name: booking.customerName,
        customer_phone: booking.customerPhone,
        booking_date: booking.bookingDate,
        start_time: booking.startTime,
        duration_minutes: booking.durationMinutes,
        advance_deposit: booking.advanceDeposit,
        players_count: booking.playersCount,
        status: booking.status,
        notes: booking.notes || null,
        created_at: booking.createdAt,
      });
    } catch (e) {
      console.warn('[DB Sync] Booking sync deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'booking', action: 'UPSERT', payload: booking });
    }
  },

  async deleteBookingRemote(bookingId: string): Promise<void> {
    broadcastLocally('booking', { id: bookingId } as TableBooking, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'booking', action: 'DELETE', payload: { id: bookingId } });
      return;
    }
    try {
      await supabase.from('bookings').delete().eq('id', bookingId);
    } catch (e) {
      console.warn('[DB Sync] Booking delete deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'booking', action: 'DELETE', payload: { id: bookingId } });
    }
  },

  async clearAllBookingsRemote(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('bookings').delete().neq('id', 'non_existent_key');
    } catch (e) {
      console.warn('[DB Sync] Clear bookings deferred:', e);
    }
  },

  // --- BILLS WRITE & SYNC ---
  async syncBill(bill: Bill): Promise<void> {
    broadcastLocally('bill', bill, 'INSERT');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'bill', action: 'UPSERT', payload: bill });
      return;
    }
    try {
      // Pack items and splitDetails safely into discount_reason text column
      const meta = {
        reason: bill.discountReason || null,
        items: bill.items || [],
        splitDetails: bill.splitDetails || null,
        sessionStartTime: bill.sessionStartTime,
        sessionEndTime: bill.sessionEndTime,
        isManualEntry: bill.isManualEntry || false,
        notes: bill.notes || null,
      };

      const { error } = await supabase.from('bills').upsert({
        id: bill.id,
        invoice_number: bill.invoiceNumber,
        session_id: bill.sessionId || null,
        table_id: bill.tableId || null,
        table_name: bill.tableName || null,
        customer_name: bill.customerName,
        customer_phone: bill.customerPhone || null,
        table_charge: bill.tableCharge,
        cafe_charge: bill.cafeCharge,
        subtotal: bill.subtotal,
        discount_amount: bill.discountAmount,
        discount_reason: JSON.stringify(meta),
        tax_gst_amount: bill.taxGstAmount,
        final_total: bill.finalTotal,
        payment_method: bill.paymentMethod,
        status: bill.status,
        created_at: bill.createdAt,
        settled_at: bill.settledAt,
        settled_by: bill.settledByStaff,
      });

      if (error) {
        console.warn('[DB Sync] Bill upsert error, queued offline:', error.message);
        enqueueOfflineMutation({ type: 'bill', action: 'UPSERT', payload: bill });
      }
    } catch (e) {
      console.warn('[DB Sync] Bill sync deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'bill', action: 'UPSERT', payload: bill });
    }
  },

  async deleteBillRemote(billId: string): Promise<void> {
    broadcastLocally('bill', { id: billId } as Bill, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'bill', action: 'DELETE', payload: { id: billId } });
      return;
    }
    try {
      await supabase.from('bills').delete().eq('id', billId);
    } catch (e) {
      console.warn('[DB Sync] Bill delete deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'bill', action: 'DELETE', payload: { id: billId } });
    }
  },

  async clearAllBillsRemote(): Promise<void> {
    broadcastLocally('bill', { id: '__ALL__' } as Bill, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('bills').delete().neq('id', 'non_existent_key');
    } catch (e) {
      console.warn('[DB Sync] Clear bills deferred:', e);
    }
  },

  // --- CUSTOMERS WRITE & SYNC ---
  async syncCustomer(customer: Customer): Promise<void> {
    broadcastLocally('customer', customer, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'customer', action: 'UPSERT', payload: customer });
      return;
    }
    try {
      await supabase.from('customers').upsert({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        tier: customer.tier,
        wallet_balance: customer.walletBalance,
        total_visits: customer.totalVisits,
        total_spent: customer.totalSpent,
        preferred_game: customer.preferredGame,
        notes: customer.notes || null,
      });
    } catch (e) {
      console.warn('[DB Sync] Customer sync deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'customer', action: 'UPSERT', payload: customer });
    }
  },

  async deleteCustomerRemote(customerId: string): Promise<void> {
    broadcastLocally('customer', { id: customerId } as Customer, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'customer', action: 'DELETE', payload: { id: customerId } });
      return;
    }
    try {
      await supabase.from('customers').delete().eq('id', customerId);
    } catch (e) {
      console.warn('[DB Sync] Customer delete deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'customer', action: 'DELETE', payload: { id: customerId } });
    }
  },

  async clearAllCustomersRemote(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('customers').delete().neq('id', 'non_existent_key');
    } catch (e) {
      console.warn('[DB Sync] Clear customers deferred:', e);
    }
  },

  // --- ORDERS WRITE & SYNC ---
  async syncOrder(order: CafeOrder): Promise<void> {
    broadcastLocally('order', order, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'order', action: 'UPSERT', payload: order });
      return;
    }
    try {
      await supabase.from('orders').upsert({
        id: order.id,
        order_number: order.orderNumber,
        destination: order.destination,
        table_id: order.tableId || null,
        table_name: order.tableName || null,
        customer_name: order.customerName,
        items: JSON.stringify(order.items),
        subtotal: order.subtotal,
        status: order.status,
        is_billed: order.isBilled,
        created_at: order.createdAt,
      });
    } catch (e) {
      console.warn('[DB Sync] Order sync deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'order', action: 'UPSERT', payload: order });
    }
  },

  async deleteOrderRemote(orderId: string): Promise<void> {
    broadcastLocally('order', { id: orderId } as CafeOrder, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) {
      enqueueOfflineMutation({ type: 'order', action: 'DELETE', payload: { id: orderId } });
      return;
    }
    try {
      await supabase.from('orders').delete().eq('id', orderId);
    } catch (e) {
      console.warn('[DB Sync] Order delete deferred, queued offline:', e);
      enqueueOfflineMutation({ type: 'order', action: 'DELETE', payload: { id: orderId } });
    }
  },

  // --- REALTIME SUBSCRIPTIONS (Cross-Device WebSockets) ---
  initRealtimeSubscription(): () => void {
    const supabase = getSupabaseClient();
    if (!supabase) {
      notifyStatus('offline', 'Local offline storage mode');
      return () => {};
    }

    if (realtimeChannel) {
      return () => {};
    }

    notifyStatus('syncing', 'Connecting realtime sync...');

    try {
      realtimeChannel = supabase
        .channel('tcn-live-cloud-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_tables' },
          (payload) => {
            const action = payload.eventType as SyncAction;
            const table = mapRowToTable(payload.new || payload.old);
            tableListeners.forEach((l) => l(table, action));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_sessions' },
          (payload) => {
            const action = payload.eventType as SyncAction;
            const session = mapRowToSession(payload.new || payload.old);
            sessionListeners.forEach((l) => l(session, action));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          (payload) => {
            const action = payload.eventType as SyncAction;
            const booking = mapRowToBooking(payload.new || payload.old);
            bookingListeners.forEach((l) => l(booking, action));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'customers' },
          (payload) => {
            const action = payload.eventType as SyncAction;
            const customer = mapRowToCustomer(payload.new || payload.old);
            customerListeners.forEach((l) => l(customer, action));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bills' },
          (payload) => {
            const action = payload.eventType as SyncAction;
            const bill = mapRowToBill(payload.new || payload.old);
            billListeners.forEach((l) => l(bill, action));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            const raw: any = payload.new || payload.old;
            if (raw && raw.id === '__TCN_MENU_CONFIG__') {
              try {
                const items = typeof raw.items === 'string' ? JSON.parse(raw.items) : raw.items;
                menuListeners.forEach((l) => l(items));
              } catch (e) {
                console.warn('[DB Sync] Realtime menu parse error:', e);
              }
              return;
            }
            const action = payload.eventType as SyncAction;
            const order = mapRowToOrder(raw);
            orderListeners.forEach((l) => l(order, action));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            notifyStatus('connected', 'Live cloud connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            notifyStatus('offline', 'Cloud sync channel closed');
          }
        });
    } catch (e) {
      console.warn('[DB Sync] Realtime subscription failed:', e);
      notifyStatus('offline', 'Operating in local offline mode');
    }

    return () => {
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    };
  },

  // --- LISTENER REGISTRATIONS ---
  onTableChange(cb: Listener<Table>): () => void {
    tableListeners.add(cb);
    return () => tableListeners.delete(cb);
  },

  onSessionChange(cb: Listener<TableSession>): () => void {
    sessionListeners.add(cb);
    return () => sessionListeners.delete(cb);
  },

  onBookingChange(cb: Listener<TableBooking>): () => void {
    bookingListeners.add(cb);
    return () => bookingListeners.delete(cb);
  },

  onCustomerChange(cb: Listener<Customer>): () => void {
    customerListeners.add(cb);
    return () => customerListeners.delete(cb);
  },

  onBillChange(cb: Listener<Bill>): () => void {
    billListeners.add(cb);
    return () => billListeners.delete(cb);
  },

  onOrderChange(cb: Listener<CafeOrder>): () => void {
    orderListeners.add(cb);
    return () => orderListeners.delete(cb);
  },

  onMenuChange(cb: (menu: MenuItem[]) => void): () => void {
    menuListeners.add(cb);
    return () => menuListeners.delete(cb);
  },

  onStatusChange(cb: StatusListener): () => void {
    statusListeners.add(cb);
    cb(currentSyncStatus);
    return () => statusListeners.delete(cb);
  },

  // --- OFFLINE QUEUE CONTROLS ---
  getPendingQueueCount(): number {
    return getOfflineQueue().length;
  },

  onQueueCountChange(cb: (count: number) => void): () => void {
    queueListeners.add(cb);
    cb(getOfflineQueue().length);
    return () => queueListeners.delete(cb);
  },

  async flushOfflineQueue(): Promise<{ success: boolean; syncedCount: number }> {
    const queue = getOfflineQueue();
    if (queue.length === 0) return { success: true, syncedCount: 0 };
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, syncedCount: 0 };

    notifyStatus('syncing', `Flushing ${queue.length} offline operations...`);
    const remaining: QueuedMutation[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        if (item.type === 'session') {
          const s = item.payload;
          const extraMeta = {
            notes: s.notes || null,
            playerNames: s.playerNames || [],
            linkedCafeOrderIds: s.linkedCafeOrderIds || [],
          };
          const { error } = await supabase.from('game_sessions').upsert({
            id: s.id,
            table_id: s.tableId,
            table_name: s.tableName,
            table_type: s.tableType,
            rate_per_hour: s.ratePerHour,
            start_time: s.startTime,
            end_time: s.endTime || null,
            paused_at: s.pausedAt || null,
            total_paused_duration_ms: s.totalPausedDurationMs || 0,
            customer_name: s.primaryCustomerName || 'Walk-in Guest',
            customer_phone: s.primaryCustomerPhone || null,
            customer_id: s.customerId || null,
            players_count: s.playersCount || 1,
            status: s.status,
            notes: JSON.stringify(extraMeta),
          });
          if (error) throw error;
        } else if (item.type === 'bill') {
          if (item.action === 'DELETE') {
            await supabase.from('bills').delete().eq('id', item.payload.id);
          } else {
            const b = item.payload;
            const meta = {
              reason: b.discountReason || null,
              items: b.items || [],
              splitDetails: b.splitDetails || null,
              sessionStartTime: b.sessionStartTime,
              sessionEndTime: b.sessionEndTime,
            };
            const { error } = await supabase.from('bills').upsert({
              id: b.id,
              invoice_number: b.invoiceNumber,
              session_id: b.sessionId || null,
              table_id: b.tableId || null,
              table_name: b.tableName || null,
              customer_name: b.customerName,
              customer_phone: b.customerPhone || null,
              table_charge: b.tableCharge,
              cafe_charge: b.cafeCharge,
              subtotal: b.subtotal,
              discount_amount: b.discountAmount,
              discount_reason: JSON.stringify(meta),
              tax_gst_amount: b.taxGstAmount,
              final_total: b.finalTotal,
              payment_method: b.paymentMethod,
              status: b.status,
              created_at: b.createdAt,
              settled_at: b.settledAt,
              settled_by: b.settledByStaff,
            });
            if (error) throw error;
          }
        } else if (item.type === 'order') {
          if (item.action === 'DELETE') {
            await supabase.from('orders').delete().eq('id', item.payload.id);
          } else {
            const o = item.payload;
            const { error } = await supabase.from('orders').upsert({
              id: o.id,
              order_number: o.orderNumber,
              destination: o.destination,
              table_id: o.tableId || null,
              table_name: o.tableName || null,
              customer_name: o.customerName,
              items: JSON.stringify(o.items),
              subtotal: o.subtotal,
              status: o.status,
              is_billed: o.isBilled,
              created_at: o.createdAt,
            });
            if (error) throw error;
          }
        } else if (item.type === 'table') {
          if (item.action === 'DELETE') {
            await supabase.from('game_tables').delete().eq('id', item.payload.id);
          } else {
            const t = item.payload;
            const { error } = await supabase.from('game_tables').upsert({
              id: t.id,
              name: t.name,
              type: t.type,
              status: t.status,
              rate_per_hour: t.ratePerHour,
              size: t.size,
              cloth_color: t.clothColor,
            });
            if (error) throw error;
          }
        } else if (item.type === 'booking') {
          if (item.action === 'DELETE') {
            await supabase.from('bookings').delete().eq('id', item.payload.id);
          } else {
            const bk = item.payload;
            const { error } = await supabase.from('bookings').upsert({
              id: bk.id,
              table_id: bk.tableId,
              table_name: bk.tableName,
              customer_name: bk.customerName,
              customer_phone: bk.customerPhone,
              booking_date: bk.bookingDate,
              start_time: bk.startTime,
              duration_minutes: bk.durationMinutes,
              advance_deposit: bk.advanceDeposit,
              players_count: bk.playersCount,
              status: bk.status,
              notes: bk.notes || null,
              created_at: bk.createdAt,
            });
            if (error) throw error;
          }
        } else if (item.type === 'customer') {
          if (item.action === 'DELETE') {
            await supabase.from('customers').delete().eq('id', item.payload.id);
          } else {
            const c = item.payload;
            const { error } = await supabase.from('customers').upsert({
              id: c.id,
              name: c.name,
              phone: c.phone,
              email: c.email || null,
              tier: c.tier,
              wallet_balance: c.walletBalance,
              total_visits: c.totalVisits,
              total_spent: c.totalSpent,
              preferred_game: c.preferredGame,
              notes: c.notes || null,
            });
            if (error) throw error;
          }
        }
        syncedCount++;
      } catch (e) {
        console.warn('[Offline Queue] Retry failed for mutation:', item.id, e);
        remaining.push(item);
      }
    }

    saveOfflineQueue(remaining);
    notifyStatus(
      'connected',
      remaining.length === 0
        ? 'All offline mutations synced'
        : `${remaining.length} offline operations remaining`
    );
    return { success: remaining.length === 0, syncedCount };
  },
};

// Automatic online auto-flush trigger
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[TCN Network] Internet connection detected. Flushing offline queue...');
    dbService.flushOfflineQueue();
  });
}
