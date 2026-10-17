import { Card, cardToString, Bid, getBidSummaryForPrompt, BidEntry } from '@lazy-poker/game-engine';

export function buildSystemPrompt(): string {
  return `You are playing a card game called Lazy Poker. Here are the rules:

GAME OVERVIEW:
- Multiple AI players each hold a hand of cards.
- The collective pool of ALL players' cards is the basis for all claims.
- Players take turns making poker hand claims (bids) or challenging (checking) the previous claim.

BID MECHANICS:
- When it's your turn, you must either RAISE or CHECK.
- RAISE: Declare a poker hand that is strictly stronger than the current bid.
  The claim is: "Among ALL cards held by all players combined, a 5-card combination
  exists that forms AT LEAST this hand." You may be bluffing.
- CHECK: Challenge the previous player's bid. All cards are revealed.
  - If the claimed hand CAN be formed from all cards → the checker LOSES this set.
  - If the claimed hand CANNOT be formed from all cards → the claimer LOSES this set.

CARD PENALTY:
- The loser of each set gets +1 card in the next set (starts at 1 card per player).
- A player who accumulates 5 cards is eliminated from the game.

STRATEGY:
- You can BLUFF freely — claim any bid even if you don't have the cards.
- Use the knowledge of your own cards plus probability to decide.
- If the current bid seems unlikely given all the cards in play, CHECK it.
- If you can raise safely, do so. If you're being bluffed, check.

RESPONSE FORMAT:
Respond with valid JSON only. Examples:
  {"action": "raise", "bid_id": "pair-14", "reasoning": "I have an ace"}
  {"action": "check", "reasoning": "An ace-high flush seems very unlikely"}

${getBidSummaryForPrompt()}`;
}

export function buildTurnPrompt(args: {
  myCards: Card[];
  bidHistory: BidEntry[];
  currentBid: Bid | null;
  playerCardCounts: Record<string, { name: string; count: number }>;
  myPlayerId: string;
  validNextBidIds: string[];
}): string {
  const { myCards, bidHistory, currentBid, playerCardCounts, validNextBidIds } = args;

  const cardList = myCards.map(cardToString).join(', ');

  const playerInfo = Object.entries(playerCardCounts)
    .map(([, { name, count }]) => `  ${name}: ${count} card(s)`)
    .join('\n');

  const history = bidHistory
    .map((entry, i) => {
      if (entry.action === 'check') return `  ${i + 1}. ${entry.playerName}: CHECK`;
      return `  ${i + 1}. ${entry.playerName}: RAISE → "${entry.bid?.display ?? '?'}" (id: ${entry.bid?.id ?? '?'})`;
    })
    .join('\n');

  const currentBidStr = currentBid
    ? `Current bid to beat: "${currentBid.display}" (id: ${currentBid.id})`
    : 'You are the FIRST bidder — choose any starting bid.';

  const nextBidsStr =
    validNextBidIds.length > 0
      ? `Valid raise IDs you can use (next ${Math.min(15, validNextBidIds.length)} options above current):\n${validNextBidIds.slice(0, 15).join(', ')}`
      : 'No raise available — you must check.';

  return `YOUR CARDS: ${cardList}

PLAYERS IN THIS SET:
${playerInfo}

TOTAL CARDS IN PLAY: ${Object.values(playerCardCounts).reduce((s, p) => s + p.count, 0)}

BID HISTORY THIS SET:
${history || '  (no bids yet)'}

${currentBidStr}

${nextBidsStr}

Decide: raise (provide a bid_id from valid options) or check.
Respond with JSON: {"action":"raise","bid_id":"<id>","reasoning":"..."} or {"action":"check","reasoning":"..."}`;
}
