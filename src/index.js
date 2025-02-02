import React from 'react';
import ReactDOM from 'react-dom/client';
import PokerTrainingApp from './components/PokerTrainingApp';

// Test element to ensure React is loading
const TestApp = () => {
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h1>Poker Trainer Test</h1>
      <p>If you can see this, React is working!</p>
      <PokerTrainingApp />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);