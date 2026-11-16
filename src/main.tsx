import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Ensure no stale service workers or cached chunks corrupt Vite development
if (typeof window !== 'undefined') {
  const isLocalDev =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '5173';

  if (isLocalDev) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then(() => {
            console.log('[TCN PWA] Unregistered stale dev service worker:', registration.scope);
          });
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  } else if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[TCN PWA] ServiceWorker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.warn('[TCN PWA] ServiceWorker registration failed:', error);
        });
    });
  }
}

