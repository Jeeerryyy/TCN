/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useMemo } from 'react';
import { Table } from '../../types/table.types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useTables } from '../../context/TableContext';
import { useCafe } from '../../context/CafeContext';
import { calculateElapsedSeconds, calculateSessionCharge } from '../../utils/timer';
import { formatDurationHMS, formatINR, formatTimeOnly } from '../../utils/formatters';
import { Play, Pause, ArrowRightLeft, Utensils, CreditCard, User, AlertCircle } from 'lucide-react';

interface TableCardProps {
  table: Table;
  onStartSession: (table: Table) => void;
  onTransfer: (table: Table) => void;
  onAddCafeOrder: (table: Table) => void;
  onSettleBill: (table: Table) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onStartSession,
  onTransfer,
  onAddCafeOrder,
  onSettleBill,
}) => {
  const { activeSessionsMap, pauseSession, resumeSession, tickCounter, sessions } = useTables();
  const { orders } = useCafe();

  const session = activeSessionsMap[table.id];

  // Most recent completed session for this table (provides proof even after settlement)
  const lastCompletedSession = useMemo(() => {
    if (session) return null;
    return sessions.find((s) => s.tableId === table.id && s.status === 'completed') || null;
  }, [session, sessions, table.id]);

  // Dynamic recalculation triggered by tickCounter
  const { elapsedSeconds, liveCharge, billedHours } = useMemo(() => {
    if (!session) return { elapsedSeconds: 0, liveCharge: 0, billedHours: 0 };
    const secs = calculateElapsedSeconds(session);
    const { billedHours, amount } = calculateSessionCharge(secs, session.ratePerHour, table.minMinutes);
    return { elapsedSeconds: secs, liveCharge: amount, billedHours };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tickCounter, table.minMinutes]);

  // Total linked cafe items for this table
  const linkedCafeOrders = orders.filter((o) => session?.linkedCafeOrderIds?.includes(o.id));
  const cafeTotal = linkedCafeOrders.reduce((sum, o) => sum + o.subtotal, 0);

  const isSnooker = table.type === 'snooker';

  return (
    <div
      className={`relative flex flex-col rounded-[8px] border transition-colors duration-150 overflow-hidden ${
        table.status === 'occupied'
          ? 'bg-[#FFFFFF] border-[#FF3D00] shadow-[0px_4px_16px_rgba(255,61,0,0.12)]'
          : table.status === 'paused'
          ? 'bg-[#FFFFFF] border-[#FFA500] shadow-[0px_2px_8px_rgba(0,0,0,0.08)]'
          : table.status === 'maintenance'
          ? 'bg-[#F3F3F7] border-[#B9BBC6] opacity-70'
          : 'bg-[#FFFFFF] border-[#B9BBC6] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] hover:border-[#15191E]'
      }`}
    >
      {/* Table Header Bar (Brex padding: px-4 py-3 = 16px/12px) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#B9BBC6] bg-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-[6px] flex items-center justify-center font-bold text-xs ${
              isSnooker
                ? 'bg-[#D5E8FB] text-[#006EF5] border border-[#006EF5]/20'
                : 'bg-[#FF5900]/15 text-[#FF5900] border border-[#FF5900]/30'
            }`}
          >
            {table.shortCode}
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#000000]">
              {table.name}
            </h4>
            <span className="text-[11px] text-[#60646C] font-mono">
              {table.size} · {formatINR(table.ratePerHour)}/hr
            </span>
          </div>
        </div>

        {/* Brex Status Chip */}
        <div>
          {table.status === 'available' && (
            <Badge variant="emerald" dot size="sm">Available</Badge>
          )}
          {table.status === 'occupied' && (
            <Badge variant="rose" dot size="sm">Live Game</Badge>
          )}
          {table.status === 'paused' && (
            <Badge variant="amber" dot size="sm">Paused</Badge>
          )}
          {table.status === 'maintenance' && (
            <Badge variant="slate" size="sm">Maintenance</Badge>
          )}
        </div>
      </div>

      {/* Main Card Body (Brex 16px padding: p-4) */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Top-Down Pool Table Visual Representation (6px radius, Brex border) */}
          <div className="relative w-full h-36 rounded-[6px] overflow-hidden bg-[#F3F3F7] border border-[#B9BBC6] flex items-center justify-center">
            <img
              src="/pool-table.png"
              alt={table.name}
              className="w-full h-full object-contain filter select-none"
            />

            {/* Bold TAKEN / NOT TAKEN Status Overlay (Toggles between Brex Green #0D9926 & Error Red #FF3D00) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {table.status === 'occupied' && (
                <span className="px-4 py-1.5 rounded-[6px] bg-[#FFFFFF] border-2 border-[#FF3D00] text-[#FF3D00] font-bold text-xs tracking-wider shadow-[0px_2px_8px_rgba(255,61,0,0.25)] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF3D00]"></span>
                  TAKEN
                </span>
              )}
              {table.status === 'available' && (
                <span className="px-4 py-1.5 rounded-[6px] bg-[#FFFFFF] border-2 border-[#0D9926] text-[#0D9926] font-bold text-xs tracking-wider shadow-[0px_2px_8px_rgba(13,153,38,0.25)] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0D9926]"></span>
                  NOT TAKEN
                </span>
              )}
              {table.status === 'paused' && (
                <span className="px-4 py-1.5 rounded-[6px] bg-[#FFFFFF] border-2 border-[#FFA500] text-[#CC8400] font-bold text-xs tracking-wider shadow-[0px_2px_8px_rgba(255,165,0,0.25)] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFA500]"></span>
                  PAUSED
                </span>
              )}
              {table.status === 'maintenance' && (
                <span className="px-4 py-1.5 rounded-[6px] bg-[#FFFFFF] border-2 border-[#8B8D98] text-[#8B8D98] font-bold text-xs tracking-wider shadow-sm uppercase flex items-center gap-2">
                  MAINTENANCE
                </span>
              )}
            </div>
          </div>

          {session ? (
            /* Live Session Info Box (Brex Container Light: 6px radius, border #B9BBC6) */
            <div className="space-y-3">
              <div className="bg-[#F3F3F7] rounded-[6px] p-3 border border-[#B9BBC6] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-[#60646C] tracking-wider">
                      Duration ({billedHours}h billed)
                    </div>
                    <div className="text-xl font-mono font-medium text-[#000000] mt-0.5">
                      {formatDurationHMS(elapsedSeconds)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-[#60646C] tracking-wider">
                      Running Tab
                    </div>
                    <div className="text-xl font-mono font-medium text-[#FF5900] mt-0.5">
                      {formatINR(liveCharge + cafeTotal)}
                    </div>
                    {cafeTotal > 0 && (
                      <div className="text-[10px] text-[#60646C] font-medium">
                        Incl. {formatINR(cafeTotal)} café
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Timings Proof: Start Time & End Time */}
                <div className="pt-2 border-t border-[#B9BBC6] flex items-center justify-between text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-semibold text-[#60646C] tracking-wider">
                      Start Time
                    </span>
                    <span className="font-semibold text-[#15191E] text-[12px]">
                      {formatTimeOnly(session.startTime)}
                    </span>
                  </div>

                  <div className="h-6 w-px bg-[#B9BBC6]" />

                  <div className="flex flex-col text-right">
                    <span className="text-[9px] uppercase font-semibold text-[#60646C] tracking-wider">
                      End Time
                    </span>
                    <span className="font-semibold text-[12px]">
                      {session.endTime ? (
                        <span className="text-[#FF5900]">{formatTimeOnly(session.endTime)}</span>
                      ) : session.status === 'paused' && session.pausedAt ? (
                        <span className="text-[#FF5900]">Paused ({formatTimeOnly(session.pausedAt)})</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#0D9926]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0D9926] animate-pulse"></span>
                          In Progress
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Players & Notes */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-[#15191E] font-medium truncate">
                  <User className="w-3.5 h-3.5 text-[#60646C] shrink-0" />
                  <span className="truncate">{session.primaryCustomerName}</span>
                  {session.playersCount > 1 && (
                    <span className="text-[11px] text-[#60646C]">+{session.playersCount - 1} more</span>
                  )}
                </div>
                {session.notes && (
                  <p className="text-[11px] text-[#60646C] italic truncate pl-5">
                    "{session.notes}"
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Vacant Table Info */
            <div className="py-2 text-center space-y-1">
              <p className="text-xs text-[#15191E] font-medium">Table ready for session</p>
              <p className="text-[11px] text-[#60646C] font-mono">Cloth: {table.clothColor}</p>
              {lastCompletedSession && (
                <div className="mt-1.5 pt-1.5 border-t border-[#B9BBC6]/60 text-[11px] font-mono text-[#60646C] bg-[#F3F3F7] rounded-[6px] p-2 text-left">
                  <div className="text-[9px] uppercase font-semibold text-[#8B8D98] tracking-wider mb-0.5">
                    Previous Session Proof ({lastCompletedSession.primaryCustomerName})
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Start: <strong className="text-[#15191E]">{formatTimeOnly(lastCompletedSession.startTime)}</strong></span>
                    <span>End: <strong className="text-[#15191E]">{formatTimeOnly(lastCompletedSession.endTime || lastCompletedSession.pausedAt)}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls (Brex 40px primary CTA + 31px secondary buttons) */}
        <div className="pt-3 border-t border-[#B9BBC6]">
          {session ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {session.status === 'active' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => pauseSession(table.id)}
                    icon={<Pause className="w-3.5 h-3.5 text-[#FFA500]" />}
                    title="Pause timer"
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => resumeSession(table.id)}
                    icon={<Play className="w-3.5 h-3.5 fill-white" />}
                    title="Resume timer"
                  >
                    Resume
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onAddCafeOrder(table)}
                  icon={<Utensils className="w-3.5 h-3.5 text-[#15191E]" />}
                  title="Add drinks or food to table tab"
                >
                  Café
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onTransfer(table)}
                  icon={<ArrowRightLeft className="w-3.5 h-3.5 text-[#15191E]" />}
                  title="Transfer game to another table"
                >
                  Shift
                </Button>
              </div>

              {/* Settle Bill Primary Action (Brex Action Orange #FF5900) */}
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => onSettleBill(table)}
                icon={<CreditCard className="w-4 h-4" />}
              >
                Settle & Print Bill
              </Button>
            </div>
          ) : table.status === 'maintenance' ? (
            <Button
              variant="secondary"
              size="md"
              className="w-full text-[#8B8D98]"
              disabled
              icon={<AlertCircle className="w-4 h-4" />}
            >
              Table Under Maintenance
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => onStartSession(table)}
              icon={<Play className="w-4 h-4 fill-white" />}
            >
              Start Game Session
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
