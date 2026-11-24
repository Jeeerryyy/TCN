/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState, useMemo, useEffect } from 'react';
import { Bill } from '../../types/billing.types';
import { TableSession } from '../../types/table.types';
import { CafeOrder } from '../../types/cafe.types';
import { formatINR } from '../../utils/formatters';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Layers,
  UtensilsCrossed,
  Clock,
} from 'lucide-react';

interface DashboardAnalyticsChartsProps {
  bills: Bill[];
  sessions: TableSession[];
  orders?: CafeOrder[];
}

type TimeRangeFilter = 'today' | '7days' | '30days' | 'custom';

export const DashboardAnalyticsCharts: React.FC<DashboardAnalyticsChartsProps> = ({
  bills,
  sessions,
  orders: _orders,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('7days');
  const [tableChartMode, setTableChartMode] = useState<'category' | 'individual'>('individual');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calculate start & end bounds based on active filter
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start: Date;

    if (timeFilter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (timeFilter === '7days') {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (timeFilter === '30days') {
      start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else {
      start = customStart ? new Date(`${customStart}T00:00:00`) : new Date(0);
      const customEndDate = customEnd ? new Date(`${customEnd}T23:59:59`) : end;
      return { startDate: start, endDate: customEndDate };
    }

    return { startDate: start, endDate: end };
  }, [timeFilter, customStart, customEnd]);

  // Filter out all soft-deleted records and apply date ranges
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (b.isDeleted || b.status === 'voided') return false;
      const bDate = new Date(b.settledAt || b.createdAt);
      return bDate >= startDate && bDate <= endDate;
    });
  }, [bills, startDate, endDate]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (s.isDeleted) return false;
      const sDate = new Date(s.startTime);
      return sDate >= startDate && sDate <= endDate;
    });
  }, [sessions, startDate, endDate]);

  // 1. Daily Revenue Trend Data
  const dailyRevenueData = useMemo(() => {
    const map: Record<string, { date: string; label: string; revenue: number; billsCount: number }> = {};

    // Generate date buckets
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateKey = cur.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${cur.getDate()} ${monthNames[cur.getMonth()]}`;
      map[dateKey] = { date: dateKey, label, revenue: 0, billsCount: 0 };
      cur.setDate(cur.getDate() + 1);
    }

    filteredBills.forEach((b) => {
      const dateKey = (b.settledAt || b.createdAt).split('T')[0];
      if (map[dateKey]) {
        map[dateKey].revenue += b.finalTotal;
        map[dateKey].billsCount += 1;
      }
    });

    return Object.values(map);
  }, [filteredBills, startDate, endDate]);

  // 2. Table Usage: Pool vs Snooker Data
  const tableUsageData = useMemo(() => {
    let poolMinutes = 0;
    let poolSessions = 0;
    let snookerMinutes = 0;
    let snookerSessions = 0;

    filteredSessions.forEach((s) => {
      const isPool = s.tableType === 'pool';
      const startMs = new Date(s.startTime).getTime();
      const endMs = s.endTime ? new Date(s.endTime).getTime() : Date.now();
      const pausedMs = s.totalPausedDurationMs || 0;
      const playMinutes = Math.max(1, Math.round((endMs - startMs - pausedMs) / 60000));

      if (isPool) {
        poolMinutes += playMinutes;
        poolSessions += 1;
      } else {
        snookerMinutes += playMinutes;
        snookerSessions += 1;
      }
    });

    const poolHours = Number((poolMinutes / 60).toFixed(1));
    const snookerHours = Number((snookerMinutes / 60).toFixed(1));

    return [
      { name: 'Pool Tables', hours: poolHours, sessions: poolSessions, fill: '#FF5900' },
      { name: 'Snooker Tables', hours: snookerHours, sessions: snookerSessions, fill: '#006EF5' },
    ];
  }, [filteredSessions]);

  // 2b. Individual 6 Tables Usage Breakdown
  const sixTablesUsageData = useMemo(() => {
    const tableConfigs = [
      { id: 'tbl_p1', shortCode: 'P1', name: 'Pool 1', fill: '#FF5900' },
      { id: 'tbl_p2', shortCode: 'P2', name: 'Pool 2', fill: '#FF5900' },
      { id: 'tbl_p3', shortCode: 'P3', name: 'Pool 3', fill: '#FF7A29' },
      { id: 'tbl_s1', shortCode: 'S1', name: 'Snooker 1', fill: '#006EF5' },
      { id: 'tbl_s2', shortCode: 'S2', name: 'Snooker 2', fill: '#006EF5' },
      { id: 'tbl_s3', shortCode: 'S3', name: 'Snooker 3', fill: '#2A85FF' },
    ];

    const map = new Map(
      tableConfigs.map((t) => [
        t.id,
        { name: t.shortCode, fullName: t.name, hours: 0, sessions: 0, fill: t.fill },
      ])
    );

    filteredSessions.forEach((s) => {
      let entry = map.get(s.tableId);
      if (!entry) {
        for (const [, cfg] of map.entries()) {
          if (s.tableName?.toLowerCase().includes(cfg.fullName.toLowerCase())) {
            entry = cfg;
            break;
          }
        }
      }

      if (entry) {
        const startMs = new Date(s.startTime).getTime();
        const endMs = s.endTime ? new Date(s.endTime).getTime() : Date.now();
        const pausedMs = s.totalPausedDurationMs || 0;
        const playMinutes = Math.max(1, Math.round((endMs - startMs - pausedMs) / 60000));
        entry.hours += playMinutes / 60;
        entry.sessions += 1;
      }
    });

    return Array.from(map.values()).map((e) => ({
      ...e,
      hours: Number(e.hours.toFixed(1)),
    }));
  }, [filteredSessions]);

  // 3. Cafe Sales vs Table Sales Data
  const salesSplitData = useMemo(() => {
    let tableRevenue = 0;
    let cafeRevenue = 0;

    filteredBills.forEach((b) => {
      tableRevenue += b.tableCharge || 0;
      cafeRevenue += b.cafeCharge || 0;
    });

    return [
      { name: 'Table Game Time', value: tableRevenue, color: '#FF5900' },
      { name: 'Café & Drinks', value: cafeRevenue, color: '#006EF5' },
    ];
  }, [filteredBills]);

  // 4. Peak Hours Distribution (00:00 to 23:00)
  const peakHoursData = useMemo(() => {
    const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
      sessions: 0,
      revenue: 0,
    }));

    filteredBills.forEach((b) => {
      const d = new Date(b.settledAt || b.createdAt);
      const h = d.getHours();
      if (hourlyCounts[h]) {
        hourlyCounts[h].revenue += b.finalTotal;
        hourlyCounts[h].sessions += 1;
      }
    });

    // We can also overlay session start times
    filteredSessions.forEach((s) => {
      const d = new Date(s.startTime);
      const h = d.getHours();
      if (hourlyCounts[h]) {
        hourlyCounts[h].sessions += 1;
      }
    });

    // Focus on active venue operating hours (e.g., 10 AM to 1 AM)
    return hourlyCounts.filter((h) => h.hour >= 10 || h.hour <= 1);
  }, [filteredBills, filteredSessions]);

  const totalPeriodRevenue = useMemo(() => {
    return filteredBills.reduce((sum, b) => sum + b.finalTotal, 0);
  }, [filteredBills]);

  if (!isMounted) {
    return (
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#B9BBC6]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#FF5900]" />
            <h3 className="text-lg font-semibold text-[#000000]">Performance & Revenue Analytics</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[280px] bg-[#F8F9FA] rounded-[8px] border border-[#B9BBC6]/40 animate-pulse flex items-center justify-center text-[#60646C] text-xs font-mono">
              Initializing Analytics Engine...
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] space-y-6">
      {/* Section Header & Responsive Time Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#B9BBC6]">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#FF5900]" />
            <h3 className="text-lg font-semibold text-[#000000]">
              Performance & Revenue Analytics
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFF4ED] text-[#FF5900] px-2 py-0.5 rounded-full border border-[#FF5900]/20">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-[#60646C] mt-0.5">
            Real-time charts powered by Recharts. All soft-deleted entries are automatically excluded.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[8px] text-xs font-medium">
          {(['today', '7days', '30days', 'custom'] as TimeRangeFilter[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTimeFilter(tab)}
              className={`px-3 py-1.5 rounded-[6px] transition-all ${timeFilter === tab
                  ? 'bg-[#FFFFFF] text-[#FF5900] font-bold shadow-[0px_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#60646C] hover:text-[#000000]'
                }`}
            >
              {tab === 'today' ? 'Today' : tab === '7days' ? 'Last 7 Days' : tab === '30days' ? 'Last 30 Days' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {timeFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-[#F8F9FA] border border-[#B9BBC6] rounded-[8px] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#60646C] font-semibold">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#B9BBC6] rounded-[4px] font-mono text-xs text-[#15191E]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#60646C] font-semibold">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#B9BBC6] rounded-[4px] font-mono text-xs text-[#15191E]"
            />
          </div>
          <div className="text-[11px] text-[#006EF5] font-semibold font-mono ml-auto">
            Period Total: {formatINR(totalPeriodRevenue)}
          </div>
        </div>
      )}

      {/* 4 Interactive Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Revenue Trend */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-5 space-y-3 shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF5900]" />
              <h4 className="text-sm font-semibold text-[#15191E]">Daily Revenue Trend</h4>
            </div>
            <span className="text-xs font-mono font-bold text-[#FF5900]">
              Total: {formatINR(totalPeriodRevenue)}
            </span>
          </div>

          <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height={240} debounce={50}>
              <AreaChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5900" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF5900" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" vertical={false} />
                <XAxis dataKey="label" stroke="#8B8D98" fontSize={11} tickLine={false} />
                <YAxis stroke="#8B8D98" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val) || 0), 'Settled Revenue']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{ backgroundColor: '#15191E', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#FF5900" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Table Usage by Pool vs Snooker or 6 Tables */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-5 space-y-3 shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#006EF5]" />
              <h4 className="text-sm font-semibold text-[#15191E]">Table Hours Played</h4>
            </div>

            {/* View Toggle */}
            <div className="inline-flex p-0.5 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setTableChartMode('individual')}
                className={`px-2 py-0.5 rounded-[4px] transition-all ${tableChartMode === 'individual'
                    ? 'bg-[#FFFFFF] text-[#FF5900] shadow-sm'
                    : 'text-[#60646C] hover:text-[#000000]'
                  }`}
              >
                All 6 Tables
              </button>
              <button
                type="button"
                onClick={() => setTableChartMode('category')}
                className={`px-2 py-0.5 rounded-[4px] transition-all ${tableChartMode === 'category'
                    ? 'bg-[#FFFFFF] text-[#FF5900] shadow-sm'
                    : 'text-[#60646C] hover:text-[#000000]'
                  }`}
              >
                Pool vs Snooker
              </button>
            </div>
          </div>

          <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height={240} debounce={50}>
              <BarChart
                data={tableChartMode === 'individual' ? sixTablesUsageData : tableUsageData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" vertical={false} />
                <XAxis dataKey="name" stroke="#8B8D98" fontSize={11} tickLine={false} />
                <YAxis stroke="#8B8D98" fontSize={11} tickLine={false} tickFormatter={(val) => `${val}h`} />
                <Tooltip
                  formatter={(val: any) => [`${val} Hours`, 'Game Playtime']}
                  contentStyle={{ backgroundColor: '#15191E', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px' }}
                />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={tableChartMode === 'individual' ? 28 : 48}>
                  {(tableChartMode === 'individual' ? sixTablesUsageData : tableUsageData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Café Sales vs Table Sales */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-5 space-y-3 shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-[#0D9926]" />
              <h4 className="text-sm font-semibold text-[#15191E]">Café Sales vs Table Sales</h4>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-[#FF5900] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#FF5900]" /> Table: {formatINR(salesSplitData[0]?.value || 0)}
              </span>
              <span className="flex items-center gap-1 text-[#006EF5] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#006EF5]" /> Café: {formatINR(salesSplitData[1]?.value || 0)}
              </span>
            </div>
          </div>

          <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height={240} debounce={50}>
              <BarChart data={salesSplitData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" horizontal={false} />
                <XAxis type="number" stroke="#8B8D98" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <YAxis dataKey="name" type="category" stroke="#8B8D98" fontSize={11} tickLine={false} width={90} />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val) || 0), 'Total Share']}
                  contentStyle={{ backgroundColor: '#15191E', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                  {salesSplitData.map((entry, index) => (
                    <Cell key={`split-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Peak Hours Activity */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-5 space-y-3 shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#3C16D5]" />
              <h4 className="text-sm font-semibold text-[#15191E]">Peak Hours Distribution</h4>
            </div>
            <span className="text-xs font-mono text-[#60646C]">Activity by Hour</span>
          </div>

          <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height={240} debounce={50}>
              <BarChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" vertical={false} />
                <XAxis dataKey="label" stroke="#8B8D98" fontSize={10} tickLine={false} interval={1} />
                <YAxis stroke="#8B8D98" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [val, name === 'sessions' ? 'Game / Ticket Count' : 'Total Revenue']}
                  contentStyle={{ backgroundColor: '#15191E', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px' }}
                />
                <Bar dataKey="sessions" fill="#3C16D5" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
