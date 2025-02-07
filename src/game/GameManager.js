class GameManager {
  constructor(numPlayers = 6, smallBlind = 10, bigBlind = 20) {
    this.numPlayers = numPlayers;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.buttonPosition = 0;
    this.actedPlayers = new Set();
    this.lastRaiseAmount = bigBlind;  // Track the last raise amount
    
    // Initialize players
    this.players = Array(numPlayers).fill(null).map((_, i) => ({
      id: i,
      stack: 1500,
      position: '',  // Will be set in startNewHand
      active: true,
      cards: [],
      bet: 0,
      totalBet: 0  // Track total amount bet in the hand
    }));
    
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.activePlayer = 0;
    this.phase = 'preflop';
    this.lastAggressor = null;
    
    // Create initial deck
    this.deck = this.createDeck();
    console.log('GameManager initialized');
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
      actedPlayers: Array.from(this.actedPlayers),
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      lastRaiseAmount: this.lastRaiseAmount
    };
  }

  startNewHand() {
    console.log('Starting new hand');
    this.deck = this.createDeck();
    this.communityCards = [];
    this.pot = 0;
    this.phase = 'preflop';
    this.actedPlayers.clear();
    this.lastRaiseAmount = this.bigBlind;
    
    this.buttonPosition = (this.buttonPosition + 1) % this.numPlayers;
    
    // Reset all players
    this.players.forEach((player, i) => {
      player.position = this.getPosition(i);
      player.cards = [];
      player.bet = 0;
      player.totalBet = 0;
      player.active = true;
    });

    // Post blinds
    const sbPos = (this.buttonPosition + 1) % this.numPlayers;
    const bbPos = (this.buttonPosition + 2) % this.numPlayers;
    
    // Small blind
    this.players[sbPos].stack -= this.smallBlind;
    this.players[sbPos].bet = this.smallBlind;
    this.players[sbPos].totalBet = this.smallBlind;
    this.actedPlayers.add(sbPos);
    
    // Big blind
    this.players[bbPos].stack -= this.bigBlind;
    this.players[bbPos].bet = this.bigBlind;
    this.players[bbPos].totalBet = this.bigBlind;
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
    console.log('New hand state:', state);
    
    // Trigger AI actions if needed
    if (this.activePlayer !== 0) {
      setTimeout(() => this.processAIActions(), 1000);
    }
    
    return state;
  }

  validateAction(action, amount = 0) {
    const player = this.players[this.activePlayer];
    const toCall = this.currentBet - player.bet;
    
    switch(action) {
      case 'fold':
        return true;
        
      case 'call':
        return player.stack >= toCall;
        
      case 'raise':
        if (amount === player.stack + player.bet) {  // All-in is always valid
          return true;
        }
        const minRaise = Math.max(this.bigBlind, this.lastRaiseAmount);
        const raiseAmount = amount - this.currentBet;
        return raiseAmount >= minRaise && player.stack >= (amount - player.bet);
        
      default:
        return false;
    }
  }

  handleAction(action, amount = 0) {
    console.log('Handling action:', { action, amount, player: this.activePlayer });
    const player = this.players[this.activePlayer];
    let actionTaken = false;

    if (!this.validateAction(action, amount)) {
      console.log('Invalid action:', { action, amount });
      return this.getGameState();
    }

    switch(action) {
      case 'fold':
        player.active = false;
        actionTaken = true;
        break;
        
      case 'call':
        const callAmount = Math.min(this.currentBet - player.bet, player.stack);
        if (callAmount >= 0) {
          player.stack -= callAmount;
          player.bet += callAmount;
          player.totalBet += callAmount;
          this.pot += callAmount;
          actionTaken = true;
        }
        break;
        
      case 'raise':
        // Handle all-in raises specially
        const isAllIn = amount === player.stack + player.bet;
        const raiseAmount = amount - player.bet;
        
        if (raiseAmount > 0 && player.stack >= raiseAmount) {
          player.stack -= raiseAmount;
          player.bet = amount;
          player.totalBet += raiseAmount;
          this.currentBet = amount;
          this.pot += raiseAmount;
          
          // Only update lastRaiseAmount if it's not an all-in
          if (!isAllIn) {
            this.lastRaiseAmount = amount - this.currentBet;
          }
          
          this.lastAggressor = this.activePlayer;
          this.actedPlayers.clear();
          this.actedPlayers.add(this.activePlayer);
          actionTaken = true;
        }
        break;
    }

    if (actionTaken) {
      this.actedPlayers.add(this.activePlayer);
      console.log('Action taken, moving to next player');
      
      // If only one player is left active, they win the pot
      const activePlayers = this.players.filter(p => p.active);
      if (activePlayers.length === 1) {
        setTimeout(() => {
          // Award pot to remaining player
          activePlayers[0].stack += this.pot;
          const newState = this.startNewHand();
          window.dispatchEvent(new CustomEvent('newGameState', { detail: newState }));
        }, 1500);
        return this.getGameState();
      }
      
      let nextPlayer = this.activePlayer;
      do {
        nextPlayer = (nextPlayer + 1) % this.numPlayers;
      } while (!this.players[nextPlayer].active && nextPlayer !== this.activePlayer);
      
      this.activePlayer = nextPlayer;
      console.log('Next player:', this.activePlayer);

      if (this.isBettingRoundComplete()) {
        console.log('Betting round complete, moving to next phase');
        this.moveToNextPhase();
      } else if (this.activePlayer !== 0) {
        console.log('Triggering AI action');
        setTimeout(() => this.processAIActions(), 1000);
      }
    }

    const newState = this.getGameState();
    console.log('New game state:', newState);
    return newState;
  }

  makeAIDecision() {
    const player = this.players[this.activePlayer];
    const toCall = this.currentBet - player.bet;
    const hasActed = this.actedPlayers.has(this.activePlayer);
    const minRaise = Math.max(this.bigBlind, this.lastRaiseAmount);

    console.log('AI decision for player', this.activePlayer, { toCall, hasActed });

    if (hasActed && toCall === 0) {
      return { action: 'call' };
    }

    const random = Math.random();
    if (toCall === 0) {
      if (random < 0.8) {
        return { action: 'call' };
      } else {
        const raiseAmount = Math.min(this.currentBet + minRaise, player.stack);
        return { action: 'raise', amount: raiseAmount };
      }
    } else {
      if (random < 0.7) return { action: 'call' };
      if (random < 0.95) return { action: 'fold' };
      const raiseAmount = Math.min(this.currentBet + minRaise, player.stack);
      return { action: 'raise', amount: raiseAmount };
    }
  }

  processAIActions() {
    if (this.activePlayer === 0 || this.isBettingRoundComplete()) {
      console.log('Skipping AI action - human turn or round complete');
      return;
    }

    console.log('Processing AI action for player', this.activePlayer);
    const decision = this.makeAIDecision();
    console.log('AI decision:', decision);
    const state = this.handleAction(decision.action, decision.amount);
    window.dispatchEvent(new CustomEvent('newGameState', { detail: state }));
  }

  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => p.active);
    
    // If only one player remains active, round is complete
    if (activePlayers.length === 1) {
      return true;
    }
    
    // Check if all active players have acted
    const activePlayersActed = activePlayers.every(p => 
      this.actedPlayers.has(p.id)
    );
    
    // Check if all active players have matched the current bet or are all-in
    const allBetsMatched = activePlayers.every(p => 
      p.bet === this.currentBet || p.stack === 0
    );
    
    // Check if we've returned to the last aggressor
    const backToAggressor = this.lastAggressor !== null && 
      this.activePlayer === this.lastAggressor;
    
    console.log('Checking betting round completion:', {
      activePlayers: activePlayers.length,
      activePlayersActed,
      allBetsMatched,
      backToAggressor,
      currentBet: this.currentBet,
      bets: activePlayers.map(p => p.bet)
    });

    return (activePlayersActed && allBetsMatched) || backToAggressor;
  }

  moveToNextPhase() {
    console.log('Moving to next phase from:', this.phase);
    
    // Move all bets to the pot and reset bets
    this.currentBet = 0;
    this.players.forEach(p => p.bet = 0);
    this.actedPlayers.clear();
    this.lastAggressor = null;
    this.lastRaiseAmount = this.bigBlind;

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
        console.log('Hand complete, starting new hand in 2s');
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
    console.log('New active player:', this.activePlayer);
    
    // Trigger AI actions if needed
    if (this.activePlayer !== 0) {
      console.log('Triggering AI action after phase change');
      setTimeout(() => this.processAIActions(), 1000);
    }
  }
}

export default GameManager;