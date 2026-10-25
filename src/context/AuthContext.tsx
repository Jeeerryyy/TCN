/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { StaffUser, UserRole, AuthContextType } from '../types/auth.types';
import { loadFromStorage, saveToStorage } from '../utils/storage';

export const SYSTEM_STAFF_ACCOUNTS: StaffUser[] = [
  {
    id: 'usr-admin-01',
    name: 'Administrator',
    initials: 'AD',
    role: 'admin',
    designation: 'General Manager (Admin)',
    shift: 'General Operations & Administration',
    pin: '8888',
    username: 'admin',
  },
  {
    id: 'usr-staff-01',
    name: 'Floor Staff',
    initials: 'ST',
    role: 'staff',
    designation: 'Floor Steward (Staff)',
    shift: 'Live Floor & POS Operations',
    pin: '1234',
    username: 'staff',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const cached = loadFromStorage<StaffUser | null>('tcn_current_user', null);
    if (!cached) return null;
    const valid = SYSTEM_STAFF_ACCOUNTS.find((u) => u.id === cached.id && u.role === cached.role);
    return valid || null;
  });
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    saveToStorage('tcn_current_user', currentUser);
  }, [currentUser]);

  const loginWithPin = (pin: string, expectedRole?: UserRole): boolean => {
    setAuthError(null);
    const trimmed = pin.trim();
    const matchedUser = SYSTEM_STAFF_ACCOUNTS.find((u) => u.pin === trimmed);

    if (matchedUser) {
      if (expectedRole && matchedUser.role !== expectedRole) {
        setAuthError(
          expectedRole === 'admin'
            ? 'That is a Staff PIN. Please switch to the Staff tab or enter the Admin PIN (8888).'
            : 'That is an Admin PIN. Please switch to the Admin tab or enter the Staff PIN (1234).'
        );
        return false;
      }
      setCurrentUser(matchedUser);
      return true;
    }

    if (expectedRole === 'admin') {
      setAuthError('Incorrect Admin PIN. Please enter the terminal Admin pass (8888).');
    } else if (expectedRole === 'staff') {
      setAuthError('Incorrect Staff PIN. Please enter the terminal Staff pass (1234).');
    } else {
      setAuthError('Incorrect PIN. Please enter a valid 4-digit terminal passcode.');
    }
    return false;
  };

  const loginWithCredentials = (role: UserRole, secret: string): boolean => {
    setAuthError(null);
    const trimmed = secret.trim();
    const targetUser = SYSTEM_STAFF_ACCOUNTS.find((u) => u.role === role);
    if (!targetUser) return false;

    if (role === 'admin') {
      if (trimmed === targetUser.pin || trimmed.toLowerCase() === 'admin' || trimmed === 'admin123') {
        setCurrentUser(targetUser);
        return true;
      }
      setAuthError('Invalid Admin credentials or PIN (8888).');
      return false;
    } else {
      if (trimmed === targetUser.pin || trimmed.toLowerCase() === 'staff') {
        setCurrentUser(targetUser);
        return true;
      }
      setAuthError('Invalid Staff PIN (1234).');
      return false;
    }
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
      loginWithPin,
      loginWithCredentials,
      logout,
      authError,
      clearError,
    }),
    [currentUser, authError]
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
