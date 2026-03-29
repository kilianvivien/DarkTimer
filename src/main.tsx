import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (
  typeof window !== 'undefined' &&
  (window.location.protocol === 'http:' || window.location.protocol === 'https:')
) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
