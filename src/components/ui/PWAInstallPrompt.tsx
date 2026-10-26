import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed within the last 5 days
    const lastDismissed = localStorage.getItem('tcn_pwa_dismissed');
    if (lastDismissed && Date.now() - parseInt(lastDismissed, 10) < 5 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    // Check if running in standalone mode (already installed)
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
      return;
    }

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);

    if (isIOS && isSafari) {
      setShowIOSPrompt(true);
    }

    // Android / Desktop beforeinstallprompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSPrompt(false);
    setDeferredPrompt(null);
    localStorage.setItem('tcn_pwa_dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (dismissed) return null;

  // iOS Specific Banner
  if (showIOSPrompt) {
    return (
      <div 
        role="region"
        aria-label="Install TCN on iOS"
        className="bg-[#FFFFFF] border-b border-[#B9BBC6] px-3.5 py-2.5 flex items-center justify-between text-xs text-[#15191E] shadow-[0px_2px_8px_rgba(0,0,0,0.06)] relative z-[990]"
      >
        <div className="flex items-center gap-3 max-w-[85%]">
          <div className="w-8 h-8 rounded-[8px] bg-[#0D0F14] border border-[#FF5900]/40 flex items-center justify-center shrink-0">
            <span className="font-bold text-[10px] text-[#FF5900]">TCN</span>
          </div>
          <div>
            <div className="font-medium text-[#000000] flex items-center gap-1.5">
              <span>Install TCN on iPad / iPhone</span>
              <span className="text-[10px] bg-[#E4E6EE] text-[#30333B] px-1.5 py-0.2 rounded font-mono font-semibold">PWA</span>
            </div>
            <div className="text-[11px] text-[#60646C] mt-0.5 leading-snug">
              Tap <Share className="inline w-3.5 h-3.5 text-[#006EF5] mx-0.5 -mt-0.5" /> <strong>Share</strong>, then select <strong>'Add to Home Screen'</strong> <PlusSquare className="inline w-3 h-3 text-[#15191E] mx-0.5 -mt-0.5" /> for full-screen kiosk mode.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-[6px] text-[#8B8D98] hover:text-[#15191E] hover:bg-[#F3F3F7] transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Android / Chromium Browser Install Prompt
  if (deferredPrompt) {
    return (
      <div 
        role="region"
        aria-label="Install TCN App"
        className="bg-[#FFFFFF] border-b border-[#B9BBC6] px-3.5 py-2.5 flex items-center justify-between text-xs text-[#15191E] shadow-[0px_2px_8px_rgba(0,0,0,0.06)] relative z-[990]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-[#FF5900] text-white flex items-center justify-center shrink-0 font-bold text-[10px]">
            TCN
          </div>
          <div>
            <div className="font-medium text-[#000000]">Install TCN Operations Suite</div>
            <div className="text-[11px] text-[#60646C]">Run as a fast desktop or mobile standalone application.</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 bg-[#FF5900] hover:bg-[#E04E00] text-white font-medium text-xs px-3 py-1.5 rounded-[6px] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-[6px] text-[#8B8D98] hover:text-[#15191E] hover:bg-[#F3F3F7] transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
