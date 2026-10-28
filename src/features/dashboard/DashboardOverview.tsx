/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState } from 'react';
import { useTables } from '../../context/TableContext';
import { useCafe } from '../../context/CafeContext';
import { useBilling } from '../../context/BillingContext';
import { useCustomers } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { TableCard } from '../tables/TableCard';
import { StartSessionDialog } from '../tables/StartSessionDialog';
import { TransferTableModal } from '../tables/TransferTableModal';
import { SettleBillModal } from '../billing/SettleBillModal';
import { InvoiceReceipt } from '../billing/InvoiceReceipt';
import { formatINR, getBillDateString, getLocalDateString } from '../../utils/formatters';
import { Table } from '../../types/table.types';
import {
  Banknote,
  Clock,
  Coffee,
  Users,
  Play,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Sliders,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { ActiveNavTab } from '../../components/layout/SidebarNav';

interface DashboardOverviewProps {
  onNavigate: (tab: ActiveNavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { tables } = useTables();
  const { activeKitchenOrders, setSelectedTableId, setCartDestination } = useCafe();
  const { bills, activeBillModal, setActiveBillModal } = useBilling();
  const { customers } = useCustomers();
  const { isAdmin } = useAuth();

  const [sessionModalTable, setSessionModalTable] = useState<Table | null>(null);
  const [transferModalTable, setTransferModalTable] = useState<Table | null>(null);
  const [settleModalTable, setSettleModalTable] = useState<Table | null>(null);
  const [adminRevenueMode, setAdminRevenueMode] = useState<'per_day' | 'overall'>('per_day');

  // Live KPI Calculations
  const occupiedTables = tables.filter((t) => t.status === 'occupied' || t.status === 'paused');
  const availableTables = tables.filter((t) => t.status === 'available');

  const todayStr = getLocalDateString();
  const todayBills = bills.filter((b) => getBillDateString(b) === todayStr && b.status !== 'voided');
  const todayRevenue = todayBills.reduce((sum, b) => sum + b.finalTotal, 0);

  const overallBills = bills.filter((b) => b.status !== 'voided');
  const overallRevenue = overallBills.reduce((sum, b) => sum + b.finalTotal, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner & Quick Shift Summary */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        <div>
          <div className="text-xs uppercase font-semibold text-[#FF5900] tracking-wider flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" /> {isAdmin ? 'Executive Suite Active' : 'Floor Shift Active'}
          </div>
          <h1 className="text-xl sm:text-2xl font-medium text-[#000000]">
            Floor Command & Live Operations
          </h1>
          <p className="text-xs text-[#60646C] mt-1 max-w-xl leading-relaxed">
            Real-time billiard session timers, kitchen ticket synchronization, and integrated table folios.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onNavigate('tables')}
            className="h-[40px] px-3.5 sm:px-4 rounded-[8px] bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white text-xs font-normal transition-colors flex items-center gap-2 border border-[#42578A]/15 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Manage Floor
          </button>
          <button
            type="button"
            onClick={() => onNavigate('bookings')}
            className="h-[40px] px-3 sm:px-3.5 rounded-[6px] bg-transparent hover:bg-[#15191E]/[0.08] text-[#15191E] border border-[#15191E] text-xs font-normal transition-colors flex items-center gap-2 shrink-0"
          >
            <Calendar className="w-3.5 h-3.5 text-[#006EF5]" /> Bookings
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('table-studio')}
              className="h-[40px] px-3 sm:px-3.5 rounded-[6px] bg-transparent hover:bg-[#15191E]/[0.08] text-[#15191E] border border-[#15191E] text-xs font-normal transition-colors flex items-center gap-2 shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-[#006EF5]" /> Table Studio
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedTableId('');
              setCartDestination('counter');
              onNavigate('cafe');
            }}
            className="h-[40px] px-3 sm:px-3.5 rounded-[6px] bg-transparent hover:bg-[#15191E]/[0.08] text-[#15191E] border border-[#15191E] text-xs font-normal transition-colors flex items-center gap-2 shrink-0"
            title="Order snacks & drinks separately for walk-in customer"
          >
            <Coffee className="w-3.5 h-3.5 text-[#FFA500]" /> Snacks & Drinks Bill
          </button>
        </div>
      </div>

      {/* 4 Primary Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Revenue (Admin-Only with Live Per-Day vs Overall Switcher) OR Vacant Tables (Staff View) */}
        {isAdmin ? (
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[#60646C]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15191E]">
                    {adminRevenueMode === 'per_day' ? "Today's Revenue" : 'Overall Revenue'}
                  </span>
                  {adminRevenueMode === 'per_day' ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-[#D1F4D2] text-[#0D9926] px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0D9926] animate-pulse" /> Live Today
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider bg-[#F3F3F7] text-[#60646C] px-1.5 py-0.5 rounded-full">
                      All-Time
                    </span>
                  )}
                </div>
                <div className="w-7 h-7 rounded-[6px] bg-[#D1F4D2] text-[#0D9926] flex items-center justify-center border border-[#0D9926]/20">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="mt-2 inline-flex p-0.5 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[6px] text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setAdminRevenueMode('per_day')}
                  className={`px-2 py-0.5 rounded-[4px] transition-all ${
                    adminRevenueMode === 'per_day'
                      ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_1px_2px_rgba(0,0,0,0.08)]'
                      : 'text-[#60646C] hover:text-[#000000]'
                  }`}
                >
                  Per Day (Live)
                </button>
                <button
                  type="button"
                  onClick={() => setAdminRevenueMode('overall')}
                  className={`px-2 py-0.5 rounded-[4px] transition-all ${
                    adminRevenueMode === 'overall'
                      ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_1px_2px_rgba(0,0,0,0.08)]'
                      : 'text-[#60646C] hover:text-[#000000]'
                  }`}
                >
                  Overall
                </button>
              </div>

              <div className="text-2xl font-mono font-medium text-[#000000] mt-2">
                {formatINR(adminRevenueMode === 'per_day' ? todayRevenue : overallRevenue)}
              </div>
            </div>

            <div className="pt-2 border-t border-[#F3F3F7] flex items-center justify-between text-[11px]">
              <div className="text-[#0D9926] font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {adminRevenueMode === 'per_day'
                  ? `${todayBills.length} settled tickets today`
                  : `Across ${overallBills.length} total tickets`}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-[10px] font-semibold text-[#006EF5] hover:underline"
              >
                Audit →
              </button>
            </div>
          </div>
        ) : (
          /* Staff View: Operational Vacant Tables metric instead of Total Revenue */
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between text-[#60646C]">
              <span className="text-xs font-semibold uppercase tracking-wider">Vacant Tables</span>
              <div className="w-8 h-8 rounded-[6px] bg-[#D1F4D2] text-[#0D9926] flex items-center justify-center border border-[#0D9926]/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-medium text-[#000000]">
              {availableTables.length} / {tables.length}
            </div>
            <div className="text-[11px] text-[#0D9926] font-semibold flex items-center gap-1">
              Ready for immediate game session
            </div>
          </div>
        )}

        {/* KPI 2: Live Playing Tables */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between text-[#60646C]">
            <span className="text-xs font-semibold uppercase tracking-wider">Occupied Tables</span>
            <div className="w-8 h-8 rounded-[6px] bg-[#FFA500]/15 text-[#FFA500] flex items-center justify-center border border-[#FFA500]/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-medium text-[#FF5900]">
            {occupiedTables.length} / {tables.length}
          </div>
          <div className="text-[11px] text-[#60646C]">
            {availableTables.length} tables vacant & ready
          </div>
        </div>

        {/* KPI 3: Kitchen KOT Tickets */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between text-[#60646C]">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending KOTs</span>
            <div className="w-8 h-8 rounded-[6px] bg-[#D5E8FB] text-[#006EF5] flex items-center justify-center border border-[#006EF5]/20">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-medium text-[#000000]">
            {activeKitchenOrders.length}
          </div>
          <div className="text-[11px] text-[#006EF5] font-semibold flex items-center justify-between">
            <span>In preparation</span>
            {activeKitchenOrders.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('kitchen')}
                className="hover:underline flex items-center text-[11px] font-semibold text-[#006EF5]"
              >
                View KOT <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* KPI 4: Registered Customer Base */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-6 space-y-2 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between text-[#60646C]">
            <span className="text-xs font-semibold uppercase tracking-wider">Club Members</span>
            <div className="w-8 h-8 rounded-[6px] bg-[#E6E2FF] text-[#3C16D5] flex items-center justify-center border border-[#3C16D5]/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-medium text-[#000000]">
            {customers.length}
          </div>
          <div className="text-[11px] text-[#60646C]">
            {customers.filter((c) => c.tier !== 'standard').length} VIP loyalty members
          </div>
        </div>
      </div>

      {/* Active Floor Plan Real-Time Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-medium text-[#000000]">
              Active Playing Floor
            </h3>
            <span className="text-[12px] font-mono text-[#60646C]">
              ({tables.length} Pool & Snooker Boards)
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('tables')}
            className="text-[14px] font-normal text-[#006EF5] hover:underline flex items-center gap-1 transition-colors"
          >
            Full Floor View <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onStartSession={(tbl) => setSessionModalTable(tbl)}
              onTransfer={(tbl) => setTransferModalTable(tbl)}
              onAddCafeOrder={() => onNavigate('cafe')}
              onSettleBill={(tbl) => setSettleModalTable(tbl)}
            />
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <StartSessionDialog
        table={sessionModalTable}
        isOpen={!!sessionModalTable}
        onClose={() => setSessionModalTable(null)}
      />

      <TransferTableModal
        sourceTable={transferModalTable}
        isOpen={!!transferModalTable}
        onClose={() => setTransferModalTable(null)}
      />

      <SettleBillModal
        table={settleModalTable}
        isOpen={!!settleModalTable}
        onClose={() => setSettleModalTable(null)}
      />

      <InvoiceReceipt
        bill={activeBillModal}
        isOpen={!!activeBillModal}
        onClose={() => setActiveBillModal(null)}
      />
    </div>
  );
};
