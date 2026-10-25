/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Delete, Lock } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 seconds lockout after 5 failed attempts

export const LoginScreen: React.FC = () => {
  const { loginWithPin, authError, clearError } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attempt tracking with sessionStorage resilience
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = sessionStorage.getItem('tcn_failed_attempts');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    const saved = sessionStorage.getItem('tcn_lockout_until');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Countdown timer for lockout
  useEffect(() => {
    const checkLockout = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        setSecondsRemaining(Math.ceil((lockoutUntil - now) / 1000));
      } else {
        setSecondsRemaining(0);
        if (lockoutUntil > 0) {
          // Lockout expired - reset attempts
          setLockoutUntil(0);
          setFailedAttempts(0);
          sessionStorage.removeItem('tcn_lockout_until');
          sessionStorage.removeItem('tcn_failed_attempts');
          clearError();
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil, clearError]);

  const isLocked = secondsRemaining > 0;

  const handleDigit = (digit: string) => {
    if (isLocked || isSubmitting) return;

    if (pin.length < 4) {
      clearError();
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        triggerLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (isLocked || isSubmitting) return;
    clearError();
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLocked || isSubmitting) return;
    clearError();
    setPin('');
  };

  const triggerLogin = (enteredPin: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const ok = loginWithPin(enteredPin);
      setIsSubmitting(false);

      if (ok) {
        // Success: reset attempts
        setFailedAttempts(0);
        setLockoutUntil(0);
        sessionStorage.removeItem('tcn_failed_attempts');
        sessionStorage.removeItem('tcn_lockout_until');
      } else {
        // Failed attempt
        setPin('');
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        sessionStorage.setItem('tcn_failed_attempts', nextAttempts.toString());

        if (nextAttempts >= MAX_ATTEMPTS) {
          const lockTime = Date.now() + LOCKOUT_DURATION_MS;
          setLockoutUntil(lockTime);
          sessionStorage.setItem('tcn_lockout_until', lockTime.toString());
        }
      }
    }, 200);
  };

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - failedAttempts);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F3F3F7] flex flex-col items-center justify-center p-3 sm:p-6 select-none font-sans relative overflow-y-auto">
      {/* Main Elevated Terminal Card */}
      <div className="relative z-10 w-full max-w-sm bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-5 sm:p-7 shadow-[0px_8px_24px_rgba(0,0,0,0.12)] flex flex-col items-center space-y-5 my-auto">
        {/* Arena Logo & Header */}
        <div className="flex flex-col items-center space-y-1.5 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[8px] bg-[#FF5900] text-white font-medium text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-[0px_2px_8px_rgba(255,89,0,0.3)]">
            TCN
          </div>
          <div>
            <h1 className="text-lg font-medium text-[#000000]">
              TCN Operations Suite
            </h1>
            <p className="text-xs text-[#60646C] mt-0.5">
              Enter your 4-digit terminal PIN to continue
            </p>
          </div>
        </div>

        {/* PIN Indicator Dots */}
        <div className="flex items-center justify-center gap-3.5 py-1">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#FF5900] shadow-[0_0_8px_rgba(255,89,0,0.5)] scale-110'
                    : 'bg-[#F3F3F7] border border-[#B9BBC6]'
                }`}
              />
            );
          })}
        </div>

        {/* Lockout Warning Banner */}
        {isLocked ? (
          <div className="w-full bg-[#FF3D00]/[0.12] border border-[#FF3D00]/30 rounded-[8px] p-3 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FF3D00]">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Terminal Locked (5 Failed Attempts)</span>
            </div>
            <p className="text-[11px] text-[#FF3D00]/90">
              Please wait <span className="font-mono font-bold text-sm">{secondsRemaining}s</span> before retrying.
            </p>
          </div>
        ) : (
          /* Error & Attempts Warning Alert */
          authError && (
            <div className="w-full bg-[#FF3D00]/[0.10] border border-[#FF3D00]/25 rounded-[6px] p-2.5 text-center space-y-0.5">
              <div className="text-xs font-medium text-[#FF3D00]">
                {authError}
              </div>
              {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
                <div className="text-[11px] font-semibold text-[#FF3D00]/80">
                  {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining before security lockout
                </div>
              )}
            </div>
          )
        )}

        {/* Numeric Keypad */}
        <div className="w-full grid grid-cols-3 gap-2 sm:gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLocked || isSubmitting}
              onClick={() => handleDigit(digit)}
              className="h-[48px] rounded-[6px] bg-[#FFFFFF] hover:bg-[#F3F3F7] active:bg-[#15191E]/[0.08] disabled:opacity-40 disabled:hover:bg-[#FFFFFF] text-[#15191E] text-lg font-medium transition-colors border border-[#B9BBC6] flex items-center justify-center select-none"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isLocked || isSubmitting || pin.length === 0}
            onClick={handleClear}
            className="h-[48px] rounded-[6px] bg-[#F3F3F7] hover:bg-[#FFFFFF] disabled:opacity-40 text-xs font-medium text-[#60646C] transition-colors border border-[#B9BBC6] flex items-center justify-center select-none"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isLocked || isSubmitting}
            onClick={() => handleDigit('0')}
            className="h-[48px] rounded-[6px] bg-[#FFFFFF] hover:bg-[#F3F3F7] active:bg-[#15191E]/[0.08] disabled:opacity-40 disabled:hover:bg-[#FFFFFF] text-[#15191E] text-lg font-medium transition-colors border border-[#B9BBC6] flex items-center justify-center select-none"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLocked || isSubmitting || pin.length === 0}
            onClick={handleDelete}
            className="h-[48px] rounded-[6px] bg-[#F3F3F7] hover:bg-[#FFFFFF] disabled:opacity-40 text-[#60646C] transition-colors border border-[#B9BBC6] flex items-center justify-center select-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Security Footer */}
        <div className="w-full pt-3 border-t border-[#B9BBC6]/60 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8B8D98] font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-[#FF5900]" />
            <span>Authorized staff & management terminal only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
