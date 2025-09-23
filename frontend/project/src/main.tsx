import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

// Register PWA service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to the user asking them to refresh
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>
);
