/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, UserCheck, Lock, Menu, X } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useTables } from '../../context/TableContext';
import { useCafe } from '../../context/CafeContext';
import { useAuth } from '../../context/AuthContext';

interface SystemHeaderProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const SystemHeader: React.FC<SystemHeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { tables } = useTables();
  const { activeKitchenOrders } = useCafe();
  const { currentUser, role, isAdmin, logout } = useAuth();
  const [timeString, setTimeString] = useState('');

  // Clock updates every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  return (
    <header className="sticky top-0 z-[1000] h-[60px] bg-[#FFFFFF] border-b border-[#B9BBC6] px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] select-none">
      {/* Left: Branding & Status (Brex Action Orange Accent) */}
      <div className="flex items-center gap-2 sm:gap-4">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 -ml-1 rounded-[6px] text-[#15191E] hover:bg-[#15191E]/[0.08] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#FF5900] text-white font-medium text-xs flex items-center justify-center shrink-0">
            TCN
          </div>
          <div>
            <span className="text-xs sm:text-sm font-medium text-[#15191E] tracking-tight">OPERATIONS SUITE</span>
            <span className="hidden sm:inline text-[11px] text-[#60646C] ml-2 font-mono">v2.4</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#B9BBC6]">
          <Badge variant={occupiedCount > 0 ? 'rose' : 'emerald'} dot size="sm">
            {occupiedCount} / {tables.length} Tables Active
          </Badge>
          {activeKitchenOrders.length > 0 && (
            <Badge variant="amber" dot size="sm">
              {activeKitchenOrders.length} Kitchen KOTs
            </Badge>
          )}
        </div>
      </div>

      {/* Right: Live Clock, Authenticated Operator Badge, and Lock Terminal Action */}
      <div className="flex items-center gap-4">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#15191E] bg-[#F3F3F7] border border-[#B9BBC6] px-3 py-1.5 rounded-[6px]">
          <Clock className="w-3.5 h-3.5 text-[#FF5900]" />
          <span>{timeString}</span>
        </div>

        {/* User Identity Profile */}
        <div className="flex items-center gap-2 pl-4 border-l border-[#B9BBC6]">
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-medium ${
              isAdmin
                ? 'bg-[#FF5900]/15 text-[#FF5900] border-[#FF5900]/30'
                : 'bg-[#D1F4D2] text-[#0D9926] border-[#0D9926]/30'
            }`}
          >
            {currentUser?.initials || 'OP'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-medium text-[#15191E] leading-tight flex items-center gap-1.5">
              <span>{currentUser?.name || 'Operator'}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-[4px] font-semibold uppercase ${
                  isAdmin ? 'bg-[#FF5900]/15 text-[#FF5900]' : 'bg-[#D1F4D2] text-[#0D9926]'
                }`}
              >
                {role || 'Staff'}
              </span>
            </div>
            <div className="text-[11px] text-[#60646C] flex items-center gap-1">
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-[#FF5900]" /> {currentUser?.designation}
                </>
              ) : (
                <>
                  <UserCheck className="w-3 h-3 text-[#0D9926]" /> {currentUser?.designation}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lock Terminal / Logout Button */}
        <button
          type="button"
          onClick={logout}
          title="Lock Terminal"
          className="h-[36px] px-3 rounded-[6px] bg-[#FFFFFF] hover:bg-[#15191E]/[0.08] text-[#60646C] hover:text-[#FF3D00] text-xs font-normal transition-colors flex items-center gap-1.5 border border-[#B9BBC6]"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lock</span>
        </button>
      </div>
    </header>
  );
};
