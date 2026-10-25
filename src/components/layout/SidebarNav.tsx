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
  Shield,
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
  | 'kitchen'
  | 'crm'
  | 'billing'
  | 'reports'
  | 'receipt-settings'
  | 'database';

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

  // Staff items (Floor Steward)
  const staffOperationalItems = [
    {
      id: 'dashboard' as const,
      label: 'Floor Command',
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
      label: 'Reservations',
      icon: Calendar,
      badge: activeBookingsCount > 0 ? activeBookingsCount : undefined,
    },
    {
      id: 'cafe' as const,
      label: 'Café & POS',
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
      label: 'Bill Settlement',
      icon: Receipt,
    },
  ];

  // Admin Operational Items
  const adminOperationalItems = [
    {
      id: 'dashboard' as const,
      label: 'Executive Command',
      icon: LayoutDashboard,
    },
    {
      id: 'tables' as const,
      label: 'Floor & Live Games',
      icon: Grid,
      badge: activeTablesCount > 0 ? activeTablesCount : undefined,
    },
    {
      id: 'bookings' as const,
      label: 'Advance Bookings',
      icon: Calendar,
      badge: activeBookingsCount > 0 ? activeBookingsCount : undefined,
    },
    {
      id: 'cafe' as const,
      label: 'Café & POS',
      icon: Coffee,
    },
    {
      id: 'kitchen' as const,
      label: 'Kitchen KOT',
      icon: ChefHat,
      badge: activeKitchenOrders.length > 0 ? activeKitchenOrders.length : undefined,
    },
  ];

  // Admin Management Items
  const adminManagementItems = [
    {
      id: 'table-studio' as const,
      label: 'Table Studio & Rates',
      icon: Sliders,
      adminBadge: true,
    },
    {
      id: 'crm' as const,
      label: 'Customer Loyalty CRM',
      icon: Users,
    },
    {
      id: 'billing' as const,
      label: 'Billing & Folios',
      icon: Receipt,
    },
    {
      id: 'reports' as const,
      label: 'Shift Revenue Audit',
      icon: BarChart3,
      adminBadge: true,
    },
    {
      id: 'receipt-settings' as const,
      label: 'Receipt Template',
      icon: Printer,
      adminBadge: true,
    },
    {
      id: 'database' as const,
      label: 'Cloud Database',
      icon: Database,
      adminBadge: true,
    },
  ];

  const navContent = (
    <>
      {/* Brex 8pt spacing: p-4 = 16px, space-y-4 = 16px */}
      <div className="p-4 flex-1 space-y-4 overflow-y-auto">
        {/* Operations Section */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
            <span>{isAdmin ? 'Arena Operations' : 'Floor Operations'}</span>
            <span className="text-[10px] font-mono text-[#60646C]">
              {isAdmin ? 'ADMIN' : 'STAFF'}
            </span>
          </div>

          {(isAdmin ? adminOperationalItems : staffOperationalItems).map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={clsx(
                  'w-full min-h-[44px] sm:min-h-[40px] flex items-center justify-between px-3.5 py-2 rounded-[6px] text-xs transition-colors duration-150',
                  isActive
                    ? 'bg-[#FF5900]/10 text-[#FF5900] font-medium border-l-[3px] border-[#FF5900]'
                    : 'text-[#15191E] font-normal hover:bg-[#15191E]/[0.08]'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-[#FF5900]' : 'text-[#60646C]')} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={clsx(
                      'text-[10px] px-2 py-0.5 rounded-[4px] font-semibold font-mono',
                      isActive ? 'bg-[#FF5900] text-white' : 'bg-[#F3F3F7] text-[#15191E] border border-[#B9BBC6]'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Administration Section (Admin Exclusive) */}
        {isAdmin && (
          <div className="space-y-1 pt-3 border-t border-[#B9BBC6]">
            <div className="text-[11px] font-semibold text-[#60646C] uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
              <span>Executive Management</span>
              <span className="text-[9px] text-[#FF5900] font-bold flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> PRIVILEGED
              </span>
            </div>
            {adminManagementItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={clsx(
                    'w-full min-h-[44px] sm:min-h-[40px] flex items-center justify-between px-3.5 py-2 rounded-[6px] text-xs transition-colors duration-150',
                    isActive
                      ? 'bg-[#FF5900]/10 text-[#FF5900] font-medium border-l-[3px] border-[#FF5900]'
                      : 'text-[#15191E] font-normal hover:bg-[#15191E]/[0.08]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-[#FF5900]' : 'text-[#60646C]')} />
                    <span>{item.label}</span>
                  </div>
                  {item.adminBadge && (
                    <span
                      className={clsx(
                        'text-[9px] px-1.5 py-0.5 rounded-[4px] font-semibold uppercase',
                        isActive
                          ? 'bg-[#FF5900] text-white'
                          : 'bg-[#FF5900]/15 text-[#FF5900]'
                      )}
                    >
                      Admin
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer User Profile & Lock Terminal Button */}
      <div className="p-4 border-t border-[#B9BBC6] bg-[#FCFCFD] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-medium ${
                isAdmin
                  ? 'bg-[#FF5900]/15 text-[#FF5900] border-[#FF5900]/30'
                  : 'bg-[#D1F4D2] text-[#0D9926] border-[#0D9926]/30'
              }`}
            >
              {currentUser?.initials || 'U'}
            </div>
            <div>
              <div className="text-xs font-medium text-[#15191E] truncate max-w-[110px]">
                {currentUser?.name || 'Authorized User'}
              </div>
              <div className="text-[10px] text-[#60646C] font-mono">
                {isAdmin ? 'General Manager' : 'Floor Steward'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Lock Terminal / Sign Out"
            className="p-2 rounded-[6px] hover:bg-[#15191E]/[0.08] text-[#60646C] hover:text-[#FF3D00] transition-colors"
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
      <aside className="hidden md:flex w-64 bg-[#FFFFFF] border-r border-[#B9BBC6] flex-col shrink-0 select-none z-10">
        {navContent}
      </aside>

      {/* Mobile Slide-Over Drawer for Apple & Touch devices */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-[1200] flex">
          {/* Backdrop with blur */}
          <div
            className="fixed inset-0 bg-[#000000]/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#FFFFFF] flex flex-col z-10 shadow-[0px_12px_32px_rgba(0,0,0,0.25)] border-r border-[#B9BBC6]">
            {/* Mobile Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#B9BBC6] bg-[#FFFFFF] shrink-0">
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
