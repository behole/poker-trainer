class GameManager {
  // ... previous code stays the same until handleAction ...

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