import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';

// POLYFILLS
import { Buffer } from 'buffer';

declare global {
  interface Window {
    Buffer: typeof Buffer;
    process: any;
  }
}

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  if (!window.process) {
    window.process = {
      env: { NODE_ENV: 'development' },
      version: '',
      versions: {},
      platform: 'browser'
    } as any;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);