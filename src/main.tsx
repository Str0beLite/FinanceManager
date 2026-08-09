import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { AppProvider } from './store/AppContext';
import './index.css';

// The icon library injects its own <style> on first render, which lands after
// the first paint and makes icons flash at full size. Ship the stylesheet with
// the bundle instead, so they are correctly sized from the first frame.
config.autoAddCss = false;

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
