import { Card } from './cards';
import { Bid } from './bids';

export interface Player {
  id: string;
  name: string;
  model: string;
  cardCount: number;
  cards: Card[];
  isEliminated: boolean;
}

export interface BidEntry {
  playerId: string;
  playerName: string;
  action: 'raise' | 'check';
  bid?: Bid;
  timestamp: number;
}

export interface SetState {
  setNumber: number;
  activePlayers: Player[];
  bidHistory: BidEntry[];
  currentBid: Bid | null;
  currentPlayerIndex: number;
  phase: 'bidding' | 'reveal';
}

export interface SetResult {
  loserId: string;
  loserName: string;
  winnerId: string;
  winnerName: string;
  finalBid: Bid;
  allCards: Record<string, Card[]>;
  bidWasValid: boolean;
  bluffCaught: boolean;
}

export interface GameState {
  gameId: string;
  players: Player[];
  currentSet: SetState | null;
  setResults: SetResult[];
  status: 'in-progress' | 'finished';
  winnerId: string | null;
  loserId: string | null;
  startedAt: number;
  finishedAt?: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  setsPlayed: number;
  setsWon: number;
  setsLost: number;
  bluffsAttempted: number;
  bluffsCaught: number;
  bluffsSucceeded: number;
  checksCorrect: number;
  checksIncorrect: number;
  totalBidsMade: number;
}
