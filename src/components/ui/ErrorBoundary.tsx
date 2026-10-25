/* Brex Design System – Enterprise Error Boundary & Crash Recovery */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TCN ErrorBoundary caught an unhandled exception]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleExportBackup = () => {
    try {
      const backupData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tcn_')) {
          backupData[key] = localStorage.getItem(key);
        }
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tcn_crash_recovery_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Unable to export local storage backup.');
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F3F3F7] flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#B9BBC6] rounded-[10px] p-6 sm:p-8 max-w-lg w-full shadow-[0px_12px_32px_rgba(0,0,0,0.15)] text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#FF5900]/10 border border-[#FF5900]/20 text-[#FF5900] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-[18px] font-semibold text-[#000000]">
                {this.props.fallbackTitle || 'Terminal Interrupted'}
              </h2>
              <p className="text-[14px] text-[#60646C] mt-2 leading-relaxed">
                A rendering glitch occurred in this view. Don't worry—all live tables, ongoing timers, and orders remain safely persisted in your local storage.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#F3F3F7] p-3 rounded-[6px] text-left border border-[#B9BBC6]/40 max-h-32 overflow-y-auto">
                <p className="text-[12px] font-mono text-[#DE350B] break-words">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleResetState}
                className="h-[40px] px-4 rounded-[8px] bg-[#FF5900] hover:bg-[#E64E00] text-white text-[14px] font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Resume View
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="h-[40px] px-4 rounded-[8px] border border-[#B9BBC6] hover:bg-[#F3F3F7] text-[#15191E] text-[14px] font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                Reload Terminal
              </button>
              <button
                type="button"
                onClick={this.handleExportBackup}
                title="Download JSON copy of all local game sessions and orders"
                className="h-[40px] px-3 rounded-[8px] border border-[#B9BBC6] hover:bg-[#F3F3F7] text-[#60646C] text-[14px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                Save Backup
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
