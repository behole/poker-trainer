import React, { useState, useEffect } from 'react';
import { Settings, BookOpen } from 'lucide-react';

class GameManager {
  constructor(numPlayers = 6, smallBlind = 10, bigBlind = 20) {
    this.numPlayers = numPlayers;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.buttonPosition = 0;
    this.deck = this.createDeck();
    this.actedPlayers = new Set(); 
    
    this.players = Array(numPlayers).fill(null).map((_, i) => ({
      id: i,
      stack: 1500,
      position: this.getPosition(i),
      active: true,
      cards: [],
      bet: 0
    }));
    
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.activePlayer = 0;
    this.phase = 'preflop';
    this.lastAggressor = null;
  }

  createDeck() {
    const suits = ['h', 'd', 'c', 's'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (let suit of suits) {
      for (let value of values) {
        deck.push(value + suit);
      }
    }
    return this.shuffle(deck);
  }

  shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  getPosition(playerIndex) {
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
    const relativePosition = (playerIndex - this.buttonPosition + this.numPlayers) % this.numPlayers;
    return positions[relativePosition];
  }

  startNewHand() {
    this.deck = this.createDeck();
    this.communityCards = [];
    this.pot = 0;
    this.phase = 'preflop';
    this.actedPlayers.clear();
    
    this.buttonPosition = (this.buttonPosition + 1) % this.numPlayers;
    
    this.players.forEach((player, i) => {
      player.position = this.getPosition(i);
      player.cards = [];
      player.bet = 0;
      player.active = true;
    });

    const sbPos = (this.buttonPosition + 1) % this.numPlayers;
    const bbPos = (this.buttonPosition + 2) % this.numPlayers;
    
    this.players[sbPos].stack -= this.smallBlind;
    this.players[sbPos].bet = this.smallBlind;
    this.actedPlayers.add(sbPos);
    
    this.players[bbPos].stack -= this.bigBlind;
    this.players[bbPos].bet = this.bigBlind;
    this.actedPlayers.add(bbPos);
    
    this.currentBet = this.bigBlind;
    this.pot = this.smallBlind + this.bigBlind;

    this.players.forEach(player => {
      player.cards = [this.deck.pop(), this.deck.pop()];
    });

    this.activePlayer = (this.buttonPosition + 3) % this.numPlayers;
    this.lastAggressor = bbPos;

    const state = this.getGameState();
    if (this.activePlayer !== 0) {
      setTimeout(() => this.processAIActions(), 1000);
    }
    return state;
  }

  getGameState() {
    return {
      players: [...this.players],
      communityCards: [...this.communityCards],
      pot: this.pot,
      currentBet: this.currentBet,
      activePlayer: this.activePlayer,
      phase: this.phase,
      buttonPosition: this.buttonPosition,
      actedPlayers: Array.from(this.actedPlayers)
    };
  }

  makeAIDecision() {
    const player = this.players[this.activePlayer];
    const toCall = this.currentBet - player.bet;
    const hasActed = this.actedPlayers.has(this.activePlayer);

    if (hasActed && toCall === 0) {
      return { action: 'call' };
    }

    const random = Math.random();
    if (toCall === 0) {
      return random < 0.8 ? 
        { action: 'call' } : 
        { action: 'raise', amount: Math.min(this.bigBlind * 2, player.stack) };
    } else {
      if (random < 0.7) return { action: 'call' };
      if (random < 0.95) return { action: 'fold' };
      return { action: 'raise', amount: Math.min(this.currentBet * 2, player.stack) };
    }
  }

  processAIActions() {
    if (this.activePlayer === 0 || this.isBettingRoundComplete()) {
      return;
    }

    const decision = this.makeAIDecision();
    const state = this.handleAction(decision.action, decision.amount);
    window.dispatchEvent(new CustomEvent('newGameState', { detail: state }));
  }

  handleAction(action, amount = 0) {
    const player = this.players[this.activePlayer];
    let actionTaken = false;

    switch(action) {
      case 'fold':
        player.active = false;
        actionTaken = true;
        break;
        
      case 'call':
        const callAmount = this.currentBet - player.bet;
        if (callAmount >= 0) {
          player.stack -= callAmount;
          player.bet += callAmount;
          this.pot += callAmount;
          actionTaken = true;
        }
        break;
        
      case 'raise':
        const raiseAmount = amount - player.bet;
        if (raiseAmount > 0 && player.stack >= raiseAmount) {
          player.stack -= raiseAmount;
          player.bet = amount;
          this.currentBet = amount;
          this.pot += raiseAmount;
          this.lastAggressor = this.activePlayer;
          this.actedPlayers.clear();
          actionTaken = true;
        }
        break;
      default:
        break;
    }

    if (actionTaken) {
      this.actedPlayers.add(this.activePlayer);
      
      let nextPlayer = this.activePlayer;
      do {
        nextPlayer = (nextPlayer + 1) % this.numPlayers;
      } while (!this.players[nextPlayer].active && nextPlayer !== this.activePlayer);
      
      this.activePlayer = nextPlayer;

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase();
      } else if (this.activePlayer !== 0) {
        setTimeout(() => this.processAIActions(), 1000);
      }
    }

    return this.getGameState();
  }

  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => p.active);
    const allActedOrFolded = Array.from(this.actedPlayers).length >= activePlayers.length;
    const allBetsEqual = activePlayers.every(p => p.bet === this.currentBet);
    return allActedOrFolded && allBetsEqual;
  }

  moveToNextPhase() {
    this.currentBet = 0;
    this.players.forEach(p => p.bet = 0);
    this.actedPlayers.clear();

    switch(this.phase) {
      case 'preflop':
        this.phase = 'flop';
        this.communityCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
        break;
      case 'flop':
        this.phase = 'turn';
        this.communityCards.push(this.deck.pop());
        break;
      case 'turn':
        this.phase = 'river';
        this.communityCards.push(this.deck.pop());
        break;
      case 'river':
        setTimeout(() => {
          const newState = this.startNewHand();
          window.dispatchEvent(new CustomEvent('newGameState', { detail: newState }));
        }, 2000);
        return;
      default:
        break;
    }

    this.activePlayer = (this.buttonPosition + 1) % this.numPlayers;
    while (!this.players[this.activePlayer].active) {
      this.activePlayer = (this.activePlayer + 1) % this.numPlayers;
    }

    this.lastAggressor = null;
    
    if (this.activePlayer !== 0) {
      setTimeout(() => this.processAIActions(), 1000);
    }
  }
}

const PokerTrainingApp = () => {
  const [activeTools] = useState(['handStrength', 'outs', 'odds']);
  const [gameManager] = useState(() => new GameManager());
  const [gameState, setGameState] = useState(null);
  
  useEffect(() => {
    const handleNewGameState = (event) => {
      setGameState(event.detail);
    };
    window.addEventListener('newGameState', handleNewGameState);
    
    // Start initial hand
    const initialState = gameManager.startNewHand();
    setGameState(initialState);
    
    return () => window.removeEventListener('newGameState', handleNewGameState);
  }, [gameManager]);

  const handleAction = (action, amount = 0) => {
    if (gameState.activePlayer === 0) {
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

  if (!gameState) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
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