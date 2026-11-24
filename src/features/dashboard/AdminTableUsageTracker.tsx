/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React, { useState, useMemo, useEffect } from 'react';
import { useTables } from '../../context/TableContext';
import { useBilling } from '../../context/BillingContext';
import { useAuth } from '../../context/AuthContext';
import { Table, TableClothWearLevel } from '../../types/table.types';
import { calculateElapsedSeconds } from '../../utils/timer';
import { getLocalDateString, formatTimeOnly } from '../../utils/formatters';
import {
  loadIroningLogs,
  saveIroningLog,
  deleteIroningLog,
  StoredIroningRecord,
} from '../../utils/storage';
import {
  Flame,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  Info,
} from 'lucide-react';

interface ProcessedTableUsage {
  table: Table;
  usedMinutes: number;
  usedHoursDecimal: number;
  usedHoursFormatted: string;
  bookedMinutes: number;
  bookedHoursDecimal: number;
  bookedHoursFormatted: string;
  sessionCount: number;
  bookingCount: number;
  isCurrentlyPlaying: boolean;
  currentSessionMinutes: number;
  wearLevel: TableClothWearLevel;
  ironingRecord?: StoredIroningRecord;
  sessionsList: {
    id: string;
    customerName: string;
    startTime: string;
    endTime?: string;
    minutes: number;
    status: string;
    isLive: boolean;
  }[];
}

export const AdminTableUsageTracker: React.FC = () => {
  const { tables, sessions, bookings, activeSessionsMap, tickCounter } = useTables();
  const { bills } = useBilling();
  const { currentUser, isAdmin } = useAuth();

  const todayStr = useMemo(() => getLocalDateString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [tableFilter, setTableFilter] = useState<'all' | 'pool' | 'snooker'>('all');
  const [ironingLogs, setIroningLogs] = useState<Record<string, StoredIroningRecord>>(() =>
    loadIroningLogs()
  );
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);

  // Sync ironing logs from storage on mount
  useEffect(() => {
    setIroningLogs(loadIroningLogs());
  }, [selectedDate]);

  const isToday = selectedDate === todayStr;

  // Calculate usage data for each of the 6 tables for selectedDate
  const tablesUsageData: ProcessedTableUsage[] = useMemo(() => {
    return tables.map((table) => {
      let totalUsedMinutes = 0;
      let sessionCount = 0;
      const sessionsList: ProcessedTableUsage['sessionsList'] = [];

      // 1. Check all live & completed sessions
      sessions.forEach((s) => {
        if (s.isDeleted) return;
        if (s.tableId !== table.id && s.tableName?.toLowerCase() !== table.name.toLowerCase()) return;

        const sessionStartDate = getLocalDateString(s.startTime);
        const sessionEndDate = s.endTime ? getLocalDateString(s.endTime) : '';

        // Matches selected date if started on selectedDate or ended on selectedDate
        const isMatch = sessionStartDate === selectedDate || sessionEndDate === selectedDate;

        if (isMatch) {
          const isLive = s.status === 'active' || s.status === 'paused';
          // If viewing today and session is live, calculate live duration
          let durationMinutes = 0;
          if (isLive && isToday) {
            const elapsedSecs = calculateElapsedSeconds(s);
            durationMinutes = Math.max(1, Math.round(elapsedSecs / 60));
          } else {
            const elapsedSecs = calculateElapsedSeconds(s);
            durationMinutes = Math.max(1, Math.round(elapsedSecs / 60));
          }

          totalUsedMinutes += durationMinutes;
          sessionCount += 1;

          sessionsList.push({
            id: s.id,
            customerName: s.primaryCustomerName || 'Walk-in Guest',
            startTime: s.startTime,
            endTime: s.endTime,
            minutes: durationMinutes,
            status: s.status,
            isLive,
          });
        }
      });

      // 2. Check manual notebook bills (to ensure manual games count towards cloth wear)
      bills.forEach((b) => {
        if (b.isDeleted || b.status === 'voided' || !b.isManualEntry) return;
        if (b.tableId !== table.id && b.tableName !== table.name) return;

        const billDate = getLocalDateString(b.createdAt) || getLocalDateString(b.settledAt);
        if (billDate === selectedDate) {
          // If bill was already counted as a session, skip
          if (b.sessionId && sessionsList.some((s) => s.id === b.sessionId)) return;

          // Extract table duration from line items or table charge
          let manualMinutes = 60; // default 1 hour fallback
          const tableItem = b.items?.find((i) => i.type === 'table_time');
          if (tableItem) {
            const match = tableItem.title.match(/(\d+)\s*mins?/i);
            if (match) {
              manualMinutes = parseInt(match[1], 10);
            } else if (table.ratePerHour > 0) {
              manualMinutes = Math.round((tableItem.totalPrice / table.ratePerHour) * 60);
            }
          }

          totalUsedMinutes += manualMinutes;
          sessionCount += 1;
          sessionsList.push({
            id: b.id,
            customerName: b.customerName || 'Manual Entry',
            startTime: b.createdAt,
            endTime: b.settledAt,
            minutes: manualMinutes,
            status: 'completed',
            isLive: false,
          });
        }
      });

      // 3. Check Advance Bookings for this table on this date
      let totalBookedMinutes = 0;
      let bookingCount = 0;
      bookings.forEach((b) => {
        if (b.status === 'cancelled') return;
        if (b.tableId !== table.id && b.tableName !== table.name) return;

        if (b.bookingDate === selectedDate) {
          totalBookedMinutes += b.durationMinutes || 60;
          bookingCount += 1;
        }
      });

      // 4. Live session details if active right now
      const activeSession = isToday ? activeSessionsMap[table.id] : null;
      const isCurrentlyPlaying = Boolean(activeSession && activeSession.status !== 'completed');
      const currentSessionMinutes = isCurrentlyPlaying
        ? Math.round(calculateElapsedSeconds(activeSession!) / 60)
        : 0;

      // 5. Wear Level Assessment
      // Heavy Wear: >= 4.5 hours (270 mins) -> High friction, nap flattened -> Mandatory Hot Iron
      // Moderate Wear: 2.0 to 4.5 hours (120 to 269 mins) -> Standard Press Recommended
      // Light Wear: 1 to 119 mins -> Quick Brush
      // Idle: 0 mins -> No Ironing
      let wearLevel: TableClothWearLevel = 'idle';
      if (totalUsedMinutes >= 270) {
        wearLevel = 'heavy';
      } else if (totalUsedMinutes >= 120) {
        wearLevel = 'moderate';
      } else if (totalUsedMinutes > 0) {
        wearLevel = 'light';
      }

      // Format hours
      const usedHrs = Math.floor(totalUsedMinutes / 60);
      const usedMinsRemainder = totalUsedMinutes % 60;
      const usedHoursFormatted =
        usedHrs > 0 ? `${usedHrs}h ${usedMinsRemainder}m` : `${usedMinsRemainder}m`;
      const usedHoursDecimal = Number((totalUsedMinutes / 60).toFixed(1));

      const bookedHrs = Math.floor(totalBookedMinutes / 60);
      const bookedMinsRemainder = totalBookedMinutes % 60;
      const bookedHoursFormatted =
        bookedHrs > 0 ? `${bookedHrs}h ${bookedMinsRemainder}m` : `${bookedMinsRemainder}m`;
      const bookedHoursDecimal = Number((totalBookedMinutes / 60).toFixed(1));

      // 6. Ironing record from logs
      const logKey = `${selectedDate}_${table.id}`;
      const ironingRecord = ironingLogs[logKey];

      return {
        table,
        usedMinutes: totalUsedMinutes,
        usedHoursDecimal,
        usedHoursFormatted,
        bookedMinutes: totalBookedMinutes,
        bookedHoursDecimal,
        bookedHoursFormatted,
        sessionCount,
        bookingCount,
        isCurrentlyPlaying,
        currentSessionMinutes,
        wearLevel,
        ironingRecord,
        sessionsList,
      };
    });
    // tickCounter drives real-time re-computation when live games are running
  }, [tables, sessions, bills, bookings, activeSessionsMap, selectedDate, todayStr, isToday, ironingLogs, tickCounter]);

  // Filtered tables based on Pool vs Snooker switcher
  const filteredData = useMemo(() => {
    if (tableFilter === 'all') return tablesUsageData;
    return tablesUsageData.filter((d) => d.table.type === tableFilter);
  }, [tablesUsageData, tableFilter]);

  // Aggregate Arena Totals
  const totalArenaUsedMinutes = useMemo(
    () => tablesUsageData.reduce((sum, d) => sum + d.usedMinutes, 0),
    [tablesUsageData]
  );
  const totalArenaUsedHours = Number((totalArenaUsedMinutes / 60).toFixed(1));

  const totalArenaBookedMinutes = useMemo(
    () => tablesUsageData.reduce((sum, d) => sum + d.bookedMinutes, 0),
    [tablesUsageData]
  );
  const totalArenaBookedHours = Number((totalArenaBookedMinutes / 60).toFixed(1));

  const tablesNeedingIroning = useMemo(
    () => tablesUsageData.filter((d) => d.wearLevel === 'heavy' || d.wearLevel === 'moderate'),
    [tablesUsageData]
  );

  const ironedTablesCount = useMemo(
    () => tablesUsageData.filter((d) => Boolean(d.ironingRecord)).length,
    [tablesUsageData]
  );

  // Toggle Table Ironed status
  const handleToggleIroned = (table: Table) => {
    const logKey = `${selectedDate}_${table.id}`;
    const existing = ironingLogs[logKey];

    if (existing) {
      deleteIroningLog(selectedDate, table.id);
      setIroningLogs((prev) => {
        const next = { ...prev };
        delete next[logKey];
        return next;
      });
    } else {
      const newRecord: StoredIroningRecord = {
        tableId: table.id,
        tableName: table.name,
        date: selectedDate,
        ironedAt: new Date().toISOString(),
        ironedBy: currentUser?.name || 'Administrator',
      };
      saveIroningLog(newRecord);
      setIroningLogs((prev) => ({
        ...prev,
        [logKey]: newRecord,
      }));
    }
  };

  const handlePrintDailySheet = () => {
    window.print();
  };

  // Staff Security Guard: Never render for non-admin accounts
  if (!isAdmin) {
    return null;
  }

  return (
    <div
      id="admin-table-ironing-tracker"
      className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] space-y-6"
    >
      {/* Executive Cloth Care Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#B9BBC6]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-[4px] font-semibold uppercase bg-[#FFF4ED] text-[#FF5900] border border-[#FF5900]/30 flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#FF5900]" /> Table Wear & Cloth Care
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#D5E8FB] text-[#006EF5] px-2 py-0.5 rounded-full border border-[#006EF5]/20">
              Admin Exclusive
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-[#000000] flex items-center gap-2">
            Daily Table Usage & Ironing Tracker
          </h3>
          <p className="text-xs text-[#60646C] mt-0.5">
            Monitor exact play hours per table to schedule daily thermostatic cloth ironing, directional nap brushing, and bed maintenance.
          </p>
        </div>

        {/* Controls: Date Picker + Quick Day Switchers + Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Day Switchers */}
          <div className="inline-flex p-1 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[8px] text-xs font-semibold shadow-sm">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-[6px] transition-all flex items-center gap-1.5 ${
                selectedDate === todayStr
                  ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_1px_3px_rgba(0,0,0,0.1)]'
                  : 'text-[#60646C] hover:text-[#000000]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9926] animate-pulse" />
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setSelectedDate(getLocalDateString(y));
              }}
              className={`px-3 py-1.5 rounded-[6px] transition-all ${
                selectedDate !== todayStr &&
                selectedDate ===
                  getLocalDateString(new Date(Date.now() - 86400000))
                  ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_1px_3px_rgba(0,0,0,0.1)]'
                  : 'text-[#60646C] hover:text-[#000000]'
              }`}
            >
              Yesterday
            </button>
          </div>

          {/* Native Date Picker */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] px-2.5 py-1.5 shadow-sm text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#006EF5]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="bg-transparent text-xs text-[#15191E] font-medium outline-none cursor-pointer"
            />
          </div>

          {/* Print Maintenance Sheet */}
          <button
            type="button"
            onClick={handlePrintDailySheet}
            className="h-[34px] px-3 rounded-[6px] bg-[#FFFFFF] hover:bg-[#F3F3F7] text-[#15191E] border border-[#B9BBC6] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
            title="Print A4 Daily Ironing & Maintenance Checklist"
          >
            <Printer className="w-3.5 h-3.5 text-[#60646C]" />
            <span className="hidden sm:inline">Print Checklist</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Play Hours */}
        <div className="bg-[#F8F9FA] border border-[#B9BBC6]/70 rounded-[8px] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-[#FF5900]" /> Total Play Hours
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#15191E]">
            {totalArenaUsedHours} <span className="text-xs font-normal text-[#60646C]">hrs</span>
          </div>
          <div className="text-[11px] text-[#60646C] mt-1">
            Across all 6 tables on {selectedDate === todayStr ? 'Today' : selectedDate}
          </div>
        </div>

        {/* Total Booked Hours */}
        <div className="bg-[#F8F9FA] border border-[#B9BBC6]/70 rounded-[8px] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#006EF5]" /> Advance Booked
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#006EF5]">
            {totalArenaBookedHours} <span className="text-xs font-normal text-[#60646C]">hrs</span>
          </div>
          <div className="text-[11px] text-[#60646C] mt-1">
            Scheduled reservations
          </div>
        </div>

        {/* Ironing Advisory Needs */}
        <div className="bg-[#F8F9FA] border border-[#B9BBC6]/70 rounded-[8px] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-[#FF3D00]" /> Ironing Required
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#FF3D00]">
            {tablesNeedingIroning.length} <span className="text-xs font-normal text-[#60646C]">of 6</span>
          </div>
          <div className="text-[11px] text-[#FF5900] font-medium mt-1">
            {tablesNeedingIroning.length === 0
              ? 'All cloths within light threshold'
              : `${tablesNeedingIroning.length} board(s) need pressing`}
          </div>
        </div>

        {/* Ironing Checklist Completion */}
        <div className="bg-[#F8F9FA] border border-[#B9BBC6]/70 rounded-[8px] p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9926]" /> Daily Ironed
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#0D9926]">
            {ironedTablesCount} / 6
          </div>
          <div className="text-[11px] text-[#0D9926] font-medium mt-1">
            {ironedTablesCount === 6 ? 'All tables ironed today' : `${6 - ironedTablesCount} pending`}
          </div>
        </div>
      </div>

      {/* Filter Tabs (All vs Pool vs Snooker) */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex p-0.5 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTableFilter('all')}
            className={`px-3 py-1.5 rounded-[4px] transition-all ${
              tableFilter === 'all'
                ? 'bg-[#FFFFFF] text-[#FF5900] shadow-sm'
                : 'text-[#60646C] hover:text-[#000000]'
            }`}
          >
            All 6 Tables
          </button>
          <button
            type="button"
            onClick={() => setTableFilter('pool')}
            className={`px-3 py-1.5 rounded-[4px] transition-all ${
              tableFilter === 'pool'
                ? 'bg-[#FFFFFF] text-[#FF5900] shadow-sm'
                : 'text-[#60646C] hover:text-[#000000]'
            }`}
          >
            Pool Tables (3)
          </button>
          <button
            type="button"
            onClick={() => setTableFilter('snooker')}
            className={`px-3 py-1.5 rounded-[4px] transition-all ${
              tableFilter === 'snooker'
                ? 'bg-[#FFFFFF] text-[#006EF5] shadow-sm'
                : 'text-[#60646C] hover:text-[#000000]'
            }`}
          >
            Snooker Tables (3)
          </button>
        </div>

        <div className="text-xs text-[#60646C] hidden sm:flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3D00]" /> Heavy (&gt;4.5h)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFA500]" /> Moderate (2-4.5h)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0D9926]" /> Light (&lt;2h)
          </span>
        </div>
      </div>

      {/* 6 Individual Table Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredData.map((item) => {
          const {
            table,
            usedHoursFormatted,
            usedHoursDecimal,
            usedMinutes,
            bookedHoursFormatted,
            bookedHoursDecimal,
            sessionCount,
            bookingCount,
            isCurrentlyPlaying,
            currentSessionMinutes,
            wearLevel,
            ironingRecord,
            sessionsList,
          } = item;

          const isSnooker = table.type === 'snooker';
          const isIroned = Boolean(ironingRecord);
          const isExpanded = expandedTableId === table.id;

          // Progress percentage towards 6 hours threshold (capped at 100%)
          const progressPercent = Math.min(100, Math.round((usedMinutes / 360) * 100));

          return (
            <div
              key={table.id}
              className={`bg-[#FFFFFF] border rounded-[8px] p-4 sm:p-5 flex flex-col justify-between transition-all shadow-[0px_2px_8px_rgba(0,0,0,0.06)] ${
                isIroned
                  ? 'border-[#0D9926]/40 bg-[#F6FCF7]/30'
                  : wearLevel === 'heavy'
                  ? 'border-[#FF3D00]/60 ring-1 ring-[#FF3D00]/20'
                  : 'border-[#B9BBC6] hover:border-[#FF5900]'
              }`}
            >
              <div>
                {/* Header: Shortcode, Name & Cloth spec */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-[8px] font-mono font-bold text-sm flex items-center justify-center shrink-0 border ${
                        isSnooker
                          ? 'bg-[#D5E8FB] text-[#006EF5] border-[#006EF5]/30'
                          : 'bg-[#FFF4ED] text-[#FF5900] border-[#FF5900]/30'
                      }`}
                    >
                      {table.shortCode}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#15191E] flex items-center gap-1.5">
                        {table.name}
                        {isCurrentlyPlaying && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[#D1F4D2] text-[#0D9926] border border-[#0D9926]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9926] animate-pulse" />
                            Live
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-[#60646C]">
                        {table.size} · {table.clothColor}
                      </p>
                    </div>
                  </div>

                  {/* Wear Level Badge */}
                  <div>
                    {wearLevel === 'heavy' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-[#FFF1F0] text-[#FF3D00] border border-[#FF3D00]/30">
                        <Flame className="w-3 h-3 text-[#FF3D00]" /> Heavy Wear
                      </span>
                    )}
                    {wearLevel === 'moderate' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-[#FFFBE6] text-[#D48806] border border-[#D48806]/30">
                        <Zap className="w-3 h-3 text-[#D48806]" /> Moderate Wear
                      </span>
                    )}
                    {wearLevel === 'light' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-[#E6F7FF] text-[#006EF5] border border-[#006EF5]/30">
                        <Sparkles className="w-3 h-3 text-[#006EF5]" /> Light Wear
                      </span>
                    )}
                    {wearLevel === 'idle' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-[#F3F3F7] text-[#8B8D98] border border-[#B9BBC6]/40">
                        Idle Board
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Metric: Total Play Hours */}
                <div className="bg-[#F8F9FA] border border-[#B9BBC6]/50 rounded-[6px] p-3 mb-3">
                  <div className="flex items-center justify-between text-[11px] text-[#60646C] mb-1">
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#FF5900]" /> Total Hours Played
                    </span>
                    <span className="font-mono text-[#15191E]">
                      {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-mono font-bold text-[#15191E]">
                      {usedHoursFormatted}
                    </div>
                    <div className="text-xs font-mono text-[#60646C]">
                      ({usedHoursDecimal} hrs)
                    </div>
                    {isCurrentlyPlaying && (
                      <span className="text-[10px] font-medium text-[#0D9926] ml-auto font-mono">
                        +{currentSessionMinutes}m in progress
                      </span>
                    )}
                  </div>

                  {/* Progress bar towards daily wear threshold */}
                  <div className="w-full bg-[#E5E6EB] h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-300 ${
                        wearLevel === 'heavy'
                          ? 'bg-[#FF3D00]'
                          : wearLevel === 'moderate'
                          ? 'bg-[#FFA500]'
                          : 'bg-[#006EF5]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Secondary Metrics: Booked Hours & Sessions */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6]/60">
                    <div className="text-[10px] text-[#60646C] font-semibold uppercase">
                      Advance Booked
                    </div>
                    <div className="font-mono font-bold text-[#006EF5] mt-0.5">
                      {bookedHoursFormatted} <span className="text-[10px] font-normal text-[#60646C]">({bookedHoursDecimal}h)</span>
                    </div>
                    <div className="text-[10px] text-[#8B8D98]">
                      {bookingCount} {bookingCount === 1 ? 'slot' : 'slots'}
                    </div>
                  </div>

                  <div className="p-2 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6]/60">
                    <div className="text-[10px] text-[#60646C] font-semibold uppercase">
                      Cloth Friction
                    </div>
                    <div
                      className={`font-semibold mt-0.5 ${
                        wearLevel === 'heavy'
                          ? 'text-[#FF3D00]'
                          : wearLevel === 'moderate'
                          ? 'text-[#D48806]'
                          : 'text-[#0D9926]'
                      }`}
                    >
                      {wearLevel === 'heavy'
                        ? 'Flattened Nap'
                        : wearLevel === 'moderate'
                        ? 'Standard Wear'
                        : 'Clean / Fresh'}
                    </div>
                    <div className="text-[10px] text-[#8B8D98]">
                      {wearLevel === 'heavy'
                        ? 'Iron Mandatory'
                        : wearLevel === 'moderate'
                        ? 'Press Advised'
                        : 'Nap Brush'}
                    </div>
                  </div>
                </div>

                {/* Maintenance Recommendation Guideline */}
                <div className="text-[11px] leading-relaxed text-[#60646C] mb-4 bg-[#F8F9FA] p-2 rounded-[6px] border border-[#B9BBC6]/40 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#006EF5] shrink-0 mt-0.5" />
                  <div>
                    {isSnooker ? (
                      wearLevel === 'heavy' ? (
                        <span>
                          <strong className="text-[#FF3D00]">Action:</strong> Brush vigorously with the nap (baulk to black), block, and iron with thermostatic iron at 100°C–110°C.
                        </span>
                      ) : wearLevel === 'moderate' ? (
                        <span>
                          <strong className="text-[#D48806]">Action:</strong> Standard directional brushing with the nap followed by light thermostatic iron press.
                        </span>
                      ) : (
                        <span>
                          <strong className="text-[#0D9926]">Action:</strong> Quick hand-brush with the nap and dust cover. Ironing optional.
                        </span>
                      )
                    ) : wearLevel === 'heavy' ? (
                      <span>
                        <strong className="text-[#FF3D00]">Action:</strong> Directional brush and warm iron press to restore ball speed and prevent cloth nap tracks.
                      </span>
                    ) : (
                      <span>
                        <strong className="text-[#0D9926]">Action:</strong> Light brush and wipe rails. Clean table surface.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Mark as Ironed Toggle & Session Inspector */}
              <div className="space-y-2 pt-3 border-t border-[#B9BBC6]/50">
                {isIroned ? (
                  <div className="flex items-center justify-between p-2.5 rounded-[6px] bg-[#D1F4D2]/40 border border-[#0D9926]/30">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0D9926]">
                      <CheckCircle2 className="w-4 h-4 text-[#0D9926]" />
                      <div>
                        <div>Table Ironed Today</div>
                        <div className="text-[10px] font-normal text-[#60646C]">
                          {formatTimeOnly(ironingRecord?.ironedAt)} by {ironingRecord?.ironedBy}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleIroned(table)}
                      className="text-[11px] font-semibold text-[#FF3D00] hover:underline flex items-center gap-1 p-1"
                      title="Undo ironed checkmark"
                    >
                      <RotateCcw className="w-3 h-3" /> Undo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleIroned(table)}
                    className="w-full h-[36px] rounded-[6px] bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm border border-[#42578A]/15"
                  >
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    Mark Table as Ironed
                  </button>
                )}

                {/* Expand Session List Toggle */}
                {sessionsList.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTableId(isExpanded ? null : table.id)
                      }
                      className="w-full py-1 text-[11px] text-[#006EF5] hover:underline flex items-center justify-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          Hide Session List <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          Inspect {sessionsList.length} Sessions <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>

                    {/* Expandable Session Breakdown */}
                    {isExpanded && (
                      <div className="mt-2 p-2 bg-[#F8F9FA] rounded-[6px] border border-[#B9BBC6]/50 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                        <div className="text-[10px] font-semibold uppercase text-[#60646C] tracking-wider mb-1">
                          Sessions on {selectedDate}:
                        </div>
                        {sessionsList.map((s, idx) => (
                          <div
                            key={s.id || idx}
                            className="p-1.5 bg-[#FFFFFF] rounded border border-[#B9BBC6]/30 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <div className="font-semibold text-[#15191E]">
                                {s.customerName}
                              </div>
                              <div className="text-[10px] text-[#60646C]">
                                {formatTimeOnly(s.startTime)}
                                {s.endTime ? ` – ${formatTimeOnly(s.endTime)}` : ' (In Progress)'}
                              </div>
                            </div>
                            <div className="font-mono font-bold text-[#FF5900]">
                              {s.minutes} mins
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden Printable Section for Maintenance Staff */}
      <div className="hidden print:block text-black p-4 space-y-4">
        <div className="text-center pb-2 border-b">
          <h2 className="text-xl font-bold">The Q Nation – Daily Table Ironing & Maintenance Sheet</h2>
          <p className="text-xs">Date: {selectedDate} · Generated for Floor Staff & Table Stewards</p>
        </div>
        <table className="w-full text-left text-xs border border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2 border">Code</th>
              <th className="p-2 border">Table Name</th>
              <th className="p-2 border">Cloth Spec</th>
              <th className="p-2 border">Hours Played</th>
              <th className="p-2 border">Hours Booked</th>
              <th className="p-2 border">Wear Status</th>
              <th className="p-2 border">Ironing Done</th>
              <th className="p-2 border">Staff Signature</th>
            </tr>
          </thead>
          <tbody>
            {tablesUsageData.map((d) => (
              <tr key={d.table.id} className="border-b">
                <td className="p-2 border font-bold">{d.table.shortCode}</td>
                <td className="p-2 border">{d.table.name}</td>
                <td className="p-2 border">{d.table.clothColor}</td>
                <td className="p-2 border font-bold">{d.usedHoursFormatted} ({d.usedHoursDecimal} hrs)</td>
                <td className="p-2 border">{d.bookedHoursFormatted}</td>
                <td className="p-2 border font-bold uppercase">{d.wearLevel}</td>
                <td className="p-2 border">{d.ironingRecord ? `YES (${formatTimeOnly(d.ironingRecord.ironedAt)})` : 'PENDING'}</td>
                <td className="p-2 border">____________________</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
