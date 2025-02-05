class GameManager {
  constructor(numPlayers = 6, smallBlind = 10, bigBlind = 20) {
    this.numPlayers = numPlayers;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.buttonPosition = 0;
    this.actedPlayers = new Set();
    
    // Initialize players
    this.players = Array(numPlayers).fill(null).map((_, i) => ({
      id: i,
      stack: 1500,
      position: '',  // Will be set in startNewHand
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
    
    // Create initial deck
    this.deck = this.createDeck();
    console.log('GameManager initialized'); // Debug log
  }

  createDeck() {
    const suits = ['h', 'd', 'c', 's'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    for (const suit of suits) {
      for (const value of values) {
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

  startNewHand() {
    console.log('Starting new hand'); // Debug log
    this.deck = this.createDeck();
    this.communityCards = [];
    this.pot = 0;
    this.phase = 'preflop';
    this.actedPlayers.clear();
    
    this.buttonPosition = (this.buttonPosition + 1) % this.numPlayers;
    
    // Reset all players
    this.players.forEach((player, i) => {
      player.position = this.getPosition(i);
      player.cards = [];
      player.bet = 0;
      player.active = true;
    });

    // Post blinds
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

    // Deal cards
    this.players.forEach(player => {
      player.cards = [this.deck.pop(), this.deck.pop()];
    });

    // Set first to act (UTG)
    this.activePlayer = (this.buttonPosition + 3) % this.numPlayers;
    this.lastAggressor = bbPos;

    const state = this.getGameState();
    console.log('New hand state:', state); // Debug log
    
    // Trigger AI actions if needed
    if (this.activePlayer !== 0) {
      setTimeout(() => this.processAIActions(), 1000);
    }
    
    return state;
  }

  makeAIDecision() {
    const player = this.players[this.activePlayer];
    const toCall = this.currentBet - player.bet;
    const hasActed = this.actedPlayers.has(this.activePlayer);

    console.log('AI decision for player', this.activePlayer, { toCall, hasActed }); // Debug log

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
      console.log('Skipping AI action - human turn or round complete'); // Debug log
      return;
    }

    console.log('Processing AI action for player', this.activePlayer); // Debug log
    const decision = this.makeAIDecision();
    console.log('AI decision:', decision); // Debug log
    const state = this.handleAction(decision.action, decision.amount);
    window.dispatchEvent(new CustomEvent('newGameState', { detail: state }));
  }

  handleAction(action, amount = 0) {
    console.log('Handling action:', { action, amount, player: this.activePlayer }); // Debug log
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
    }

    if (actionTaken) {
      this.actedPlayers.add(this.activePlayer);
      console.log('Action taken, moving to next player'); // Debug log
      
      let nextPlayer = this.activePlayer;
      do {
        nextPlayer = (nextPlayer + 1) % this.numPlayers;
      } while (!this.players[nextPlayer].active && nextPlayer !== this.activePlayer);
      
      this.activePlayer = nextPlayer;
      console.log('Next player:', this.activePlayer); // Debug log

      if (this.isBettingRoundComplete()) {
        console.log('Betting round complete, moving to next phase'); // Debug log
        this.moveToNextPhase();
      } else if (this.activePlayer !== 0) {
        console.log('Triggering AI action'); // Debug log
        setTimeout(() => this.processAIActions(), 1000);
      }
    }

    const newState = this.getGameState();
    console.log('New game state:', newState); // Debug log
    return newState;
  }

  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => p.active);
    const actedCount = Array.from(this.actedPlayers).length;
    const allActedOrFolded = actedCount >= activePlayers.length;
    const allBetsEqual = activePlayers.every(p => p.bet === this.currentBet);
    
    console.log('Checking betting round completion:', {
      activePlayers: activePlayers.length,
      actedCount,
      allActedOrFolded,
      allBetsEqual,
      currentBet: this.currentBet,
      bets: activePlayers.map(p => p.bet)
    }); // Debug log

    return allActedOrFolded && allBetsEqual;
  }

  moveToNextPhase() {
    console.log('Moving to next phase from:', this.phase); // Debug log
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
        console.log('Hand complete, starting new hand in 2s'); // Debug log
        setTimeout(() => {
          const newState = this.startNewHand();
          window.dispatchEvent(new CustomEvent('newGameState', { detail: newState }));
        }, 2000);
        return;
    }

    // Find first active player after button
    this.activePlayer = (this.buttonPosition + 1) % this.numPlayers;
    while (!this.players[this.activePlayer].active) {
      this.activePlayer = (this.activePlayer + 1) % this.numPlayers;
    }
    console.log('New active player:', this.activePlayer); // Debug log

    this.lastAggressor = null;
    
    // Trigger AI actions if needed
    if (this.activePlayer !== 0) {
      console.log('Triggering AI action after phase change'); // Debug log
      setTimeout(() => this.processAIActions(), 1000);
    }
  }
}

export default GameManager;