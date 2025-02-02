import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import PokerTrainingApp from './components/PokerTrainingApp';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <PokerTrainingApp />
  </React.StrictMode>
);