import { Table, TableSession, TableBooking } from '../types/table.types';

// Clean Real Venue Table Setup: 6 Cue Tables (3 Pool, 3 Snooker)
export const INITIAL_TABLES: Table[] = [
  {
    id: 'tbl_p1',
    name: 'Pool Table 1',
    shortCode: 'P1',
    type: 'pool',
    size: '8 ft English Pool',
    clothColor: 'Tournament Green',
    ratePerHour: 240,
    minMinutes: 60,
    status: 'available',
    locationZone: 'Main Hall',
  },
  {
    id: 'tbl_p2',
    name: 'Pool Table 2',
    shortCode: 'P2',
    type: 'pool',
    size: '8 ft English Pool',
    clothColor: 'Tournament Green',
    ratePerHour: 240,
    minMinutes: 60,
    status: 'available',
    locationZone: 'Main Hall',
  },
  {
    id: 'tbl_p3',
    name: 'Pool Table 3',
    shortCode: 'P3',
    type: 'pool',
    size: '8 ft English Pool',
    clothColor: 'Tournament Green',
    ratePerHour: 240,
    minMinutes: 60,
    status: 'available',
    locationZone: 'VIP Arena',
  },
  {
    id: 'tbl_s1',
    name: 'Snooker Table 1',
    shortCode: 'S1',
    type: 'snooker',
    size: '12 ft Championship Riley',
    clothColor: 'Strachan 6811 English Green',
    ratePerHour: 300,
    minMinutes: 60,
    status: 'available',
    locationZone: 'Snooker Hall',
  },
  {
    id: 'tbl_s2',
    name: 'Snooker Table 2',
    shortCode: 'S2',
    type: 'snooker',
    size: '12 ft Tournament Wiraka',
    clothColor: 'Strachan 6811 English Green',
    ratePerHour: 300,
    minMinutes: 60,
    status: 'available',
    locationZone: 'Snooker Hall',
  },
  {
    id: 'tbl_s3',
    name: 'Snooker Table 3',
    shortCode: 'S3',
    type: 'snooker',
    size: '12 ft Tournament Riley',
    clothColor: 'Strachan 6811 English Green',
    ratePerHour: 300,
    minMinutes: 60,
    status: 'available',
    locationZone: 'Snooker Hall',
  },
];

// Sanitized: Zero fake active sessions. Tables start clean and ready for real walk-ins.
export const INITIAL_SESSIONS: TableSession[] = [];

// Sanitized: Zero fake bookings. Bookings start clean and ready for real reservations.
export const INITIAL_BOOKINGS: TableBooking[] = [];
