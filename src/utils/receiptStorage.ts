import { ReceiptConfig, DEFAULT_RECEIPT_CONFIG } from '../types/receipt.types';
import { loadFromStorage, saveToStorage } from './storage';

const RECEIPT_CONFIG_STORAGE_KEY = 'tcn_receipt_template_config';
const RECEIPT_CHANNEL_NAME = 'tcn_receipt_updates';

let receiptChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    receiptChannel = new BroadcastChannel(RECEIPT_CHANNEL_NAME);
  }
} catch {
  // Graceful fallback
}

export function getReceiptConfig(): ReceiptConfig {
  const loaded = loadFromStorage<Partial<ReceiptConfig>>(
    RECEIPT_CONFIG_STORAGE_KEY,
    DEFAULT_RECEIPT_CONFIG
  );
  return { ...DEFAULT_RECEIPT_CONFIG, ...loaded };
}

export function saveReceiptConfig(config: ReceiptConfig): void {
  saveToStorage(RECEIPT_CONFIG_STORAGE_KEY, config);
  try {
    receiptChannel?.postMessage({ type: 'RECEIPT_CONFIG_UPDATED', config });
  } catch {
    // Ignore error
  }
}

export function onReceiptConfigChange(callback: (config: ReceiptConfig) => void): () => void {
  if (!receiptChannel) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'RECEIPT_CONFIG_UPDATED' && event.data.config) {
      callback(event.data.config);
    }
  };

  receiptChannel.addEventListener('message', handler);
  return () => {
    receiptChannel?.removeEventListener('message', handler);
  };
}
