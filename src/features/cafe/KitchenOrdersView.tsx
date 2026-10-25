/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { useCafe } from '../../context/CafeContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/formatters';
import { ChefHat, CheckCircle2, Clock, Flame, BellRing } from 'lucide-react';
import { KitchenStatus } from '../../types/cafe.types';
import { KitchenOrdersSkeleton } from '../../components/ui/Skeleton';

export const KitchenOrdersView: React.FC = () => {
  const { orders, updateOrderStatus, isLoading } = useCafe();
  const [mobileStage, setMobileStage] = useState<KitchenStatus | 'all'>('all');

  if (isLoading && orders.length === 0) {
    return <KitchenOrdersSkeleton />;
  }

  const columns: { id: KitchenStatus; title: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'pending',
      title: 'New Tickets',
      icon: <BellRing className="w-4 h-4 text-[#FF5900]" />,
      color: 'bg-[#FFFFFF] border-[#B9BBC6]',
    },
    {
      id: 'cooking',
      title: 'Preparing',
      icon: <Flame className="w-4 h-4 text-[#FF5900]" />,
      color: 'bg-[#FFFFFF] border-[#B9BBC6]',
    },
    {
      id: 'ready',
      title: 'Ready for Service',
      icon: <CheckCircle2 className="w-4 h-4 text-[#0D9926]" />,
      color: 'bg-[#FFFFFF] border-[#B9BBC6]',
    },
    {
      id: 'served',
      title: 'Served to Guest',
      icon: <Clock className="w-4 h-4 text-[#60646C]" />,
      color: 'bg-[#F3F3F7] border-[#B9BBC6]',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-medium text-[#000000] flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-[#FF5900]" /> Kitchen Order Ticket (KOT) Display
        </h2>
        <p className="text-xs text-[#60646C] mt-0.5">
          Real-time kitchen display unit (KDU) for stewards and culinary team
        </p>
      </div>

      {/* Mobile Stage Selector */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
        <button
          type="button"
          onClick={() => setMobileStage('all')}
          className={`px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap transition-colors ${
            mobileStage === 'all'
              ? 'bg-[#FF5900] text-white'
              : 'bg-[#FFFFFF] text-[#15191E] border border-[#B9BBC6]'
          }`}
        >
          All Tickets ({orders.length})
        </button>
        {columns.map((col) => {
          const count = orders.filter((o) => o.status === col.id).length;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileStage(col.id)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap transition-colors ${
                mobileStage === col.id
                  ? 'bg-[#FF5900] text-white'
                  : 'bg-[#FFFFFF] text-[#15191E] border border-[#B9BBC6]'
              }`}
            >
              {col.title} ({count})
            </button>
          );
        })}
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 items-start">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id);
          const isVisibleOnMobile = mobileStage === 'all' || mobileStage === col.id;

          return (
            <div
              key={col.id}
              className={`border ${col.color} rounded-[8px] p-4 flex flex-col min-h-[400px] sm:min-h-[500px] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] ${
                isVisibleOnMobile ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#B9BBC6] px-1">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#15191E] uppercase tracking-wider">
                  {col.icon}
                  <span>{col.title}</span>
                </div>
                <span className="text-xs font-mono font-bold bg-[#F3F3F7] border border-[#B9BBC6] px-2 py-0.5 rounded-[6px] text-[#15191E]">
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1">
                {colOrders.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-center text-xs text-[#8B8D98]">
                    No tickets in this state
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-[#FCFCFD] border border-[#B9BBC6] rounded-[6px] p-4 space-y-3"
                    >
                      {/* Ticket Meta */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#000000] font-mono flex items-center gap-2">
                            <span>{order.orderNumber}</span>
                            {order.tableName ? (
                              <Badge variant="amber" size="sm">
                                {order.tableName}
                              </Badge>
                            ) : (
                              <Badge variant="slate" size="sm">
                                Takeaway
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-[#60646C] font-medium mt-0.5">
                            {order.customerName}
                          </div>
                        </div>

                        <span className="text-[10px] text-[#8B8D98] font-mono">
                          {formatDateTime(order.createdAt).split(',')[1]}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 py-2 border-y border-[#B9BBC6] text-xs">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start gap-2">
                            <span className="text-[#15191E]">
                              <strong className="font-mono mr-1">{item.quantity}x</strong>{' '}
                              {item.name}
                            </span>
                            {item.notes && (
                              <span className="text-[10px] text-[#006EF5] font-medium italic shrink-0">
                                ({item.notes})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Transition Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        {order.status === 'pending' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs font-normal"
                            onClick={() => updateOrderStatus(order.id, 'cooking')}
                          >
                            Start Cooking
                          </Button>
                        )}

                        {order.status === 'cooking' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs font-normal"
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                          >
                            Mark Ready
                          </Button>
                        )}

                        {order.status === 'ready' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs font-normal bg-[#0D9926] hover:bg-[#0D9926]/90 border-transparent text-white"
                            onClick={() => updateOrderStatus(order.id, 'served')}
                          >
                            Confirm Served
                          </Button>
                        )}

                        {order.status === 'served' && (
                          <div className="text-[11px] text-[#0D9926] font-semibold flex items-center justify-center w-full py-1">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#0D9926]" /> Served to table
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
