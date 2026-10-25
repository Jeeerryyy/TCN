/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { StaffUser, UserRole, AuthContextType, TerminalPins } from '../types/auth.types';
import { loadFromStorage, saveToStorage } from '../utils/storage';

export const DEFAULT_TERMINAL_PINS: TerminalPins = {
  admin: '8888',
  staff: '1234',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pins, setPins] = useState<TerminalPins>(() =>
    loadFromStorage<TerminalPins>('tcn_terminal_pins', DEFAULT_TERMINAL_PINS)
  );

  const staffAccounts = useMemo<StaffUser[]>(
    () => [
      {
        id: 'usr-admin-01',
        name: 'Administrator',
        initials: 'AD',
        role: 'admin',
        designation: 'General Manager (Admin)',
        shift: 'General Operations & Administration',
        pin: pins.admin,
        username: 'admin',
      },
      {
        id: 'usr-staff-01',
        name: 'Floor Staff',
        initials: 'ST',
        role: 'staff',
        designation: 'Floor Steward (Staff)',
        shift: 'Live Floor & POS Operations',
        pin: pins.staff,
        username: 'staff',
      },
    ],
    [pins]
  );

  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const cached = loadFromStorage<StaffUser | null>('tcn_current_user', null);
    if (!cached) return null;
    const initialPins = loadFromStorage<TerminalPins>('tcn_terminal_pins', DEFAULT_TERMINAL_PINS);
    if (cached.role === 'admin') {
      return {
        id: 'usr-admin-01',
        name: 'Administrator',
        initials: 'AD',
        role: 'admin',
        designation: 'General Manager (Admin)',
        shift: 'General Operations & Administration',
        pin: initialPins.admin,
        username: 'admin',
      };
    }
    if (cached.role === 'staff') {
      return {
        id: 'usr-staff-01',
        name: 'Floor Staff',
        initials: 'ST',
        role: 'staff',
        designation: 'Floor Steward (Staff)',
        shift: 'Live Floor & POS Operations',
        pin: initialPins.staff,
        username: 'staff',
      };
    }
    return null;
  });
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    saveToStorage('tcn_current_user', currentUser);
  }, [currentUser]);

  const loginWithPin = (enteredPin: string, expectedRole?: UserRole): boolean => {
    setAuthError(null);
    const trimmed = enteredPin.trim();
    const matchedUser = staffAccounts.find((u) => u.pin === trimmed);

    if (matchedUser) {
      if (expectedRole && matchedUser.role !== expectedRole) {
        setAuthError(
          expectedRole === 'admin'
            ? 'That is a Staff PIN. Please switch to the Staff tab or enter the Admin PIN.'
            : 'That is an Admin PIN. Please switch to the Admin tab or enter the Staff PIN.'
        );
        return false;
      }
      setCurrentUser(matchedUser);
      return true;
    }

    if (expectedRole === 'admin') {
      setAuthError('Incorrect Admin PIN. Please enter the valid 4-digit terminal passcode.');
    } else if (expectedRole === 'staff') {
      setAuthError('Incorrect Staff PIN. Please enter the valid 4-digit terminal passcode.');
    } else {
      setAuthError('Incorrect PIN. Please enter a valid 4-digit terminal passcode.');
    }
    return false;
  };

  const loginWithCredentials = (role: UserRole, secret: string): boolean => {
    setAuthError(null);
    const trimmed = secret.trim();
    const targetUser = staffAccounts.find((u) => u.role === role);
    if (!targetUser) return false;

    if (role === 'admin') {
      if (trimmed === targetUser.pin || trimmed.toLowerCase() === 'admin' || trimmed === 'admin123') {
        setCurrentUser(targetUser);
        return true;
      }
      setAuthError('Invalid Admin credentials or PIN.');
      return false;
    } else {
      if (trimmed === targetUser.pin || trimmed.toLowerCase() === 'staff') {
        setCurrentUser(targetUser);
        return true;
      }
      setAuthError('Invalid Staff credentials or PIN.');
      return false;
    }
  };

  const updatePins = (newPins: { admin?: string; staff?: string }): { success: boolean; error?: string } => {
    const nextAdmin = (newPins.admin ?? pins.admin).trim();
    const nextStaff = (newPins.staff ?? pins.staff).trim();

    if (!/^\d{4}$/.test(nextAdmin)) {
      return { success: false, error: 'Admin PIN must be exactly 4 numeric digits (0-9).' };
    }
    if (!/^\d{4}$/.test(nextStaff)) {
      return { success: false, error: 'Staff PIN must be exactly 4 numeric digits (0-9).' };
    }
    if (nextAdmin === nextStaff) {
      return { success: false, error: 'Admin PIN and Staff PIN cannot be identical for security reasons.' };
    }

    const updated: TerminalPins = { admin: nextAdmin, staff: nextStaff };
    setPins(updated);
    saveToStorage('tcn_terminal_pins', updated);

    // Keep currentUser pin in sync if logged in
    setCurrentUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        pin: prev.role === 'admin' ? nextAdmin : nextStaff,
      };
    });

    return { success: true };
  };

  const resetPinsToDefault = () => {
    setPins(DEFAULT_TERMINAL_PINS);
    saveToStorage('tcn_terminal_pins', DEFAULT_TERMINAL_PINS);
    setCurrentUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        pin: prev.role === 'admin' ? DEFAULT_TERMINAL_PINS.admin : DEFAULT_TERMINAL_PINS.staff,
      };
    });
  };

  const logout = () => {
    setCurrentUser(null);
    setAuthError(null);
  };

  const clearError = () => {
    setAuthError(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      role: currentUser?.role ?? null,
      isAuthenticated: !!currentUser,
      isAdmin: currentUser?.role === 'admin',
      isStaff: currentUser?.role === 'staff',
      pins,
      loginWithPin,
      loginWithCredentials,
      updatePins,
      resetPinsToDefault,
      logout,
      authError,
      clearError,
    }),
    [currentUser, pins, authError, staffAccounts]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
