/* Brex Design System – Verified: High-contrast Fintech, Inter typography, 0px letter spacing, #FF5900 action orange */

import React, { useState, useEffect } from 'react';
import {
  getSupabaseClient,
  testDatabaseConnection,
  setCustomDatabaseCredentials,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../../services/supabaseClient';
import { dbService } from '../../services/db';
import { useTables } from '../../context/TableContext';
import { clearAllStorageData } from '../../utils/storage';
import {
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Zap,
  Trash2,
  Save,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const DatabaseSettings: React.FC = () => {
  const { tables } = useTables();
  const [url, setUrl] = useState(() => localStorage.getItem('tcn_live_db_url') || SUPABASE_URL || '');
  const [key, setKey] = useState(() => localStorage.getItem('tcn_live_db_key') || SUPABASE_ANON_KEY || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const isConnected = !!getSupabaseClient();

  useEffect(() => {
    // Run an initial quick health probe on mount if credentials exist
    if (url && key && !url.includes('mock-tcn')) {
      handleTestConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testDatabaseConnection(url, key);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomDatabaseCredentials(url, key);
    handleTestConnection();
  };

  const handleSyncTablesToLiveDb = async () => {
    setIsSyncing(true);
    setSyncStatus('Synchronizing tables with live database...');
    try {
      for (const t of tables) {
        await dbService.syncTable(t);
      }
      setSyncStatus(`Successfully synchronized ${tables.length} tables to live database.`);
    } catch {
      setSyncStatus('Error synchronizing tables.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  const handleWipeData = () => {
    if (confirm('Warning: This will clear all local storage sessions, transactions, and bookings to completely fresh sanitized venue data. Continue?')) {
      clearAllStorageData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-semibold text-[#FF5900] tracking-wider flex items-center gap-1.5 mb-1">
            <Database className="w-3.5 h-3.5 text-[#FF5900]" /> Cloud Infrastructure
          </div>
          <h2 className="text-xl font-medium text-[#000000]">
            Database Connection & Live Status
          </h2>
          <p className="text-xs text-[#60646C] mt-0.5">
            Configure live PostgreSQL database (Supabase), test connection latency, and manage live data sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="emerald" dot size="sm">
              Live Cloud Connected
            </Badge>
          ) : (
            <Badge variant="amber" dot size="sm">
              Local Offline Storage Mode
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-4 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#B9BBC6] gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[6px] shrink-0 flex items-center justify-center ${
              isConnected ? 'bg-[#D1F4D2] text-[#0D9926]' : 'bg-[#FFA500]/15 text-[#FF5900]'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000]">
                {isConnected ? 'PostgreSQL Cloud Database Active' : 'Operating in Sanitized Local Mode'}
              </div>
              <div className="text-xs text-[#60646C]">
                {isConnected
                  ? 'All table sessions, orders, and settlements are synchronized with your cloud database.'
                  : 'System is running on sanitized local storage. Enter your live Supabase credentials below to connect.'}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isTesting}
            onClick={handleTestConnection}
            className="h-[44px] sm:h-[36px] px-3.5 rounded-[6px] border border-[#15191E] bg-[#FFFFFF] hover:bg-[#15191E]/[0.05] text-xs font-normal text-[#15191E] transition-colors flex items-center justify-center gap-2 w-full sm:w-auto active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        {/* Live Test Results Alert */}
        {testResult && (
          <div
            className={`p-4 rounded-[6px] text-xs font-medium border flex items-start gap-3 ${
              testResult.success
                ? 'bg-[#D1F4D2] border-[#0D9926]/30 text-[#0D9926]'
                : 'bg-[rgba(255,61,0,0.10)] border-[#FF3D00]/30 text-[#FF3D00]'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-[#0D9926] shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-[#FF3D00] shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">{testResult.message}</div>
              {testResult.latencyMs && (
                <div className="text-[11px] text-[#0D9926] font-mono mt-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Round-trip Latency: {testResult.latencyMs}ms
                </div>
              )}
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSaveCredentials} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-medium text-xs text-[#15191E] mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your website URL"
              className="w-full h-[44px] sm:h-[40px] px-3.5 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] font-mono focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
            />
            <p className="text-[11px] text-[#60646C] mt-1">
              Find this in your Supabase Dashboard under Project Settings &gt; API.
            </p>
          </div>

          <div>
            <label className="block font-medium text-xs text-[#15191E] mb-1">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full h-[44px] sm:h-[40px] px-3.5 rounded-[6px] bg-[#FFFFFF] border border-[#B9BBC6] text-sm text-[#15191E] font-mono focus:outline-none focus:border-[#006EF5] focus:shadow-[0px_0px_0px_3px_rgba(0,110,245,0.12)] transition-all"
            />
            <p className="text-[11px] text-[#60646C] mt-1">
              Safe public anonymous key used for client authentication and row-level security.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              className="h-[44px] sm:h-[40px] px-5 rounded-[8px] bg-[#FF5900] hover:bg-[#E64E00] active:bg-[#CC4400] text-white font-normal transition-colors border border-[rgba(66,87,138,0.15)] flex items-center justify-center gap-2 shadow-none w-full sm:w-auto"
            >
              <Save className="w-4 h-4" /> Save & Connect Database
            </button>

            {isConnected && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncTablesToLiveDb}
                className="h-[44px] sm:h-[40px] px-4 rounded-[6px] border border-[#15191E] bg-[#FFFFFF] hover:bg-[#15191E]/[0.05] text-[#15191E] font-normal transition-colors flex items-center justify-center gap-2 w-full sm:w-auto active:scale-[0.98]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Upload Sanitized Tables to Cloud</span>
              </button>
            )}
          </div>

          {syncStatus && (
            <div className="bg-[#D5E8FB] border border-[#006EF5]/30 p-3 rounded-[6px] text-xs font-semibold text-[#006EF5]">
              {syncStatus}
            </div>
          )}
        </form>
      </div>

      {/* Supabase Cloud Project & Schema Card */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-4 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#B9BBC6] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] shrink-0 bg-[#006EF5]/10 text-[#006EF5] flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000]">
                Connected Cloud Project: <span className="font-mono text-[#006EF5]">ruzdhrnltaftxtkgymtk</span>
              </div>
              <div className="text-xs text-[#60646C]">
                PostgreSQL schema setup script is prepared in <span className="font-mono text-[#15191E]">supabase/full_schema_setup.sql</span>
              </div>
            </div>
          </div>

          <a
            href="https://supabase.com/dashboard/project/ruzdhrnltaftxtkgymtk/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="h-[44px] sm:h-[36px] px-3.5 rounded-[6px] border border-[#006EF5] bg-[#006EF5]/[0.06] hover:bg-[#006EF5]/[0.12] text-xs font-medium text-[#006EF5] transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <span>Open Supabase SQL Editor</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="text-xs text-[#60646C] space-y-1.5 bg-[#F3F3F7] p-3 rounded-[6px] border border-[#B9BBC6]">
          <div className="font-semibold text-[#15191E]">Quick 1-Click Sync Instructions:</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click <strong>Open Supabase SQL Editor</strong> above.</li>
            <li>Copy and paste the contents of <span className="font-mono text-[#15191E]">supabase/full_schema_setup.sql</span>.</li>
            <li>Click <strong>Run</strong> in Supabase. All tables, RLS policies, and realtime publications will instantly be created!</li>
          </ol>
        </div>
      </div>

      {/* Data Hygiene & Sanitization Utility Card */}
      <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-4 sm:p-6 space-y-4 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-[#000000]">
              Data Sanitization & Reset
            </h3>
            <p className="text-xs text-[#60646C] mt-0.5">
              Reset cached browser storage to guarantee 100% clean venue state without test artifacts.
            </p>
          </div>

          <button
            type="button"
            onClick={handleWipeData}
            className="h-[44px] sm:h-[36px] px-4 rounded-[6px] bg-[rgba(255,61,0,0.10)] hover:bg-[rgba(255,61,0,0.20)] text-[#FF3D00] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5" /> Purge Cache & Reset
          </button>
        </div>
      </div>
    </div>
  );
};
