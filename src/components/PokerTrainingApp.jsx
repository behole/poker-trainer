import React, { useState, useEffect } from 'react';
import { Settings, BookOpen } from 'lucide-react';
import GameManager from '../game/GameManager';

const PLAYER_COLORS = {
  0: 'bg-blue-900',    // Human player - blue
  1: 'bg-red-900',     // AI 1 - red
  2: 'bg-green-900',   // AI 2 - green
  3: 'bg-purple-900',  // AI 3 - purple
  4: 'bg-yellow-900',  // AI 4 - yellow
  5: 'bg-pink-900'     // AI 5 - pink
};

const PokerTrainingApp = () => {
  const [activeTools] = useState(['handStrength', 'outs', 'odds']);
  const [gameManager] = useState(() => new GameManager());
  const [gameState, setGameState] = useState(null);
  const [customRaiseAmount, setCustomRaiseAmount] = useState('');
  const [showRaiseInput, setShowRaiseInput] = useState(false);
  
  useEffect(() => {
    const handleNewGameState = (event) => {
      setGameState(event.detail);
      setShowRaiseInput(false);
      setCustomRaiseAmount('');
    };
    window.addEventListener('newGameState', handleNewGameState);
    
    // Start initial hand
    const initialState = gameManager.startNewHand();
    setGameState(initialState);
    
    return () => window.removeEventListener('newGameState', handleNewGameState);
  }, []);

  const handleAction = (action, amount = 0) => {
    if (gameState.activePlayer === 0) {
      const newState = gameManager.handleAction(action, amount);
      setGameState(newState);
      setShowRaiseInput(false);
    }
  };

  const calculateMinRaise = () => {
    const currentPlayer = gameState.players[0];
    const minRaise = Math.max(gameState.bigBlind, gameState.lastRaiseAmount);
    return Math.min(currentPlayer.stack, gameState.currentBet + minRaise);
  };

  const handleRaiseInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= gameState.players[0].stack)) {
      setCustomRaiseAmount(value);
    }
  };

  const handleCustomRaise = () => {
    const amount = parseInt(customRaiseAmount);
    if (amount && amount >= calculateMinRaise() && amount <= gameState.players[0].stack) {
      handleAction('raise', amount);
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

  if (!gameState) return <div>Loading...</div>;

  const currentPlayer = gameState.players[0];
  const canCall = currentPlayer.stack >= (gameState.currentBet - currentPlayer.bet);
  const canRaise = currentPlayer.stack > (gameState.currentBet - currentPlayer.bet);
  const isPlayerTurn = gameState.activePlayer === 0;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Player Info */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800">
        {gameState.players.map(player => (
          <div 
            key={player.id}
            className={`p-2 rounded transition-all duration-200 ${
              player.active ? PLAYER_COLORS[player.id] : 'bg-gray-700 opacity-50'
            } ${
              gameState.activePlayer === player.id ? 'ring-2 ring-yellow-400 shadow-lg transform scale-105' : ''
            }`}
          >
            <div className="flex justify-between">
              <span>{player.position}</span>
              <span>${player.stack}</span>
            </div>
            <div className="text-sm text-gray-300">
              Bet: ${player.bet}
              {player.totalBet > 0 && ` (Total: $${player.totalBet})`}
            </div>
          </div>
        ))}
      </div>

      {/* Game Play */}
      <div className="flex-1 p-4 bg-gray-900">
        <div className="flex justify-between mb-4">
          <div className="text-xl">Pot: ${gameState.pot}</div>
          <div className="text-lg">Phase: {gameState.phase}</div>
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
          
          <div className="flex flex-col items-center space-y-4 mt-8 w-full max-w-md">
            <div className="flex space-x-4 w-full justify-center">
              <button 
                className="px-6 py-2 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 min-w-[100px]"
                onClick={() => handleAction('fold')}
                disabled={!isPlayerTurn}
              >
                FOLD
              </button>
              <button 
                className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 min-w-[100px]"
                onClick={() => handleAction('call')}
                disabled={!isPlayerTurn || !canCall}
              >
                {gameState.currentBet > gameState.players[0].bet ? 
                  `CALL $${gameState.currentBet - gameState.players[0].bet}` : 
                  'CHECK'}
              </button>
              <button 
                className="px-6 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 min-w-[100px]"
                onClick={() => setShowRaiseInput(!showRaiseInput)}
                disabled={!isPlayerTurn || !canRaise}
              >
                RAISE
              </button>
            </div>

            {showRaiseInput && (
              <div className="flex space-x-2 items-center bg-gray-800 p-2 rounded w-full">
                <button 
                  className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
                  onClick={() => handleAction('raise', calculateMinRaise())}
                >
                  Min (${calculateMinRaise()})
                </button>
                <input
                  type="text"
                  className="px-3 py-2 rounded bg-gray-700 text-white w-24"
                  value={customRaiseAmount}
                  onChange={handleRaiseInputChange}
                  placeholder="Amount"
                />
                <button 
                  className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                  onClick={handleCustomRaise}
                  disabled={!customRaiseAmount || parseInt(customRaiseAmount) < calculateMinRaise()}
                >
                  Raise
                </button>
                <button 
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                  onClick={() => handleAction('raise', currentPlayer.stack)}
                >
                  All-in (${currentPlayer.stack})
                </button>
              </div>
            )}
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