/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'slate' | 'gold';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  dot = false,
  className,
}) => {
  // Brex semantic badges: 6px radius, bold 600 weight, 12px font
  const variantStyles = {
    // Success Green (#0D9926) on #D1F4D2
    emerald: 'bg-[#D1F4D2] text-[#0D9926] border border-[#0D9926]/20',
    // Warning Yellow / Orange (#FFA500)
    amber: 'bg-[#FFA500]/15 text-[#CC8400] border border-[#FFA500]/30',
    // Error / Destructive Orange-Red (#FF3D00)
    rose: 'bg-[#FF3D00]/[0.12] text-[#FF3D00] border border-[#FF3D00]/25',
    // Info Blue (#006EF5) on #D5E8FB
    blue: 'bg-[#D5E8FB] text-[#006EF5] border border-[#006EF5]/20',
    // Purple Highlight (#3C16D5) on #E6E2FF
    purple: 'bg-[#E6E2FF] text-[#3C16D5] border border-[#3C16D5]/20',
    // Neutral Slate (#60646C) on #F3F3F7
    slate: 'bg-[#F3F3F7] text-[#60646C] border border-[#B9BBC6]',
    // Action Orange Accent (#FF5900)
    gold: 'bg-[#FF5900]/15 text-[#FF5900] border border-[#FF5900]/30 font-semibold',
  };

  const dotColors = {
    emerald: 'bg-[#0D9926]',
    amber: 'bg-[#FFA500]',
    rose: 'bg-[#FF3D00]',
    blue: 'bg-[#006EF5]',
    purple: 'bg-[#3C16D5]',
    slate: 'bg-[#60646C]',
    gold: 'bg-[#FF5900]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-[6px] font-semibold',
    md: 'text-[12px] px-2.5 py-1 rounded-[6px] font-semibold',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5',
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
