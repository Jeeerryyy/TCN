/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { Table } from '../../types/table.types';
import { TableCard } from './TableCard';
import { StartSessionDialog } from './StartSessionDialog';
import { TransferTableModal } from './TransferTableModal';
import { useTables } from '../../context/TableContext';
import { useCafe } from '../../context/CafeContext';
import { useBilling } from '../../context/BillingContext';
import { SettleBillModal } from '../billing/SettleBillModal';
import { InvoiceReceipt } from '../billing/InvoiceReceipt';
import { ManualNotebookEntryModal } from '../billing/ManualNotebookEntryModal';
import { CheckCircle2, Clock, Wrench, BookOpen } from 'lucide-react';
import { FloorPlanSkeleton } from '../../components/ui/Skeleton';

interface TableFloorPlanProps {
  onNavigateToCafePOS: (tableId?: string) => void;
}

export const TableFloorPlan: React.FC<TableFloorPlanProps> = ({ onNavigateToCafePOS }) => {
  const { tables, isLoading } = useTables();
  const { setSelectedTableId, setCartDestination } = useCafe();
  const { activeBillModal, setActiveBillModal } = useBilling();

  if (isLoading && tables.length === 0) {
    return <FloorPlanSkeleton />;
  }

  const [activeFilter, setActiveFilter] = useState<'all' | 'pool' | 'snooker'>('all');
  const [sessionModalTable, setSessionModalTable] = useState<Table | null>(null);
  const [transferModalTable, setTransferModalTable] = useState<Table | null>(null);
  const [settleModalTable, setSettleModalTable] = useState<Table | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Filtered list
  const filteredTables = tables.filter((t) => {
    if (activeFilter === 'all') return true;
    return t.type === activeFilter;
  });

  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const maintenanceCount = tables.filter((t) => t.status === 'maintenance').length;

  const handleAddCafeOrder = (table: Table) => {
    setSelectedTableId(table.id);
    setCartDestination('table');
    onNavigateToCafePOS(table.id);
  };

  return (
    <div className="space-y-6">
      {/* Floor Overview & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-medium text-[#000000]">Floor Management</h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Real-time table status, live game clocks, and active tabs across the arena
          </p>
        </div>

        {/* Quick Floor Status Bar with Brex semantic badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#D1F4D2] border border-[#0D9926]/20 px-2.5 sm:px-3 py-1.5 rounded-[6px] text-xs font-semibold text-[#0D9926]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9926]" /> {availableCount} Vacant
          </div>
          <div className="flex items-center gap-1.5 bg-[#FFA500]/15 border border-[#FFA500]/30 px-2.5 sm:px-3 py-1.5 rounded-[6px] text-xs font-semibold text-[#15191E]">
            <Clock className="w-3.5 h-3.5 text-[#FF5900]" /> {occupiedCount} Live Playing
          </div>
          {maintenanceCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#F3F3F7] border border-[#B9BBC6] px-2.5 sm:px-3 py-1.5 rounded-[6px] text-xs font-semibold text-[#60646C]">
              <Wrench className="w-3.5 h-3.5 text-[#60646C]" /> {maintenanceCount} Maintenance
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#B9BBC6] hover:bg-[#F3F3F7] px-2.5 sm:px-3 py-1.5 rounded-[6px] text-xs font-semibold text-[#15191E] transition-colors shadow-sm ml-auto"
            title="Log missed or handwritten session from notebook"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF5900]" />
            <span>+ Notebook Entry</span>
          </button>
        </div>
      </div>

      {/* Brex Segmented Control Filter Tabs */}
      <div className="flex items-center justify-between gap-4 pb-1 overflow-x-auto no-scrollbar max-w-full">
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] p-1 rounded-[8px] inline-flex gap-1 shrink-0 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
          {[
            { id: 'all', label: `All Tables (${tables.length})` },
            { id: 'pool', label: `Pool Tables (${tables.filter((t) => t.type === 'pool').length})` },
            { id: 'snooker', label: `Snooker Tables (${tables.filter((t) => t.type === 'snooker').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-[6px] text-xs whitespace-nowrap transition-colors duration-150 ${
                activeFilter === tab.id
                  ? 'bg-[#FF5900] text-[#FFFFFF] font-medium'
                  : 'text-[#60646C] hover:text-[#15191E] hover:bg-[#15191E]/[0.06] font-normal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tables (8pt grid: gap-6 = 24px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onStartSession={(tbl) => setSessionModalTable(tbl)}
            onTransfer={(tbl) => setTransferModalTable(tbl)}
            onAddCafeOrder={handleAddCafeOrder}
            onSettleBill={(tbl) => setSettleModalTable(tbl)}
          />
        ))}
      </div>

      {/* Start Session Dialog */}
      <StartSessionDialog
        table={sessionModalTable}
        isOpen={!!sessionModalTable}
        onClose={() => setSessionModalTable(null)}
      />

      {/* Transfer Table Modal */}
      <TransferTableModal
        sourceTable={transferModalTable}
        isOpen={!!transferModalTable}
        onClose={() => setTransferModalTable(null)}
      />

      {/* Settle Bill Modal */}
      <SettleBillModal
        table={settleModalTable}
        isOpen={!!settleModalTable}
        onClose={() => setSettleModalTable(null)}
      />

      {/* Final Settled Invoice / Receipt Modal */}
      <InvoiceReceipt
        bill={activeBillModal}
        isOpen={!!activeBillModal}
        onClose={() => setActiveBillModal(null)}
      />

      {/* Manual / Notebook Entry Modal */}
      <ManualNotebookEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  );
};
