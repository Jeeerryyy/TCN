/**
 * LocalStorage state persistence helper.
 * Keeps system operational even during internet hiccups or local kiosk reboots.
 */

const STORAGE_VERSION_KEY = 'tcn_schema_version';
const CURRENT_STORAGE_VERSION = 'v2.9.0-cafe-beverages-menu';

const KEYS_TO_PURGE = [
  'tables',
  'sessions',
  'bookings',
  'tcn_bookings',
  'tcn_tcn_bookings',
  'bills',
  'orders',
  'customers',
  'tcn_customers',
  'wallet_txns',
  'tcn_wallet_txns',
  'menu',
  'tcn_current_user',
];

// Automatically purge legacy mock data on version upgrade
if (typeof window !== 'undefined') {
  try {
    const currentVer = localStorage.getItem(STORAGE_VERSION_KEY);
    if (currentVer !== CURRENT_STORAGE_VERSION) {
      // Clear legacy cache
      KEYS_TO_PURGE.forEach((key) => {
        localStorage.removeItem(key);
        localStorage.removeItem(`tcn_${key}`);
      });
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
    }
  } catch (e) {
    console.warn('[TCN Storage] Storage version check skipped:', e);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const primaryKey = key.startsWith('tcn_') ? key : `tcn_${key}`;
    const raw = localStorage.getItem(primaryKey) || localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[TCN Storage] Failed to load key "${key}", falling back to initial data.`, err);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    const primaryKey = key.startsWith('tcn_') ? key : `tcn_${key}`;
    localStorage.setItem(primaryKey, JSON.stringify(value));
  } catch (err) {
    console.error(`[TCN Storage] Quota exceeded or error saving "${key}":`, err);
  }
}

export function clearBookingsStorage(): void {
  try {
    localStorage.removeItem('bookings');
    localStorage.removeItem('tcn_bookings');
    localStorage.removeItem('tcn_tcn_bookings');
  } catch (e) {
    console.warn('[TCN Storage] Error clearing bookings storage:', e);
  }
}

export function clearBillsStorage(): void {
  try {
    localStorage.removeItem('bills');
    localStorage.removeItem('tcn_bills');
  } catch (e) {
    console.warn('[TCN Storage] Error clearing bills storage:', e);
  }
}

export function clearCustomersStorage(): void {
  try {
    localStorage.removeItem('customers');
    localStorage.removeItem('tcn_customers');
    localStorage.removeItem('wallet_txns');
    localStorage.removeItem('tcn_wallet_txns');
  } catch (e) {
    console.warn('[TCN Storage] Error clearing customers storage:', e);
  }
}

export function clearAllCustomersAndBookings(): void {
  clearBookingsStorage();
  clearCustomersStorage();
}

export function clearAllStorageData(): void {
  try {
    KEYS_TO_PURGE.forEach((key) => {
      localStorage.removeItem(key);
      localStorage.removeItem(`tcn_${key}`);
    });
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  } catch (e) {
    console.error('[TCN Storage] Error clearing storage data:', e);
  }
}


