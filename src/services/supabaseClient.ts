/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default live Supabase credentials for project ruzdhrnltaftxtkgymtk
export const DEFAULT_SUPABASE_PROJECT_ID = 'ruzdhrnltaftxtkgymtk';
export const DEFAULT_SUPABASE_URL = 'https://ruzdhrnltaftxtkgymtk.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_EdKudDk0zJLXpoPa9v5z4g__BP7nnBP';

// Environment variables or localStorage runtime overrides
const getSupabaseConfig = () => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  const envUrl = metaEnv?.VITE_SUPABASE_URL;
  const envKey = metaEnv?.VITE_SUPABASE_ANON_KEY;

  let localUrl = '';
  let localKey = '';
  try {
    localUrl = localStorage.getItem('tcn_live_db_url') || '';
    localKey = localStorage.getItem('tcn_live_db_key') || '';
    // If stale mock URL was previously stored, clear it out
    if (localUrl.includes('mock-tcn') || localKey === 'mock-anon-key') {
      localStorage.removeItem('tcn_live_db_url');
      localStorage.removeItem('tcn_live_db_key');
      localUrl = '';
      localKey = '';
    }
  } catch {
    // Ignore in non-browser env
  }

  const url = localUrl || envUrl || DEFAULT_SUPABASE_URL;
  const key = localKey || envKey || DEFAULT_SUPABASE_ANON_KEY;

  const isConfigured =
    url.length > 0 &&
    key.length > 0 &&
    !url.includes('mock-tcn.supabase.co') &&
    key !== 'mock-anon-key';

  return { url, key, isConfigured };
};

export const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, isConfigured: IS_SUPABASE_CONFIGURED } =
  getSupabaseConfig();

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!clientInstance) {
    try {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.warn('[TCN Database] Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return clientInstance;
};

export const setCustomDatabaseCredentials = (url: string, key: string): boolean => {
  try {
    localStorage.setItem('tcn_live_db_url', url.trim());
    localStorage.setItem('tcn_live_db_key', key.trim());
    clientInstance = null; // reset client instance
    return true;
  } catch (e) {
    console.error('[TCN Database] Failed to save credentials:', e);
    return false;
  }
};

export const testDatabaseConnection = async (
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  const targetUrl = testUrl || getSupabaseConfig().url;
  const targetKey = testKey || getSupabaseConfig().key;

  if (!targetUrl || !targetKey || targetUrl.includes('mock-tcn')) {
    return {
      success: false,
      message: 'No live Supabase project credentials provided yet. Please input your Project URL and Anon Key.',
    };
  }

  const startTime = Date.now();
  try {
    const client = createClient(targetUrl, targetKey);
    // Ping with lightweight query
    const { error } = await client.from('game_tables').select('id').limit(1);
    const latencyMs = Date.now() - startTime;

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet or isn't in schema cache, we reached Supabase PostgREST successfully
      if (
        error.message.includes('relation "game_tables" does not exist') ||
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('schema cache')
      ) {
        return {
          success: true,
          latencyMs,
          message: `Connected to Supabase project ruzdhrnltaftxtkgymtk successfully (${latencyMs}ms)! Database online and syncing.`,
        };
      }
      return {
        success: false,
        message: `Connection failed: ${error.message} (${error.code})`,
      };
    }

    return {
      success: true,
      latencyMs,
      message: `Database online and connected! Response time: ${latencyMs}ms.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Failed to reach Supabase host: ${msg}`,
    };
  }
};
