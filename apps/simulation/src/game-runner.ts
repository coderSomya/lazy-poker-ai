import {
  createDeck, shuffleDeck, dealCards,
  ALL_BIDS, getBid, getLowestBid, verifyBid,
  Player, BidEntry, GameState,
  cardToString,
} from '@lazy-poker/game-engine';
import { PlayerConfig, config } from '@lazy-poker/config';
import { callLLM } from './llm';
import { buildSystemPrompt, buildTurnPrompt } from './prompts';

const SYSTEM_PROMPT = buildSystemPrompt();
const { maxBidsPerSet, delayBetweenTurnsMs } = config.simulation;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function initPlayers(playerConfigs: PlayerConfig[]): Player[] {
  return playerConfigs.map((p) => ({
    id: p.id,
    name: p.name,
    model: p.model,
    cardCount: 1,
    cards: [],
    isEliminated: false,
  }));
}

type EventCallback = (e: unknown) => Promise<void> | void;

async function runSet(
  players: Player[],
  setNumber: number,
  onEvent: EventCallback
): Promise<{ result: import('@lazy-poker/game-engine').SetResult; bidHistory: BidEntry[] }> {
  const deck = shuffleDeck(createDeck());
  let remaining = deck;

  for (const p of players) {
    const { dealt, remaining: rest } = dealCards(remaining, p.cardCount);
    p.cards = dealt;
    remaining = rest;
  }

  const allCardsFlat = players.flatMap((p) => p.cards);

  await onEvent({
    type: 'set-start',
    setNumber,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      cardCount: p.cardCount,
      cards: p.cards.map(cardToString),
    })),
  });

  const bidHistory: BidEntry[] = [];
  let currentBid: typeof ALL_BIDS[0] | null = null;
  let currentPlayerIdx = 0;

  for (let turn = 0; turn < maxBidsPerSet; turn++) {
    const player = players[currentPlayerIdx];

    const playerCardCounts: Record<string, { name: string; count: number }> = {};
    for (const p of players) {
      playerCardCounts[p.id] = { name: p.name, count: p.cardCount };
    }

    const validNextBidIds = currentBid
      ? ALL_BIDS.filter((b) => b.rank > currentBid!.rank).map((b) => b.id)
      : ALL_BIDS.map((b) => b.id);

    let action: 'raise' | 'check' = 'check';
    let chosenBid: typeof ALL_BIDS[0] | null = currentBid;
    let reasoning = '';

    if (validNextBidIds.length === 0) {
      action = 'check';
    } else {
      try {
        const userMsg = buildTurnPrompt({
          myCards: player.cards,
          bidHistory,
          currentBid,
          playerCardCounts,
          myPlayerId: player.id,
          validNextBidIds,
        });

        const raw = await callLLM(player.model, [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMsg },
        ]);
        const parsed = JSON.parse(raw) as { action?: string; bid_id?: string; reasoning?: string };
        action = parsed.action === 'raise' ? 'raise' : 'check';
        reasoning = parsed.reasoning ?? '';

        if (action === 'raise') {
          const bid = parsed.bid_id ? getBid(parsed.bid_id) : undefined;
          if (!bid || (currentBid && bid.rank <= currentBid.rank)) {
            const fallback = ALL_BIDS.find((b) => !currentBid || b.rank > currentBid.rank);
            chosenBid = fallback ?? currentBid;
          } else {
            chosenBid = bid;
          }
        }
      } catch (err) {
        action = 'check';
        reasoning = `LLM error: ${String(err)}`;
      }
    }

    const entry: BidEntry = {
      playerId: player.id,
      playerName: player.name,
      action,
      bid: action === 'raise' ? chosenBid ?? undefined : undefined,
      timestamp: Date.now(),
    };
    bidHistory.push(entry);

    await onEvent({ type: 'turn', setNumber, player: player.name, action, bid: entry.bid?.display, reasoning });

    if (action === 'check') {
      const lastRaise = [...bidHistory].reverse().find((e) => e.action === 'raise');
      const claimedBid = lastRaise?.bid ?? getLowestBid();
      const claimerId = lastRaise?.playerId ?? players[(currentPlayerIdx - 1 + players.length) % players.length].id;
      const claimer = players.find((p) => p.id === claimerId)!;
      const checker = player;

      const bidValid = verifyBid(claimedBid, allCardsFlat);
      const loser = bidValid ? checker : claimer;
      const winner = bidValid ? claimer : checker;
      const bluffCaught = !bidValid;

      await onEvent({
        type: 'set-end',
        setNumber,
        finalBid: claimedBid.display,
        bidValid,
        bluffCaught,
        loser: loser.name,
        winner: winner.name,
        allCards: Object.fromEntries(players.map((p) => [p.name, p.cards.map(cardToString)])),
      });

      return {
        result: {
          loserId: loser.id,
          loserName: loser.name,
          winnerId: winner.id,
          winnerName: winner.name,
          finalBid: claimedBid,
          allCards: Object.fromEntries(players.map((p) => [p.id, p.cards])),
          bidWasValid: bidValid,
          bluffCaught,
        },
        bidHistory,
      };
    }

    currentBid = chosenBid;
    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;

    if (delayBetweenTurnsMs > 0) await sleep(delayBetweenTurnsMs);
  }

  // Max bids hit — last active player loses
  const loser = players[currentPlayerIdx];
  const winner = players[(currentPlayerIdx + 1) % players.length];
  return {
    result: {
      loserId: loser.id,
      loserName: loser.name,
      winnerId: winner.id,
      winnerName: winner.name,
      finalBid: currentBid ?? getLowestBid(),
      allCards: Object.fromEntries(players.map((p) => [p.id, p.cards])),
      bidWasValid: true,
      bluffCaught: false,
    },
    bidHistory,
  };
}

export async function runGame(
  playerConfigs: PlayerConfig[],
  gameId: string,
  onEvent: EventCallback,
  onSetComplete: (setNumber: number, result: import('@lazy-poker/game-engine').SetResult, bidHistory: BidEntry[], cardCounts: Record<string, number>) => Promise<void>
): Promise<GameState> {
  const players = initPlayers(playerConfigs);
  const state: GameState = {
    gameId,
    players,
    currentSet: null,
    setResults: [],
    status: 'in-progress',
    winnerId: null,
    loserId: null,
    startedAt: Date.now(),
  };

  await onEvent({ type: 'game-start', gameId, players: players.map((p) => ({ id: p.id, name: p.name, model: p.model })) });

  let setNumber = 0;

  while (state.status === 'in-progress') {
    setNumber++;
    const activePlayers = players.filter((p) => !p.isEliminated);
    if (activePlayers.length < 2) break;

    const { result, bidHistory } = await runSet(activePlayers, setNumber, onEvent);
    state.setResults.push(result);

    const cardCounts: Record<string, number> = {};
    for (const p of players) cardCounts[p.id] = p.cardCount;
    await onSetComplete(setNumber, result, bidHistory, cardCounts);

    const loser = players.find((p) => p.id === result.loserId)!;
    loser.cardCount++;

    if (loser.cardCount >= 5) {
      loser.isEliminated = true;
      await onEvent({ type: 'eliminated', player: loser.name, gameId });
    }

    const remaining = players.filter((p) => !p.isEliminated);
    if (remaining.length === 1) {
      state.status = 'finished';
      state.winnerId = remaining[0].id;
      state.loserId = loser.id;
      state.finishedAt = Date.now();
      await onEvent({ type: 'game-end', gameId, winner: remaining[0].name, loser: loser.name });
    }

    if (setNumber >= config.simulation.maxSetsPerGame) {
      state.status = 'finished';
      state.loserId = result.loserId;
      state.winnerId = result.winnerId;
      break;
    }
  }

  return state;
}
