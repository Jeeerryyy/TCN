/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { MenuCatalog } from './MenuCatalog';
import { OrderCart } from './OrderCart';
import { Coffee, ShoppingBag, ArrowRight, Utensils, Receipt, Phone, User, CheckCircle2 } from 'lucide-react';
import { useCafe } from '../../context/CafeContext';
import { useBilling } from '../../context/BillingContext';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { CafePOSSkeleton } from '../../components/ui/Skeleton';
import { SettleCafeBillModal } from './SettleCafeBillModal';
import { InvoiceReceipt } from '../billing/InvoiceReceipt';
import { CafeOrder } from '../../types/cafe.types';
import { Badge } from '../../components/ui/Badge';

export const CafePOS: React.FC = () => {
  const { cart, menu, orders, isLoading } = useCafe();
  const { activeBillModal, setActiveBillModal } = useBilling();
  
  const [activeView, setActiveView] = useState<'catalog' | 'active-bills'>('catalog');
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [orderToSettle, setOrderToSettle] = useState<CafeOrder | null>(null);

  if (isLoading && menu.length === 0) {
    return <CafePOSSkeleton />;
  }

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Unbilled standalone orders for customers ordering ONLY snacks & drinks
  const unbilledStandaloneOrders = orders.filter(
    (o) => !o.isBilled && o.status !== 'cancelled' && (o.destination === 'counter' || o.destination === 'takeaway' || !o.tableId)
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 lg:pb-0">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-medium text-[#000000] flex items-center gap-2">
            <Coffee className="w-5 h-5 text-[#FF5900]" /> Snacks & Drinks POS
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Order food & beverages separately for walk-in lounge customers, or link tabs to playing tables
          </p>
        </div>

        {/* View Switcher: Menu Catalog vs Active Standalone Orders */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] p-1 rounded-[8px] flex items-center gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setActiveView('catalog');
                setMobileTab('catalog');
              }}
              className={`py-1.5 px-3 text-xs font-medium rounded-[5px] flex items-center gap-1.5 transition-colors ${
                activeView === 'catalog'
                  ? 'bg-[#FF5900] text-white shadow-sm'
                  : 'text-[#60646C] hover:text-[#15191E]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Menu Catalog</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('active-bills');
                setMobileTab('catalog');
              }}
              className={`py-1.5 px-3 text-xs font-medium rounded-[5px] flex items-center gap-1.5 transition-colors ${
                activeView === 'active-bills'
                  ? 'bg-[#FF5900] text-white shadow-sm'
                  : 'text-[#60646C] hover:text-[#15191E]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Active Standalone Bills</span>
              {unbilledStandaloneOrders.length > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeView === 'active-bills' ? 'bg-white text-[#FF5900]' : 'bg-[#FF5900] text-white'
                  }`}
                >
                  {unbilledStandaloneOrders.length}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Tab Toggle (visible on < lg screens) */}
          <div className="lg:hidden flex bg-[#FFFFFF] border border-[#B9BBC6] p-1 rounded-[6px]">
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={`py-1.5 px-3 text-xs font-medium rounded-[4px] flex items-center justify-center gap-1.5 transition-colors ${
                mobileTab === 'cart'
                  ? 'bg-[#FF5900] text-white shadow-sm'
                  : 'text-[#60646C] hover:text-[#15191E]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Order Cart ({cartItemCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {/* Left: Either Menu Catalog OR Active Standalone Bills */}
        <div className={`lg:col-span-2 xl:col-span-3 ${mobileTab === 'cart' ? 'hidden lg:block' : 'block'}`}>
          {activeView === 'catalog' ? (
            <MenuCatalog />
          ) : (
            /* Active Standalone Bills View */
            <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-5 sm:p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#B9BBC6]">
                <div>
                  <h3 className="text-base font-semibold text-[#000000] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#FF5900]" /> Active Standalone Café Orders
                  </h3>
                  <p className="text-xs text-[#60646C] mt-0.5">
                    Orders for guests who just ordered drinks & snacks without a game table. Click "Generate Bill" to settle and print.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#F3F3F7] border border-[#B9BBC6] rounded-[4px]">
                  {unbilledStandaloneOrders.length} unbilled
                </span>
              </div>

              {unbilledStandaloneOrders.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[#8B8D98]">
                  <CheckCircle2 className="w-10 h-10 text-[#0D9926] stroke-1" />
                  <p className="text-sm font-medium text-[#15191E]">All standalone orders are settled!</p>
                  <p className="text-xs text-[#60646C] max-w-sm">
                    No open tabs for counter guests. Switch to Menu Catalog to take a new snacks & drinks order.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('catalog')}
                    className="mt-2 text-xs font-semibold text-[#FF5900] underline"
                  >
                    Open Menu Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unbilledStandaloneOrders.map((order) => {
                    const statusBadgeVariant =
                      order.status === 'ready'
                        ? 'emerald'
                        : order.status === 'cooking'
                        ? 'amber'
                        : order.status === 'served'
                        ? 'blue'
                        : 'slate';

                    return (
                      <div
                        key={order.id}
                        className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 flex flex-col justify-between space-y-3 shadow-sm hover:border-[#FF5900] transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#000000]">
                                  {order.orderNumber}
                                </span>
                                <Badge variant={statusBadgeVariant as any} size="sm">
                                  {order.status.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-[#15191E] font-medium mt-1">
                                <User className="w-3.5 h-3.5 text-[#FF5900]" />
                                <span>{order.customerName || 'Walk-in Guest'}</span>
                              </div>
                              {order.customerPhone && (
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#60646C]">
                                  <Phone className="w-3 h-3 text-[#8B8D98]" />
                                  <span>{order.customerPhone}</span>
                                </div>
                              )}
                            </div>

                            <span className="text-[10px] text-[#8B8D98] font-mono">
                              {formatDateTime(order.createdAt).split(',')[1]}
                            </span>
                          </div>

                          {/* Items List */}
                          <div className="bg-[#F3F3F7] rounded-[6px] p-2.5 space-y-1 text-xs">
                            {order.items.map((i, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[#15191E]">
                                <span>
                                  <strong className="font-mono text-[#000000]">{i.quantity}x</strong> {i.name}
                                </span>
                                <span className="font-mono text-[#60646C]">
                                  {formatINR(i.price * i.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Subtotal & Settlement Button */}
                        <div className="pt-2 border-t border-[#B9BBC6] flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-[#60646C] uppercase font-semibold">Payable</span>
                            <div className="text-base font-mono font-bold text-[#FF5900]">
                              {formatINR(order.subtotal)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setOrderToSettle(order)}
                            className="h-[36px] px-3.5 rounded-[6px] bg-[#FF5900] hover:bg-[#E64E00] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Generate Bill</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Order Cart & Checkout Drawer */}
        <div className={`lg:col-span-1 sticky top-6 ${mobileTab === 'catalog' ? 'hidden lg:block' : 'block'}`}>
          <OrderCart />
        </div>
      </div>

      {/* Mobile Sticky Floating Cart Bar (when viewing catalog on mobile and cart has items) */}
      {mobileTab === 'catalog' && cartItemCount > 0 && (
        <div className="lg:hidden fixed bottom-[72px] left-3 right-3 z-30">
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="w-full h-[48px] bg-[#FF5900] text-white rounded-[8px] px-4 flex items-center justify-between shadow-[0px_8px_20px_rgba(255,89,0,0.35)] font-medium text-xs sm:text-sm active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in cart</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span>{formatINR(cartTotal)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Standalone Cafe Bill Settlement Modal */}
      {orderToSettle && (
        <SettleCafeBillModal
          isOpen={!!orderToSettle}
          onClose={() => setOrderToSettle(null)}
          order={orderToSettle}
          onSuccess={() => setOrderToSettle(null)}
        />
      )}

      {/* Final Settled Thermal Invoice Receipt */}
      <InvoiceReceipt
        bill={activeBillModal}
        isOpen={!!activeBillModal}
        onClose={() => setActiveBillModal(null)}
      />
    </div>
  );
};


