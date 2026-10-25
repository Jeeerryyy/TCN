/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState } from 'react';
import { MenuCatalog } from './MenuCatalog';
import { OrderCart } from './OrderCart';
import { Coffee, ShoppingBag, ArrowRight, Utensils } from 'lucide-react';
import { useCafe } from '../../context/CafeContext';
import { formatINR } from '../../utils/formatters';

export const CafePOS: React.FC = () => {
  const { cart } = useCafe();
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 lg:pb-0">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-medium text-[#000000] flex items-center gap-2">
            <Coffee className="w-5 h-5 text-[#FF5900]" /> Café POS & Order Terminal
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Take food and beverage orders, link charges directly to playing tables, and dispatch KOT tickets
          </p>
        </div>

        {/* Mobile Tab Toggle (visible on < lg screens) */}
        <div className="lg:hidden flex bg-[#FFFFFF] border border-[#B9BBC6] p-1 rounded-[6px]">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-[4px] flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === 'catalog'
                ? 'bg-[#FF5900] text-white shadow-sm'
                : 'text-[#60646C] hover:text-[#15191E]'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Menu Catalog</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-[4px] flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === 'cart'
                ? 'bg-[#FF5900] text-white shadow-sm'
                : 'text-[#60646C] hover:text-[#15191E]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Order Cart</span>
            {cartItemCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  mobileTab === 'cart' ? 'bg-white text-[#FF5900]' : 'bg-[#FF5900] text-white'
                }`}
              >
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Layout: On mobile conditionally renders active tab; on desktop renders both side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {/* Left: Menu Catalog */}
        <div className={`lg:col-span-2 xl:col-span-3 ${mobileTab === 'cart' ? 'hidden lg:block' : 'block'}`}>
          <MenuCatalog />
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
    </div>
  );
};

