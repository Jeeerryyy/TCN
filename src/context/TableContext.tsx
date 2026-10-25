/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Table, TableSession, TableStatus, TableBooking } from '../types/table.types';
import { INITIAL_TABLES, INITIAL_SESSIONS, INITIAL_BOOKINGS } from '../data/initialTables';
import { loadFromStorage, saveToStorage, clearBookingsStorage } from '../utils/storage';
import { dbService } from '../services/db';

interface StartSessionParams {
  tableId: string;
  primaryCustomerName: string;
  primaryCustomerPhone?: string;
  customerId?: string;
  playersCount: number;
  playerNames: string[];
  notes?: string;
}

interface TableContextType {
  tables: Table[];
  sessions: TableSession[];
  activeSessionsMap: Record<string, TableSession>; // tableId -> TableSession
  bookings: TableBooking[];
  startSession: (params: StartSessionParams) => void;
  pauseSession: (tableId: string) => void;
  resumeSession: (tableId: string) => void;
  transferSession: (fromTableId: string, toTableId: string, reason?: string) => boolean;
  endSession: (tableId: string) => TableSession | null;
  linkCafeOrderToTable: (tableId: string, orderId: string) => void;
  setTableStatus: (tableId: string, status: TableStatus) => void;
  // Admin Table Studio Capabilities
  addTable: (tableData: Omit<Table, 'id' | 'status'>) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  deleteTable: (tableId: string) => { success: boolean; message?: string };
  // Booking & Reservation Ledger
  addBooking: (bookingData: Omit<TableBooking, 'id' | 'status' | 'createdAt'>) => void;
  cancelBooking: (bookingId: string) => void;
  checkInBooking: (bookingId: string) => boolean;
  clearAllBookings: () => void;
  tickCounter: number; // Incrementing counter every second to drive live timers
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<Table[]>(() =>
    loadFromStorage('tables', INITIAL_TABLES)
  );

  const [sessions, setSessions] = useState<TableSession[]>(() =>
    loadFromStorage('sessions', INITIAL_SESSIONS)
  );

  const [bookings, setBookings] = useState<TableBooking[]>(() =>
    loadFromStorage('bookings', INITIAL_BOOKINGS)
  );

  // Heartbeat ticker for synchronized timer updates
  const [tickCounter, setTickCounter] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickCounter((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync to local storage
  useEffect(() => {
    saveToStorage('tables', tables);
  }, [tables]);

  useEffect(() => {
    saveToStorage('sessions', sessions);
  }, [sessions]);

  useEffect(() => {
    saveToStorage('bookings', bookings);
  }, [bookings]);

  // Fast hashmap of active table sessions
  const activeSessionsMap = sessions.reduce<Record<string, TableSession>>((acc, sess) => {
    if (sess.status !== 'completed') {
      acc[sess.tableId] = sess;
    }
    return acc;
  }, {});

  const startSession = (params: StartSessionParams) => {
    const targetTable = tables.find((t) => t.id === params.tableId);
    if (!targetTable) return;

    const newSessionId = `sess_${Date.now()}`;
    const newSession: TableSession = {
      id: newSessionId,
      tableId: targetTable.id,
      tableName: targetTable.name,
      tableType: targetTable.type,
      ratePerHour: targetTable.ratePerHour,
      startTime: new Date().toISOString(),
      totalPausedDurationMs: 0,
      primaryCustomerName: params.primaryCustomerName || 'Walk-in Guest',
      primaryCustomerPhone: params.primaryCustomerPhone,
      customerId: params.customerId,
      playersCount: params.playersCount || 2,
      playerNames: params.playerNames.length > 0 ? params.playerNames : [params.primaryCustomerName || 'Player 1'],
      status: 'active',
      notes: params.notes,
      linkedCafeOrderIds: [],
    };

    setSessions((prev) => [newSession, ...prev]);
    setTables((prev) =>
      prev.map((t) =>
        t.id === targetTable.id
          ? { ...t, status: 'occupied', currentSessionId: newSessionId }
          : t
      )
    );

    // Background cloud sync
    dbService.syncSession(newSession);
    dbService.syncTable({ ...targetTable, status: 'occupied', currentSessionId: newSessionId });
  };

  const pauseSession = (tableId: string) => {
    const active = activeSessionsMap[tableId];
    if (!active || active.status !== 'active') return;

    const pausedAt = new Date().toISOString();
    const updatedSession: TableSession = { ...active, status: 'paused', pausedAt };
    setSessions((prev) =>
      prev.map((s) => (s.id === active.id ? updatedSession : s))
    );
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: 'paused' } : t))
    );
    dbService.syncSession(updatedSession);
  };

  const resumeSession = (tableId: string) => {
    const active = activeSessionsMap[tableId];
    if (!active || active.status !== 'paused' || !active.pausedAt) return;

    const pauseEnd = Date.now();
    const pauseStart = new Date(active.pausedAt).getTime();
    const additionalPausedMs = Math.max(0, pauseEnd - pauseStart);

    const updatedSession: TableSession = {
      ...active,
      status: 'active',
      pausedAt: undefined,
      totalPausedDurationMs: (active.totalPausedDurationMs || 0) + additionalPausedMs,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === active.id ? updatedSession : s))
    );
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: 'occupied' } : t))
    );
    dbService.syncSession(updatedSession);
  };

  const transferSession = (fromTableId: string, toTableId: string, reason?: string): boolean => {
    const sourceTable = tables.find((t) => t.id === fromTableId);
    const destTable = tables.find((t) => t.id === toTableId);
    const active = activeSessionsMap[fromTableId];

    if (!sourceTable || !destTable || !active || destTable.status !== 'available') {
      return false;
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              tableId: destTable.id,
              tableName: destTable.name,
              tableType: destTable.type,
              ratePerHour: destTable.ratePerHour,
              notes: s.notes
                ? `${s.notes} | Transferred from ${sourceTable.name}: ${reason || 'Customer request'}`
                : `Transferred from ${sourceTable.name}: ${reason || 'Customer request'}`,
            }
          : s
      )
    );

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === fromTableId) {
          return { ...t, status: 'available', currentSessionId: undefined };
        }
        if (t.id === toTableId) {
          return { ...t, status: active.status === 'paused' ? 'paused' : 'occupied', currentSessionId: active.id };
        }
        return t;
      })
    );

    return true;
  };

  const endSession = (tableId: string): TableSession | null => {
    const active = activeSessionsMap[tableId];
    if (!active) return null;

    const endTime = new Date().toISOString();
    const finalSession: TableSession = {
      ...active,
      endTime,
      status: 'completed',
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === active.id ? finalSession : s))
    );

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, status: 'available', currentSessionId: undefined }
          : t
      )
    );

    dbService.syncSession(finalSession);
    const tbl = tables.find((t) => t.id === tableId);
    if (tbl) {
      dbService.syncTable({ ...tbl, status: 'available', currentSessionId: undefined });
    }

    return finalSession;
  };

  const linkCafeOrderToTable = (tableId: string, orderId: string) => {
    const active = activeSessionsMap[tableId];
    if (!active) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              linkedCafeOrderIds: [...s.linkedCafeOrderIds, orderId],
            }
          : s
      )
    );
  };

  const setTableStatus = (tableId: string, status: TableStatus) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          const updated = { ...t, status };
          dbService.syncTable(updated);
          return updated;
        }
        return t;
      })
    );
  };

  // --- ADMIN TABLE STUDIO FUNCTIONS ---
  const addTable = (tableData: Omit<Table, 'id' | 'status'>) => {
    const newId = `tbl_${Date.now()}`;
    const newTable: Table = {
      ...tableData,
      id: newId,
      status: 'available',
    };
    setTables((prev) => [...prev, newTable]);
    dbService.syncTable(newTable);
  };

  const updateTable = (tableId: string, updates: Partial<Table>) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          const updated = { ...t, ...updates };
          dbService.syncTable(updated);
          return updated;
        }
        return t;
      })
    );
  };

  const deleteTable = (tableId: string): { success: boolean; message?: string } => {
    const targetTable = tables.find((t) => t.id === tableId);
    if (!targetTable) {
      return { success: false, message: 'Table not found.' };
    }
    if (targetTable.status === 'occupied' || targetTable.status === 'paused') {
      return {
        success: false,
        message: `Cannot delete ${targetTable.name} while a live session is in progress. Please settle and close the table first.`,
      };
    }
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    return { success: true };
  };

  // --- BOOKING & RESERVATION FUNCTIONS ---
  const addBooking = (bookingData: Omit<TableBooking, 'id' | 'status' | 'createdAt'>) => {
    const newBooking: TableBooking = {
      ...bookingData,
      id: `bkg_${Date.now()}`,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    setBookings((prev) => [newBooking, ...prev]);
    dbService.syncBooking(newBooking);
  };

  const cancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const updated = { ...b, status: 'cancelled' as const };
          dbService.syncBooking(updated);
          return updated;
        }
        return b;
      })
    );
  };

  const checkInBooking = (bookingId: string): boolean => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return false;

    const targetTable = tables.find((t) => t.id === booking.tableId);
    if (!targetTable || targetTable.status !== 'available') {
      return false;
    }

    // Start session on this table
    startSession({
      tableId: targetTable.id,
      primaryCustomerName: booking.customerName,
      primaryCustomerPhone: booking.customerPhone,
      playersCount: booking.playersCount,
      playerNames: [booking.customerName],
      notes: `Checked in from Reservation #${booking.id.slice(-4)} (Advance Paid: ₹${booking.advanceDeposit}). ${booking.notes || ''}`,
    });

    // Mark booking checked-in
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const updated = { ...b, status: 'checked-in' as const };
          dbService.syncBooking(updated);
          return updated;
        }
        return b;
      })
    );

    return true;
  };

  const clearAllBookings = () => {
    setBookings([]);
    clearBookingsStorage();
  };

  return (
    <TableContext.Provider
      value={{
        tables,
        sessions,
        activeSessionsMap,
        bookings,
        startSession,
        pauseSession,
        resumeSession,
        transferSession,
        endSession,
        linkCafeOrderToTable,
        setTableStatus,
        addTable,
        updateTable,
        deleteTable,
        addBooking,
        cancelBooking,
        checkInBooking,
        clearAllBookings,
        tickCounter,
      }}
    >
      {children}
    </TableContext.Provider>
  );
};

export const useTables = (): TableContextType => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTables must be used within a TableProvider');
  }
  return context;
};
