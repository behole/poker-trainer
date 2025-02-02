import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import PokerTrainingApp from './components/PokerTrainingApp';

// Try to find the root element
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement); // Debug log

// Create root and render
try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <PokerTrainingApp />
    </React.StrictMode>
  );
  console.log('Render completed');
} catch (error) {
  console.error('Error rendering app:', error);
}