/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState } from 'react';
import { SystemHeader } from './SystemHeader';
import { SidebarNav, ActiveNavTab } from './SidebarNav';
import { LayoutDashboard, Grid, Coffee, ChefHat, Menu } from 'lucide-react';
import { useCafe } from '../../context/CafeContext';
import { useTables } from '../../context/TableContext';

interface MainLayoutProps {
  currentTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { activeKitchenOrders } = useCafe();
  const { activeSessionsMap } = useTables();
  const activeTablesCount = Object.keys(activeSessionsMap).length;

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-screen overflow-hidden bg-[#F3F3F7] text-[#15191E]">
      {/* Top Header */}
      <SystemHeader
        onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
        isMobileMenuOpen={isMobileNavOpen}
      />

      {/* Main Body with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarNav
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />
        <main className="flex-1 overflow-y-auto bg-[#F3F3F7] p-3 sm:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Apple iOS Bottom Navigation Bar for Mobile */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-[56px] pb-[max(env(safe-area-inset-bottom),0px)] bg-[#FFFFFF] border-t border-[#B9BBC6] flex justify-around items-center z-40 select-none shadow-[0px_-2px_8px_rgba(0,0,0,0.06)]"
      >
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
            currentTab === 'dashboard' ? 'text-[#FF5900]' : 'text-[#60646C]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Floor</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('tables')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] relative transition-colors ${
            currentTab === 'tables' ? 'text-[#FF5900]' : 'text-[#60646C]'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Tables</span>
          {activeTablesCount > 0 && (
            <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-[#0D9926]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('cafe')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
            currentTab === 'cafe' ? 'text-[#FF5900]' : 'text-[#60646C]'
          }`}
        >
          <Coffee className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Café</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('kitchen')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] relative transition-colors ${
            currentTab === 'kitchen' ? 'text-[#FF5900]' : 'text-[#60646C]'
          }`}
        >
          <ChefHat className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Kitchen</span>
          {activeKitchenOrders.length > 0 && (
            <span className="absolute top-1.5 right-1/4 min-w-[14px] h-[14px] px-1 text-[8px] font-mono font-bold text-white bg-[#FF5900] rounded-full flex items-center justify-center">
              {activeKitchenOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
            isMobileNavOpen ? 'text-[#FF5900]' : 'text-[#60646C]'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">More</span>
        </button>
      </nav>
    </div>
  );
};

