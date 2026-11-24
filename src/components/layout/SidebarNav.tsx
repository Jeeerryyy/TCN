/* Brex Design System – High Contrast, Geometric Inter, Action Orange (#FF5900), Solid Surfaces */

import React from 'react';
import {
  LayoutDashboard,
  Grid,
  Sliders,
  Calendar,
  Coffee,
  ChefHat,
  Users,
  Receipt,
  BarChart3,
  Database,
  Printer,
  KeyRound,
  LogOut,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCafe } from '../../context/CafeContext';
import { useTables } from '../../context/TableContext';
import { useAuth } from '../../context/AuthContext';

export type ActiveNavTab =
  | 'dashboard'
  | 'tables'
  | 'table-studio'
  | 'bookings'
  | 'cafe'
  | 'cafe-studio'
  | 'kitchen'
  | 'crm'
  | 'billing'
  | 'reports'
  | 'receipt-settings'
  | 'database'
  | 'security';

interface SidebarNavProps {
  currentTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { activeKitchenOrders } = useCafe();
  const { activeSessionsMap, bookings } = useTables();
  const { currentUser, isAdmin, logout } = useAuth();

  const handleTabClick = (tab: ActiveNavTab) => {
    onSelectTab(tab);
    onCloseMobile?.();
  };

  const activeTablesCount = Object.keys(activeSessionsMap).length;
  const activeBookingsCount = bookings.filter((b) => b.status === 'confirmed').length;

  // 1. Daily Floor Operations (Used every shift by Staff & Admin)
  const operationsItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'tables' as const,
      label: 'Floor & Tables',
      icon: Grid,
      badge: activeTablesCount > 0 ? activeTablesCount : undefined,
    },
    {
      id: 'bookings' as const,
      label: 'Bookings',
      icon: Calendar,
      badge: activeBookingsCount > 0 ? activeBookingsCount : undefined,
    },
    {
      id: 'cafe' as const,
      label: 'Café POS',
      icon: Coffee,
    },
    {
      id: 'kitchen' as const,
      label: 'Kitchen KOT',
      icon: ChefHat,
      badge: activeKitchenOrders.length > 0 ? activeKitchenOrders.length : undefined,
    },
    {
      id: 'billing' as const,
      label: 'Billing & History',
      icon: Receipt,
    },
  ];

  // 2. Executive Management & Business Setup (Admin Only)
  const managementItems = [
    {
      id: 'reports' as const,
      label: 'Revenue Reports',
      icon: BarChart3,
    },
    {
      id: 'crm' as const,
      label: 'Customers & VIP',
      icon: Users,
    },
    {
      id: 'table-studio' as const,
      label: 'Table Studio',
      icon: Sliders,
    },
    {
      id: 'cafe-studio' as const,
      label: 'Menu Studio',
      icon: Coffee,
    },
  ];

  // 3. System & Terminal Configuration (Admin Only)
  const settingsItems = [
    {
      id: 'receipt-settings' as const,
      label: 'Receipt Template',
      icon: Printer,
    },
    {
      id: 'database' as const,
      label: 'Cloud Database',
      icon: Database,
    },
    {
      id: 'security' as const,
      label: 'Security & PINs',
      icon: KeyRound,
    },
  ];

  const renderNavItem = (item: {
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleTabClick(item.id)}
        className={clsx(
          'w-full min-h-[38px] sm:min-h-[36px] flex items-center justify-between px-3 py-1.5 rounded-[6px] text-xs transition-colors duration-150',
          isActive
            ? 'bg-[#FF5900]/10 text-[#FF5900] font-semibold border-l-[3px] border-[#FF5900]'
            : 'text-[#15191E] font-normal hover:bg-[#15191E]/[0.06]'
        )}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-[#FF5900]' : 'text-[#60646C]')} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge !== undefined && (
          <span
            className={clsx(
              'text-[10px] px-1.5 py-0.5 rounded-[4px] font-semibold font-mono',
              isActive
                ? 'bg-[#FF5900] text-white'
                : 'bg-[#F3F3F7] text-[#15191E] border border-[#B9BBC6]'
            )}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const navContent = (
    <>
      <div className="p-3 sm:p-4 flex-1 space-y-4 overflow-y-auto">
        {/* Operations Section */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
            <span>Operations</span>
            <span className="text-[9px] font-mono text-[#8B8D98]">
              {isAdmin ? 'ADMIN' : 'STAFF'}
            </span>
          </div>
          {operationsItems.map(renderNavItem)}
        </div>

        {/* Management Section (Admin Only) */}
        {isAdmin && (
          <div className="space-y-0.5 pt-3 border-t border-[#B9BBC6]/50">
            <div className="text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider px-3 mb-1.5">
              <span>Management</span>
            </div>
            {managementItems.map(renderNavItem)}
          </div>
        )}

        {/* System Settings Section (Admin Only) */}
        {isAdmin && (
          <div className="space-y-0.5 pt-3 border-t border-[#B9BBC6]/50">
            <div className="text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider px-3 mb-1.5">
              <span>Settings</span>
            </div>
            {settingsItems.map(renderNavItem)}
          </div>
        )}
      </div>

      {/* Footer User Profile & Lock Terminal Button */}
      <div className="p-3.5 border-t border-[#B9BBC6] bg-[#FCFCFD] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${
                isAdmin
                  ? 'bg-[#FF5900]/15 text-[#FF5900] border-[#FF5900]/30'
                  : 'bg-[#D1F4D2] text-[#0D9926] border-[#0D9926]/30'
              }`}
            >
              {currentUser?.initials || (isAdmin ? 'A' : 'S')}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-[#15191E] truncate">
                {currentUser?.name || (isAdmin ? 'General Manager' : 'Floor Steward')}
              </div>
              <div className="text-[10px] text-[#60646C] font-mono">
                {isAdmin ? 'Admin Clearance' : 'Staff Mode'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Lock Terminal / Sign Out"
            className="p-1.5 rounded-[6px] hover:bg-[#15191E]/[0.08] text-[#60646C] hover:text-[#FF3D00] transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#FFFFFF] border-r border-[#B9BBC6] flex-col shrink-0 select-none z-10">
        {navContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-[1200] flex">
          <div
            className="fixed inset-0 bg-[#000000]/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          <aside className="relative w-64 max-w-[85vw] h-full bg-[#FFFFFF] flex flex-col z-10 shadow-[0px_12px_32px_rgba(0,0,0,0.25)] border-r border-[#B9BBC6]">
            <div className="flex items-center justify-between p-3.5 border-b border-[#B9BBC6] bg-[#FFFFFF] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[6px] bg-[#FF5900] text-white font-medium text-xs flex items-center justify-center">
                  TCN
                </div>
                <span className="text-xs font-semibold text-[#15191E]">Navigation Menu</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-[6px] hover:bg-[#15191E]/[0.08] text-[#60646C] hover:text-[#15191E] flex items-center justify-center transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
