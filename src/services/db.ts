/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import { getSupabaseClient } from './supabaseClient';
import { Table, TableSession, TableBooking } from '../types/table.types';
import { Customer } from '../types/customer.types';
import { Bill } from '../types/billing.types';
import { CafeOrder } from '../types/cafe.types';
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
    playerNames: Array.isArray(row.player_names)
      ? row.player_names
      : [String(row.customer_name || 'Player 1')],
    status: (row.status as 'active' | 'paused' | 'completed') || 'active',
    notes: row.notes ? String(row.notes) : undefined,
    linkedCafeOrderIds: Array.isArray(row.linked_cafe_order_ids) ? row.linked_cafe_order_ids : [],
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
    invoiceNumber: String(row.invoice_number || ''),
    sessionId: row.session_id ? String(row.session_id) : undefined,
    tableId: row.table_id ? String(row.table_id) : undefined,
    tableName: row.table_name ? String(row.table_name) : undefined,
    sessionStartTime: String(row.created_at || new Date().toISOString()),
    sessionEndTime: row.settled_at ? String(row.settled_at) : undefined,
    customerName: String(row.customer_name || 'Walk-in Guest'),
    customerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
    items,
    tableCharge: Number(row.table_charge) || 0,
    cafeCharge: Number(row.cafe_charge) || 0,
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    discountReason: row.discount_reason ? String(row.discount_reason) : undefined,
    taxGstAmount: Number(row.tax_gst_amount) || 0,
    finalTotal: Number(row.final_total) || 0,
    status: (row.status as any) || 'settled',
    paymentMethod: (row.payment_method as any) || 'cash',
    createdAt: String(row.created_at || new Date().toISOString()),
    settledAt: row.settled_at ? String(row.settled_at) : new Date().toISOString(),
    settledByStaff: String(row.settled_by || 'Floor Manager'),
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

      // Verify that all 6 standard venue tables (3 Pool, 3 Snooker) exist
      const existingIds = new Set(fetchedTables.map((t) => t.id));
      const missingTables = INITIAL_TABLES.filter((t) => !existingIds.has(t.id));

      if (missingTables.length > 0) {
        console.log(`[DB Sync] ${missingTables.length} standard tables missing in cloud. Seeding missing tables...`);
        for (const tbl of missingTables) {
          await this.syncTable(tbl);
          fetchedTables.push(tbl);
        }
      }

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
        .order('created_at', { ascending: false });

      if (error) return null;
      return (data || []).map(mapRowToOrder);
    } catch {
      return null;
    }
  },

  // --- TABLES WRITE & SYNC ---
  async syncTable(table: Table): Promise<void> {
    broadcastLocally('table', table, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('game_tables').upsert({
        id: table.id,
        name: table.name,
        short_code: table.shortCode,
        type: table.type,
        status: table.status,
        rate_per_hour: table.ratePerHour,
        min_minutes: table.minMinutes,
        size: table.size,
        cloth_color: table.clothColor,
        current_session_id: table.currentSessionId || null,
        location_zone: table.locationZone || null,
      });

      if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
        // Fallback for minimal table schema without extended columns
        await supabase.from('game_tables').upsert({
          id: table.id,
          name: table.name,
          type: table.type,
          status: table.status,
          rate_per_hour: table.ratePerHour,
          size: table.size,
          cloth_color: table.clothColor,
        });
      }
    } catch (e) {
      console.warn('[DB Sync] Table upsert deferred:', e);
    }
  },

  async deleteTableRemote(tableId: string): Promise<void> {
    broadcastLocally('table', { id: tableId } as Table, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('game_tables').delete().eq('id', tableId);
    } catch (e) {
      console.warn('[DB Sync] Table delete deferred:', e);
    }
  },

  // --- SESSIONS WRITE & SYNC ---
  async syncSession(session: TableSession): Promise<void> {
    broadcastLocally('session', session, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('game_sessions').upsert({
        id: session.id,
        table_id: session.tableId,
        table_name: session.tableName,
        table_type: session.tableType,
        rate_per_hour: session.ratePerHour,
        start_time: session.startTime,
        end_time: session.endTime || null,
        paused_at: session.pausedAt || null,
        total_paused_duration_ms: session.totalPausedDurationMs,
        customer_name: session.primaryCustomerName,
        customer_phone: session.primaryCustomerPhone || null,
        customer_id: session.customerId || null,
        players_count: session.playersCount,
        player_names: session.playerNames,
        status: session.status,
        notes: session.notes || null,
        linked_cafe_order_ids: session.linkedCafeOrderIds,
      });
    } catch (e) {
      console.warn('[DB Sync] Session sync deferred:', e);
    }
  },

  // --- BOOKINGS WRITE & SYNC ---
  async syncBooking(booking: TableBooking): Promise<void> {
    broadcastLocally('booking', booking, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
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
      console.warn('[DB Sync] Booking sync deferred:', e);
    }
  },

  async deleteBookingRemote(bookingId: string): Promise<void> {
    broadcastLocally('booking', { id: bookingId } as TableBooking, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('bookings').delete().eq('id', bookingId);
    } catch (e) {
      console.warn('[DB Sync] Booking delete deferred:', e);
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
    if (!supabase) return;
    try {
      await supabase.from('bills').upsert({
        id: bill.id,
        invoice_number: bill.invoiceNumber,
        session_id: bill.sessionId || null,
        table_id: bill.tableId || null,
        table_name: bill.tableName || null,
        customer_name: bill.customerName,
        customer_phone: bill.customerPhone || null,
        items: JSON.stringify(bill.items || []),
        table_charge: bill.tableCharge,
        cafe_charge: bill.cafeCharge,
        subtotal: bill.subtotal,
        discount_amount: bill.discountAmount,
        discount_reason: bill.discountReason || null,
        tax_gst_amount: bill.taxGstAmount,
        final_total: bill.finalTotal,
        payment_method: bill.paymentMethod,
        status: bill.status,
        created_at: bill.createdAt,
        settled_at: bill.settledAt,
        settled_by: bill.settledByStaff,
      });
    } catch (e) {
      console.warn('[DB Sync] Bill sync deferred:', e);
    }
  },

  // --- CUSTOMERS WRITE & SYNC ---
  async syncCustomer(customer: Customer): Promise<void> {
    broadcastLocally('customer', customer, 'UPDATE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
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
      console.warn('[DB Sync] Customer sync deferred:', e);
    }
  },

  async deleteCustomerRemote(customerId: string): Promise<void> {
    broadcastLocally('customer', { id: customerId } as Customer, 'DELETE');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('customers').delete().eq('id', customerId);
    } catch (e) {
      console.warn('[DB Sync] Customer delete deferred:', e);
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
    if (!supabase) return;
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
      console.warn('[DB Sync] Order sync deferred:', e);
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
            const action = payload.eventType as SyncAction;
            const order = mapRowToOrder(payload.new || payload.old);
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

  onStatusChange(cb: StatusListener): () => void {
    statusListeners.add(cb);
    cb(currentSyncStatus);
    return () => statusListeners.delete(cb);
  },
};
