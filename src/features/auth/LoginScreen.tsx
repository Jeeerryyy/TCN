/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth.types';
import { Shield, Delete, Sparkles } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithPin, authError, clearError } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      clearError();
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto-submit on 4th digit
        triggerLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    clearError();
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    clearError();
    setPin('');
  };

  const triggerLogin = (enteredPin: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const ok = loginWithPin(enteredPin, selectedRole);
      setIsSubmitting(false);
      if (!ok) {
        setPin('');
      }
    }, 200);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F3F3F7] flex flex-col items-center justify-center p-3 sm:p-6 select-none font-sans relative overflow-y-auto">
      {/* Main Brex Elevated Card */}
      <div className="relative z-10 w-full max-w-md bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-5 sm:p-8 shadow-[0px_8px_24px_rgba(0,0,0,0.12)] flex flex-col items-center space-y-4 sm:space-y-6 my-auto">
        {/* Arena Logo & Header */}
        <div className="flex flex-col items-center space-y-1.5 sm:space-y-2 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[8px] bg-[#FF5900] text-white font-medium text-lg sm:text-xl flex items-center justify-center shrink-0">
            TCN
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-medium text-[#000000]">
              TCN Operations Suite
            </h1>
            <p className="text-[11px] sm:text-xs text-[#60646C] mt-0.5">
              Secure Terminal Access for Arena Staff & Management
            </p>
          </div>
        </div>

        {/* Brex Segmented Role Selector */}
        <div className="w-full bg-[#F3F3F7] border border-[#B9BBC6] p-1 rounded-[6px] grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('staff');
              clearError();
              setPin('');
            }}
            className={`h-[40px] sm:h-[36px] rounded-[4px] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
              selectedRole === 'staff'
                ? 'bg-[#FFFFFF] text-[#0D9926] shadow-[0px_2px_8px_rgba(0,0,0,0.08)]'
                : 'text-[#60646C] hover:text-[#15191E]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0D9926]" />
            Staff (Floor)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin');
              clearError();
              setPin('');
            }}
            className={`h-[40px] sm:h-[36px] rounded-[4px] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
              selectedRole === 'admin'
                ? 'bg-[#FFFFFF] text-[#FF5900] shadow-[0px_2px_8px_rgba(0,0,0,0.08)]'
                : 'text-[#60646C] hover:text-[#15191E]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#FF5900]" />
            Admin (Manager)
          </button>
        </div>

        {/* PIN Indicator Dots */}
        <div className="flex items-center justify-center gap-3.5 sm:gap-4 py-1 sm:py-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-colors ${
                  isFilled
                    ? selectedRole === 'admin'
                      ? 'bg-[#FF5900]'
                      : 'bg-[#0D9926]'
                    : 'bg-[#F3F3F7] border border-[#B9BBC6]'
                }`}
              />
            );
          })}
        </div>

        {/* Error message alert */}
        {authError && (
          <div className="w-full bg-[#FF3D00]/[0.12] border border-[#FF3D00]/25 rounded-[6px] p-2.5 sm:p-3 text-center text-xs font-medium text-[#FF3D00]">
            {authError}
          </div>
        )}

        {/* Keypad */}
        <div className="w-full grid grid-cols-3 gap-2 sm:gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit(digit)}
              className="h-[46px] sm:h-[48px] rounded-[6px] bg-[#FFFFFF] hover:bg-[#F3F3F7] active:bg-[#15191E]/[0.08] text-[#15191E] text-base font-normal transition-colors border border-[#B9BBC6] flex items-center justify-center select-none"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleClear}
            className="h-[46px] sm:h-[48px] rounded-[6px] bg-[#F3F3F7] hover:bg-[#FFFFFF] text-xs font-normal text-[#60646C] transition-colors border border-[#B9BBC6] flex items-center justify-center select-none"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigit('0')}
            className="h-[46px] sm:h-[48px] rounded-[6px] bg-[#FFFFFF] hover:bg-[#F3F3F7] active:bg-[#15191E]/[0.08] text-[#15191E] text-base font-normal transition-colors border border-[#B9BBC6] flex items-center justify-center select-none"
          >
            0
          </button>
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleDelete}
            className="h-[46px] sm:h-[48px] rounded-[6px] bg-[#F3F3F7] hover:bg-[#FFFFFF] text-[#60646C] transition-colors border border-[#B9BBC6] flex items-center justify-center select-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Terminal Access Instruction */}
        <div className="w-full pt-3 sm:pt-4 border-t border-[#B9BBC6] text-center space-y-1">
          <div className="text-xs text-[#60646C] font-medium">
            Enter your 4-digit terminal PIN to continue
          </div>
          <div className="text-[11px] text-[#8B8D98] font-mono">
            {selectedRole === 'admin' ? 'Terminal Pass: 8888 (Admin)' : 'Terminal Pass: 1234 (Staff)'}
          </div>
        </div>
      </div>
    </div>
  );
};
