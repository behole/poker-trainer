import React, { useState, useEffect } from 'react';
import { Settings, BookOpen } from 'lucide-react';
import GameManager from '../game/GameManager';

const PokerTrainingApp = () => {
  const [activeTools] = useState(['handStrength', 'outs', 'odds']);
  const [gameManager] = useState(() => new GameManager());
  const [gameState, setGameState] = useState(null);
  
  useEffect(() => {
    const handleNewGameState = (event) => {
      console.log('New state:', event.detail); // Debug log
      setGameState(event.detail);
    };
    window.addEventListener('newGameState', handleNewGameState);
    
    // Start initial hand
    const initialState = gameManager.startNewHand();
    console.log('Initial state:', initialState); // Debug log
    setGameState(initialState);

    // Start AI actions if needed
    if (initialState.activePlayer !== 0) {
      gameManager.processAIActions();
    }
    
    return () => window.removeEventListener('newGameState', handleNewGameState);
  }, [gameManager]);

  const handleAction = (action, amount = 0) => {
    if (gameState.activePlayer === 0) {
      console.log('Player action:', action, amount); // Debug log
      const newState = gameManager.handleAction(action, amount);
      setGameState(newState);
    }
  };

  const renderCard = (card) => {
    if (!card) return null;
    const suit = card[1];
    const value = card[0];
    const suitSymbol = {
      'h': '♥',
      'd': '♦',
      'c': '♣',
      's': '♠'
    }[suit] || suit;

    const color = suit === 'h' || suit === 'd' ? 'text-red-500' : 'text-black';
    
    return (
      <div className={`w-16 h-24 bg-white rounded flex items-center justify-center text-xl ${color}`}>
        {value}{suitSymbol}
      </div>
    );
  };

  // Debug component to show game state
  const DebugInfo = () => (
    <div className="fixed top-0 right-0 bg-black/80 p-4 text-xs text-white">
      <div>Phase: {gameState.phase}</div>
      <div>Active Player: {gameState.activePlayer}</div>
      <div>Current Bet: ${gameState.currentBet}</div>
      <div>Button: {gameState.buttonPosition}</div>
      <button 
        className="mt-2 px-2 py-1 bg-red-600 rounded"
        onClick={() => {
          const newState = gameManager.startNewHand();
          setGameState(newState);
        }}
      >
        New Hand
      </button>
    </div>
  );

  if (!gameState) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <DebugInfo />
      {/* Player Info */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800">
        {gameState.players.map(player => (
          <div 
            key={player.id}
            className={`p-2 rounded ${
              player.active ? 'bg-blue-900' : 'bg-gray-700'
            } ${
              gameState.activePlayer === player.id ? 'ring-2 ring-yellow-400' : ''
            }`}
          >
            <div className="flex justify-between">
              <span>{player.position}</span>
              <span>${player.stack}</span>
            </div>
            <div className="text-sm text-gray-300">
              Bet: ${player.bet}
            </div>
          </div>
        ))}
      </div>

      {/* Game Play */}
      <div className="flex-1 p-4 bg-gray-900">
        <div className="flex justify-between mb-4">
          <div className="text-xl">Pot: ${gameState.pot}</div>
          <button className="flex items-center px-4 py-2 bg-blue-600 rounded">
            <BookOpen className="w-4 h-4 mr-2" />
            Insights
          </button>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-2">
            {gameState.communityCards.map((card, i) => (
              <div key={i}>{renderCard(card)}</div>
            ))}
          </div>
          
          <div className="flex space-x-2 mt-8">
            {gameState.players[0].cards.map((card, i) => (
              <div key={i}>{renderCard(card)}</div>
            ))}
          </div>
          
          <div className="flex space-x-4 mt-8">
            <button 
              className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={() => handleAction('fold')}
              disabled={gameState.activePlayer !== 0}
            >
              FOLD
            </button>
            <button 
              className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={() => handleAction('call')}
              disabled={gameState.activePlayer !== 0}
            >
              {gameState.currentBet > gameState.players[0].bet ? 
                `CALL $${gameState.currentBet - gameState.players[0].bet}` : 
                'CHECK'}
            </button>
            <button 
              className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={() => {
                const minRaise = gameState.currentBet * 2;
                handleAction('raise', minRaise);
              }}
              disabled={gameState.activePlayer !== 0}
            >
              RAISE ${gameState.currentBet * 2}
            </button>
          </div>
        </div>
      </div>

      {/* Training Tools */}
      <div className="p-4 bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Training Tools</h3>
          <button className="p-2 bg-blue-600 rounded">
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {activeTools.map(tool => (
            <div key={tool} className="p-4 bg-gray-700 rounded">
              {tool.charAt(0).toUpperCase() + tool.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PokerTrainingApp;