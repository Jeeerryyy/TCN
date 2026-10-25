/**
 * Staff and Authentication Context
 * Role-based controls for club floor stewards, managers, and POS cashiers.
 */

export type StaffRole = 'manager' | 'cashier' | 'floor_steward';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  shiftStartedAt: string;
}
