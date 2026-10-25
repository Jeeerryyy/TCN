/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

export const SecuritySettings: React.FC = () => {
  const { pins, updatePins, resetPinsToDefault, isAdmin } = useAuth();
  const { addToast } = useToast();

  // Visibility toggle for inspecting current active PINs
  const [showAdminCurrentPin, setShowAdminCurrentPin] = useState(false);
  const [showStaffCurrentPin, setShowStaffCurrentPin] = useState(false);

  // Form states
  const [currentAdminPin, setCurrentAdminPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmAdminPin, setConfirmAdminPin] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [confirmStaffPin, setConfirmStaffPin] = useState('');

  // Password visibility for form fields
  const [showNewAdminPin, setShowNewAdminPin] = useState(false);
  const [showNewStaffPin, setShowNewStaffPin] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin) {
    return (
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-12 text-center max-w-md mx-auto my-12 space-y-4 shadow-[0px_8px_24px_rgba(0,0,0,0.15)]">
        <div className="w-12 h-12 rounded-[6px] bg-[#FF3D00]/10 text-[#FF3D00] flex items-center justify-center mx-auto border border-[#FF3D00]/20">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-[16px] font-medium text-[#000000]">Executive Clearance Required</h3>
        <p className="text-[13px] text-[#60646C]">
          Only authenticated Administrators have permission to modify terminal passcodes.
        </p>
      </div>
    );
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Verify current admin PIN
      if (currentAdminPin.trim() !== pins.admin) {
        addToast({
          type: 'error',
          title: 'Authorization Failed',
          message: 'The current Admin PIN entered is incorrect.',
        });
        setIsSubmitting(false);
        return;
      }

      // Check if user specified any changes
      const willChangeAdmin = newAdminPin.trim().length > 0;
      const willChangeStaff = newStaffPin.trim().length > 0;

      if (!willChangeAdmin && !willChangeStaff) {
        addToast({
          type: 'warning',
          title: 'No Changes Specified',
          message: 'Please provide a new Admin PIN or new Staff PIN to update.',
        });
        setIsSubmitting(false);
        return;
      }

      // Validate Admin PIN if changing
      if (willChangeAdmin) {
        if (!/^\d{4}$/.test(newAdminPin.trim())) {
          addToast({
            type: 'error',
            title: 'Invalid Admin PIN',
            message: 'Admin PIN must be exactly 4 numeric digits (0-9).',
          });
          setIsSubmitting(false);
          return;
        }
        if (newAdminPin.trim() !== confirmAdminPin.trim()) {
          addToast({
            type: 'error',
            title: 'Admin PIN Mismatch',
            message: 'The new Admin PIN and confirmation do not match.',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Validate Staff PIN if changing
      if (willChangeStaff) {
        if (!/^\d{4}$/.test(newStaffPin.trim())) {
          addToast({
            type: 'error',
            title: 'Invalid Staff PIN',
            message: 'Staff PIN must be exactly 4 numeric digits (0-9).',
          });
          setIsSubmitting(false);
          return;
        }
        if (newStaffPin.trim() !== confirmStaffPin.trim()) {
          addToast({
            type: 'error',
            title: 'Staff PIN Mismatch',
            message: 'The new Staff PIN and confirmation do not match.',
          });
          setIsSubmitting(false);
          return;
        }
      }

      const targetAdmin = willChangeAdmin ? newAdminPin.trim() : pins.admin;
      const targetStaff = willChangeStaff ? newStaffPin.trim() : pins.staff;

      if (targetAdmin === targetStaff) {
        addToast({
          type: 'error',
          title: 'Security Conflict',
          message: 'Admin PIN and Staff PIN cannot be identical.',
        });
        setIsSubmitting(false);
        return;
      }

      const result = updatePins({ admin: targetAdmin, staff: targetStaff });

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Passcodes Updated',
          message: 'Terminal PINs updated successfully and saved to local storage.',
        });
        // Clear sensitive inputs
        setCurrentAdminPin('');
        setNewAdminPin('');
        setConfirmAdminPin('');
        setNewStaffPin('');
        setConfirmStaffPin('');
      } else {
        addToast({
          type: 'error',
          title: 'Update Error',
          message: result.error || 'Failed to update passcodes.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        'Are you sure you want to restore factory default PINs?\n\n• Admin PIN will reset to 8888\n• Staff PIN will reset to 1234'
      )
    ) {
      resetPinsToDefault();
      addToast({
        type: 'info',
        title: 'Factory Defaults Restored',
        message: 'Admin PIN is now 8888 and Staff PIN is now 1234.',
      });
      setCurrentAdminPin('');
      setNewAdminPin('');
      setConfirmAdminPin('');
      setNewStaffPin('');
      setConfirmStaffPin('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#B9BBC6] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#FF5900]/10 flex items-center justify-center text-[#FF5900] border border-[#FF5900]/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#000000] tracking-tight">
              Terminal Access & PIN Management
            </h1>
            <p className="text-[13px] text-[#60646C]">
              Configure 4-digit floor passcodes for quick terminal logins, switch shifts, and kiosk protection.
            </p>
          </div>
        </div>
        <Badge variant="emerald" className="self-start sm:self-auto flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin Clearance Verified
        </Badge>
      </div>

      {/* Active PINs Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Administrator Card */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-5 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#000000] text-[#FFFFFF] font-bold text-[14px] flex items-center justify-center shadow-sm">
                AD
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-[#000000]">Administrator</h3>
                  <Badge variant="slate" className="text-[11px] font-mono">
                    usr-admin-01
                  </Badge>
                </div>
                <p className="text-[12px] text-[#60646C]">General Operations & Management</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#008A00] bg-[#008A00]/10 px-2 py-0.5 rounded-full border border-[#008A00]/20">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>

          <div className="mt-5 pt-4 border-t border-[#EAEAEA] flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#60646C] font-semibold block">
                Current Terminal PIN
              </span>
              <span className="text-[20px] font-mono font-bold tracking-widest text-[#000000]">
                {showAdminCurrentPin ? pins.admin : '••••'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAdminCurrentPin(!showAdminCurrentPin)}
              className="px-3 py-1.5 rounded-[6px] border border-[#B9BBC6] text-[12px] font-medium text-[#303030] hover:bg-[#F3F3F5] transition-colors flex items-center gap-1.5"
            >
              {showAdminCurrentPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showAdminCurrentPin ? 'Hide PIN' : 'Reveal PIN'}
            </button>
          </div>
        </div>

        {/* Floor Staff Card */}
        <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-5 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF5900] text-[#FFFFFF] font-bold text-[14px] flex items-center justify-center shadow-sm">
                ST
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-[#000000]">Floor Staff</h3>
                  <Badge variant="slate" className="text-[11px] font-mono">
                    usr-staff-01
                  </Badge>
                </div>
                <p className="text-[12px] text-[#60646C]">Floor Operations, POS & KOTs</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#008A00] bg-[#008A00]/10 px-2 py-0.5 rounded-full border border-[#008A00]/20">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>

          <div className="mt-5 pt-4 border-t border-[#EAEAEA] flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#60646C] font-semibold block">
                Current Terminal PIN
              </span>
              <span className="text-[20px] font-mono font-bold tracking-widest text-[#000000]">
                {showStaffCurrentPin ? pins.staff : '••••'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowStaffCurrentPin(!showStaffCurrentPin)}
              className="px-3 py-1.5 rounded-[6px] border border-[#B9BBC6] text-[12px] font-medium text-[#303030] hover:bg-[#F3F3F5] transition-colors flex items-center gap-1.5"
            >
              {showStaffCurrentPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showStaffCurrentPin ? 'Hide PIN' : 'Reveal PIN'}
            </button>
          </div>
        </div>
      </div>

      {/* PIN Change Form */}
      <form onSubmit={handleUpdate} className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] space-y-6">
        <div>
          <h2 className="text-[16px] font-semibold text-[#000000]">Change Access Passcodes</h2>
          <p className="text-[13px] text-[#60646C]">
            Passcodes must contain exactly 4 numeric digits. For security, Administrator and Floor Staff cannot share identical PINs.
          </p>
        </div>

        {/* Current Admin Verification */}
        <div className="bg-[#F8F9FA] border border-[#B9BBC6] rounded-[8px] p-4">
          <label className="block text-[12px] font-semibold text-[#000000] uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#FF5900]" />
            Current Admin PIN (Verification Required) <span className="text-[#FF3D00]">*</span>
          </label>
          <p className="text-[12px] text-[#60646C] mb-2">
            Enter your existing Administrator passcode to authorize updates.
          </p>
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            value={currentAdminPin}
            onChange={(e) => setCurrentAdminPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            required
            className="w-full sm:w-64 px-3 py-2 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[16px] font-mono font-bold tracking-widest text-[#000000] focus:outline-none focus:border-[#FF5900] focus:ring-1 focus:ring-[#FF5900]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Admin PIN Block */}
          <div className="space-y-4 border border-[#EAEAEA] rounded-[8px] p-4 bg-[#FFFFFF]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[#000000] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#006EF5]" />
                New Administrator PIN
              </h3>
              <span className="text-[11px] text-[#60646C]">Optional if unchanged</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#303030] mb-1">
                  New 4-Digit Passcode
                </label>
                <div className="relative">
                  <input
                    type={showNewAdminPin ? 'text' : 'password'}
                    maxLength={4}
                    inputMode="numeric"
                    value={newAdminPin}
                    onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4 digits"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[15px] font-mono font-bold tracking-widest text-[#000000] focus:outline-none focus:border-[#FF5900] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewAdminPin(!showNewAdminPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#60646C] hover:text-[#000000]"
                  >
                    {showNewAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#303030] mb-1">
                  Confirm Administrator PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={confirmAdminPin}
                  onChange={(e) => setConfirmAdminPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter 4 digits"
                  disabled={newAdminPin.length === 0}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[15px] font-mono font-bold tracking-widest text-[#000000] focus:outline-none focus:border-[#FF5900] disabled:bg-[#F3F3F5] disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Staff PIN Block */}
          <div className="space-y-4 border border-[#EAEAEA] rounded-[8px] p-4 bg-[#FFFFFF]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[#000000] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#FF5900]" />
                New Floor Staff PIN
              </h3>
              <span className="text-[11px] text-[#60646C]">Optional if unchanged</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#303030] mb-1">
                  New 4-Digit Passcode
                </label>
                <div className="relative">
                  <input
                    type={showNewStaffPin ? 'text' : 'password'}
                    maxLength={4}
                    inputMode="numeric"
                    value={newStaffPin}
                    onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4 digits"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[15px] font-mono font-bold tracking-widest text-[#000000] focus:outline-none focus:border-[#FF5900] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStaffPin(!showNewStaffPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#60646C] hover:text-[#000000]"
                  >
                    {showNewStaffPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#303030] mb-1">
                  Confirm Floor Staff PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={confirmStaffPin}
                  onChange={(e) => setConfirmStaffPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter 4 digits"
                  disabled={newStaffPin.length === 0}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#B9BBC6] rounded-[6px] text-[15px] font-mono font-bold tracking-widest text-[#000000] focus:outline-none focus:border-[#FF5900] disabled:bg-[#F3F3F5] disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-[#EAEAEA] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-[#60646C]">
            Changes take effect immediately on this kiosk and persist across reloads.
          </p>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || currentAdminPin.length !== 4}
            className="w-full sm:w-auto bg-[#FF5900] hover:bg-[#E04F00] text-[#FFFFFF]"
          >
            <KeyRound className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving Passcodes...' : 'Save Updated Passcodes'}
          </Button>
        </div>
      </form>

      {/* Danger Zone: Factory Reset */}
      <div className="bg-[#FFFFFF] border border-[#FF3D00]/30 rounded-[10px] p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-[#FF3D00]/10 text-[#FF3D00] flex items-center justify-center shrink-0 border border-[#FF3D00]/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-[#000000]">Emergency Reset to Factory Defaults</h3>
            <p className="text-[13px] text-[#60646C] mt-0.5">
              If passcodes are forgotten or staff turnover occurs, this will revert Administrator to{' '}
              <strong className="text-[#000000] font-mono">8888</strong> and Floor Staff to{' '}
              <strong className="text-[#000000] font-mono">1234</strong>.
            </p>
          </div>
          <Button
            type="button"
            variant="danger"
            onClick={handleResetDefaults}
            className="shrink-0 text-[13px]"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Restore Defaults
          </Button>
        </div>
      </div>
    </div>
  );
};
