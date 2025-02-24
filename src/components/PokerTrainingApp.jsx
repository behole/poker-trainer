import React, { useState, useEffect } from 'react';
import { Settings, BookOpen, X } from 'lucide-react';
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
  const [showInsights, setShowInsights] = useState(false);
  
  useEffect(() => {
    const handleNewGameState = (event) => {
      setGameState(event.detail);
      setShowRaiseInput(false);
      setCustomRaiseAmount('');
      // Keep insights visible between betting rounds but hide on new hand
      if (event.detail.winnerMessage) {
        setShowInsights(false);
      }
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
  
  // Function to calculate hand strength based on current cards
  const calculateHandStrength = () => {
    if (!gameState || !gameState.players[0]) return { strength: 0, description: 'Unknown', color: 'text-gray-400', handType: 'None' };
    
    const { communityCards, phase } = gameState;
    const playerCards = gameState.players[0].cards;
    
    if (!playerCards || playerCards.length < 2) return { strength: 0, description: 'Unknown', color: 'text-gray-400', handType: 'None' };
    
    // Basic hand strength calculation
    const handEval = gameManager.evaluateHand(playerCards, communityCards);
    let strength = handEval.rank / 7; // Normalize to 0-1 scale
    
    // Adjust preflop hand strength
    if (phase === 'preflop') {
      const values = playerCards.map(card => card[0]);
      const suits = playerCards.map(card => card[1]);
      const isPair = values[0] === values[1];
      const isSuited = suits[0] === suits[1];
      
      const valueMap = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
        '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
      };
      
      // Calculate card values
      const highCard = Math.max(valueMap[values[0]], valueMap[values[1]]);
      const lowCard = Math.min(valueMap[values[0]], valueMap[values[1]]);
      
      if (isPair) {
        strength = 0.5 + (highCard / 28); // Pairs are stronger
      } else if (highCard >= 12) { // Face cards
        strength = 0.3 + (highCard / 42) + (isSuited ? 0.1 : 0);
      } else {
        strength = 0.1 + ((highCard + lowCard) / 84) + (isSuited ? 0.1 : 0);
      }
    }
    
    const strengthDescriptions = [
      { threshold: 0.9, text: 'Monster hand', color: 'text-green-500' },
      { threshold: 0.7, text: 'Strong hand', color: 'text-green-400' },
      { threshold: 0.5, text: 'Decent hand', color: 'text-yellow-400' },
      { threshold: 0.3, text: 'Marginal hand', color: 'text-yellow-600' },
      { threshold: 0, text: 'Weak hand', color: 'text-red-500' }
    ];
    
    const description = strengthDescriptions.find(desc => strength >= desc.threshold);
    
    return {
      strength: Math.round(strength * 100),
      description: description.text,
      color: description.color,
      handType: handEval.type
    };
  };
  
  // Function to calculate pot odds
  const calculatePotOdds = () => {
    if (!gameState) return { odds: 0, favorable: false };
    
    const potSize = gameState.pot;
    const callAmount = gameState.currentBet - gameState.players[0].bet;
    
    if (callAmount <= 0) return { odds: 0, favorable: true, ratio: '0:1' };
    
    const potOdds = (callAmount / (potSize + callAmount)) * 100;
    // Ensure we don't divide by zero and have reasonable numbers
    const ratioValue = potSize > 0 && callAmount > 0 ? Math.round(potSize / callAmount) : 0;
    const ratio = `${ratioValue}:1`;
    
    // Compare with hand strength to determine if odds are favorable
    const handStrength = calculateHandStrength();
    const favorable = handStrength.strength > potOdds;
    
    return {
      odds: Math.round(potOdds),
      ratio,
      favorable
    };
  };
  
  // Function to provide gameplay advice
  const getAdvice = () => {
    if (!gameState) return 'Waiting for game to start...';
    
    const handStrength = calculateHandStrength();
    const potOdds = calculatePotOdds();
    const { phase, players, currentBet } = gameState;
    const position = players[0].position;
    const callAmount = currentBet - players[0].bet;
    
    // Basic position categorization
    const earlyPosition = ['SB', 'BB', 'UTG'];
    const latePosition = ['CO', 'BTN'];
    const isEarlyPosition = earlyPosition.includes(position);
    const isLatePosition = latePosition.includes(position);
    
    // Advice based on game state
    if (callAmount === 0) {
      // Check or Bet decision
      if (handStrength.strength > 70) return 'Bet for value with your strong hand';
      if (handStrength.strength > 40 && isLatePosition) return 'Consider a bet from late position';
      if (handStrength.strength < 30) return 'Check, your hand is weak';
      return 'Check or make a small bet if in position';
    } else {
      // Call, Raise, or Fold decision
      if (potOdds.favorable) {
        if (handStrength.strength > 80) return 'Raise with your strong hand';
        if (handStrength.strength > 50) return 'Call with your decent hand, the pot odds are favorable';
        return 'Borderline call given the pot odds';
      } else {
        if (handStrength.strength > 70) return 'Call or raise despite unfavorable odds, your hand is strong';
        if (handStrength.strength < 30 && isEarlyPosition) return 'Fold this weak hand from early position';
        if (handStrength.strength < 20) return 'Fold, your hand is too weak for these odds';
        return 'Consider folding, the pot odds aren\'t favorable for your hand strength';
      }
    }
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
              <span className="font-semibold">{player.name}</span>
              <span>${player.stack}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">{player.position}</span>
              <span className="text-gray-300">
                Bet: ${player.bet}
                {player.totalBet > 0 && ` (Total: $${player.totalBet})`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Game Play */}
      <div className="flex-1 p-4 bg-gray-900">
        <div className="flex justify-between mb-4">
          <div className="text-xl">Pot: ${gameState.pot}</div>
          <div className="text-lg">Phase: {gameState.phase}</div>
          <button 
            className="flex items-center px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            onClick={() => setShowInsights(!showInsights)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Insights
          </button>
        </div>
        
        {gameState.winnerMessage && (
          <div className={`py-3 px-4 mb-4 text-center text-white font-semibold 
            ${PLAYER_COLORS[typeof gameState.winnerMessage.playerId === 'number' 
              ? gameState.winnerMessage.playerId 
              : gameState.winnerMessage.playerId[0]]} 
            rounded-lg shadow-lg animate-pulse`}>
            {gameState.winnerMessage.message}
          </div>
        )}
        
        <div className="flex flex-col items-center space-y-4">
          {showInsights && (
            <div className="w-full bg-gray-800 rounded-lg p-4 shadow-lg mb-4 relative">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold">Insights</h3>
                <button 
                  className="p-1 rounded hover:bg-gray-700" 
                  onClick={() => setShowInsights(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-700 p-3 rounded">
                  <h4 className="font-semibold mb-1">Hand Strength</h4>
                  {(() => {
                    const strength = calculateHandStrength();
                    return (
                      <div>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-600 rounded-full h-4">
                            <div 
                              className="h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" 
                              style={{ width: `${strength.strength}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 font-bold">{strength.strength}%</span>
                        </div>
                        <p className={`mt-1 ${strength.color}`}>{strength.description}</p>
                        <p className="text-sm text-gray-300 mt-1">Current: {strength.handType}</p>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="bg-gray-700 p-3 rounded">
                  <h4 className="font-semibold mb-1">Pot Odds & Outs</h4>
                  {(() => {
                    const odds = calculatePotOdds();
                    
                    // Basic outs calculation (simplified)
                    let outsText = "No potential draws";
                    let outsCount = 0;
                    
                    if (gameState.phase !== 'preflop' && gameState.phase !== 'river') {
                      const { communityCards } = gameState;
                      const playerCards = gameState.players[0].cards;
                      
                      // Check for potential flush draw (4 cards of same suit)
                      const allCards = [...playerCards, ...communityCards];
                      const suitCounts = {};
                      allCards.forEach(card => {
                        const suit = card[1];
                        suitCounts[suit] = (suitCounts[suit] || 0) + 1;
                      });
                      
                      // Check for flush draw (need 4 cards of same suit)
                      for (const suit in suitCounts) {
                        if (suitCounts[suit] === 4) {
                          outsCount = 9; // 9 cards left of that suit
                          outsText = "Flush draw (9 outs)";
                          break;
                        }
                      }
                      
                      // Only calculate straight draw if no flush draw found
                      if (outsCount === 0) {
                        // Check for open-ended straight draw (simplified)
                        const values = allCards.map(card => {
                          const value = card[0];
                          const valueMap = {
                            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
                            '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
                          };
                          return valueMap[value] || 0;
                        }).sort((a, b) => a - b);
                        
                        // Check for 4 consecutive values
                        for (let i = 0; i < values.length - 3; i++) {
                          if (values[i+3] - values[i] === 3) {
                            outsCount = 8; // 8 outs for open-ended straight draw
                            outsText = "Open-ended straight draw (8 outs)";
                            break;
                          } else if (values[i+3] - values[i] === 4) {
                            outsCount = 4; // 4 outs for inside straight draw
                            outsText = "Inside straight draw (4 outs)";
                            break;
                          }
                        }
                      }
                    }
                    
                    return (
                      <div>
                        <p className="font-bold">{odds.ratio} (Call ${gameState.currentBet - gameState.players[0].bet})</p>
                        <p className={odds.favorable ? 'text-green-400' : 'text-red-400'}>
                          {odds.favorable ? 'Favorable odds' : 'Unfavorable odds'}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">Need {odds.odds}% chance to win</p>
                        <div className="mt-2 border-t border-gray-600 pt-1">
                          <p className="text-sm font-semibold">Outs: {outsCount > 0 ? 
                            <span className="text-blue-400">{outsText}</span> : 
                            <span className="text-gray-400">{outsText}</span>}
                          </p>
                          {outsCount > 0 && (
                            <p className="text-xs text-gray-300">
                              ~{Math.round(outsCount * (gameState.phase === 'turn' ? 2 : 4))}% to hit on next card
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="bg-gray-700 p-3 rounded">
                <h4 className="font-semibold mb-1">Advice</h4>
                {gameState.activePlayer === 0 ? (
                  <p className="text-yellow-300">{getAdvice()}</p>
                ) : (
                  <p className="text-gray-400">Waiting for your turn...</p>
                )}
              </div>
            </div>
          )}
          
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