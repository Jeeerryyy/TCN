/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  ...props
}) => {
  // Brex high-contrast minimalist interactive styling
  const baseStyles = 'inline-flex items-center justify-center font-normal select-none transition-colors duration-150 disabled:opacity-50 disabled:bg-[#B9BBC6] disabled:text-[#8B8D98] disabled:cursor-not-allowed focus:outline-none focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)]';

  const sizeStyles = {
    sm: 'h-[31px] min-h-[31px] text-xs px-3 gap-1.5 rounded-[6px]',
    md: 'h-[40px] min-h-[40px] text-sm px-4 gap-2 rounded-[8px]',
    lg: 'h-[48px] min-h-[48px] text-base px-6 gap-2.5 rounded-[8px]',
  };

  const variantStyles = {
    // Primary Action Orange (#FF5900)
    primary: 'bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white border border-[#42578A]/15 font-normal',
    // Secondary Transparent with #15191E stroke
    secondary: 'bg-transparent hover:bg-[#15191E]/[0.08] active:bg-[#15191E]/[0.15] text-[#15191E] border border-[#15191E] rounded-[6px]',
    // Accent Action Gold / Orange
    gold: 'bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white border border-[#42578A]/15 font-medium',
    // Destructive Bright Orange / Red (#FF3D00)
    danger: 'bg-[#FF3D00] hover:bg-[#E63500] active:bg-[#CC2F00] text-white font-normal rounded-[8px]',
    // Ghost Button (links)
    ghost: 'bg-transparent hover:text-[#006EF5] hover:underline text-[#15191E] px-0',
    // Standard Outline
    outline: 'bg-transparent border border-[#B9BBC6] text-[#15191E] hover:bg-[#15191E]/[0.08] rounded-[6px]',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
