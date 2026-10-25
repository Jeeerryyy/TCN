/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

export type UserRole = 'admin' | 'staff';

export interface StaffUser {
  id: string;
  name: string;
  initials: string;
  role: UserRole;
  designation: string;
  shift: string;
  pin: string; // 4-digit PIN for quick floor authentication
  username?: string;
}

export interface AuthContextType {
  currentUser: StaffUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  loginWithPin: (pin: string, expectedRole?: UserRole) => boolean;
  loginWithCredentials: (role: UserRole, secret: string) => boolean;
  logout: () => void;
  authError: string | null;
  clearError: () => void;
}
