import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason &&
      (event.reason?.message?.includes('WebSocket') ||
       event.reason?.toString?.().includes('WebSocket'))
    ) {
      event.preventDefault();
    }
  });
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

const application = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (container.hasChildNodes() && container.dataset.prerendered === 'true') {
  hydrateRoot(container, application, {
    onRecoverableError(error, errorInfo) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Hydration Recoverable Error]:', error, errorInfo);
      }
    }
  });
} else {
  createRoot(container).render(application);
}


