/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  isLoading: boolean;
  isSyncing: boolean;
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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Heartbeat ticker for synchronized timer updates
  const [tickCounter, setTickCounter] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickCounter((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time synchronization between Staff and Admin terminals
  useEffect(() => {
    // Initialize realtime WebSocket listener
    const unsubRealtime = dbService.initRealtimeSubscription();

    const syncFromCloud = () => {
      setIsSyncing(true);
      Promise.all([
        dbService.fetchTables().then((remoteTables) => {
          if (remoteTables && remoteTables.length > 0) {
            setTables(remoteTables);
          }
        }),
        dbService.fetchSessions().then((remoteSessions) => {
          if (remoteSessions) {
            setSessions(remoteSessions);
          }
        }),
        dbService.fetchBookings().then((remoteBookings) => {
          if (remoteBookings) {
            setBookings(remoteBookings);
          }
        }),
      ]).finally(() => {
        setIsLoading(false);
        setIsSyncing(false);
      });
    };

    // Initial fetch on mount
    syncFromCloud();

    // Background cloud polling every 4 seconds to guarantee multi-device sync
    const pollTimer = setInterval(syncFromCloud, 4000);

    // Listen to live table changes
    const unsubTable = dbService.onTableChange((tbl, action) => {
      if (action === 'DELETE') {
        setTables((prev) => prev.filter((t) => t.id !== tbl.id));
      } else {
        setTables((prev) => {
          const idx = prev.findIndex((t) => t.id === tbl.id);
          if (idx > -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...tbl };
            return next;
          }
          return [...prev, tbl];
        });
      }
    });

    // Listen to live session changes (starts, pauses, resumes, settlements)
    const unsubSession = dbService.onSessionChange((sess, action) => {
      if (action === 'DELETE') {
        setSessions((prev) => prev.filter((s) => s.id !== sess.id));
      } else {
        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.id === sess.id);
          if (idx > -1) {
            const next = [...prev];
            next[idx] = sess;
            return next;
          }
          return [sess, ...prev];
        });
      }
    });

    // Listen to live booking changes
    const unsubBooking = dbService.onBookingChange((bkg, action) => {
      if (action === 'DELETE') {
        setBookings((prev) => prev.filter((b) => b.id !== bkg.id));
      } else {
        setBookings((prev) => {
          const idx = prev.findIndex((b) => b.id === bkg.id);
          if (idx > -1) {
            const next = [...prev];
            next[idx] = bkg;
            return next;
          }
          return [bkg, ...prev];
        });
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsubRealtime();
      unsubTable();
      unsubSession();
      unsubBooking();
    };
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

  // Fast hashmap of active table sessions with guaranteed fallback for occupied/paused tables
  const activeSessionsMap = useMemo(() => {
    const map: Record<string, TableSession> = {};
    for (const sess of sessions) {
      if (sess.status !== 'completed' && !map[sess.tableId]) {
        map[sess.tableId] = sess;
      }
    }

    // Guarantee that if a table is occupied or paused in cloud, an active session entry always exists
    for (const table of tables) {
      if ((table.status === 'occupied' || table.status === 'paused') && !map[table.id]) {
        const latestSession = sessions.find((s) => s.tableId === table.id && s.status !== 'completed');
        if (latestSession) {
          map[table.id] = latestSession;
        } else {
          map[table.id] = {
            id: table.currentSessionId || `sess_${table.id}_live`,
            tableId: table.id,
            tableName: table.name,
            tableType: table.type,
            ratePerHour: table.ratePerHour,
            startTime: new Date().toISOString(),
            totalPausedDurationMs: 0,
            primaryCustomerName: 'Live Game (Staff In-Progress)',
            playersCount: 1,
            playerNames: ['Player 1'],
            status: table.status === 'paused' ? 'paused' : 'active',
            linkedCafeOrderIds: [],
          };
        }
      }
    }
    return map;
  }, [sessions, tables]);

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

    const updatedSession: TableSession = {
      ...active,
      tableId: destTable.id,
      tableName: destTable.name,
      tableType: destTable.type,
      ratePerHour: destTable.ratePerHour,
      notes: active.notes
        ? `${active.notes} | Transferred from ${sourceTable.name}: ${reason || 'Customer request'}`
        : `Transferred from ${sourceTable.name}: ${reason || 'Customer request'}`,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === active.id ? updatedSession : s))
    );

    const updatedSource = { ...sourceTable, status: 'available' as TableStatus, currentSessionId: undefined };
    const updatedDest = {
      ...destTable,
      status: (active.status === 'paused' ? 'paused' : 'occupied') as TableStatus,
      currentSessionId: active.id,
    };

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === fromTableId) return updatedSource;
        if (t.id === toTableId) return updatedDest;
        return t;
      })
    );

    dbService.syncSession(updatedSession);
    dbService.syncTable(updatedSource);
    dbService.syncTable(updatedDest);

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

    const updatedSession: TableSession = {
      ...active,
      linkedCafeOrderIds: active.linkedCafeOrderIds?.includes(orderId)
        ? active.linkedCafeOrderIds
        : [...(active.linkedCafeOrderIds || []), orderId],
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === active.id ? updatedSession : s))
    );

    dbService.syncSession(updatedSession);
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
    dbService.deleteTableRemote(tableId);
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
    dbService.clearAllBookingsRemote();
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
        isLoading,
        isSyncing,
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
