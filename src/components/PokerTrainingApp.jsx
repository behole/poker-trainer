import React, { useState, useEffect } from 'react';

class GameManager {
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

  constructor() {
    this.deck = this.createDeck();
    this.players = Array(6).fill(null).map((_, i) => ({
      id: i,
      stack: 1500,
      cards: []
    }));
  }
}

const PokerTrainingApp = () => {
  const [gameManager] = useState(() => new GameManager());
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    // Just initialize game state
    setGameState({
      players: gameManager.players,
      deck: gameManager.deck
    });
  }, [gameManager]);

  if (!gameState) return <div>Loading...</div>;

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl mb-4">Poker Training App</h2>
      <p className="mb-4">Game initialized with {gameState.deck.length} cards!</p>
      <div className="grid grid-cols-2 gap-4">
        {gameState.players.map(player => (
          <div key={player.id} className="p-2 bg-blue-900 rounded">
            Player {player.id}: ${player.stack}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PokerTrainingApp;