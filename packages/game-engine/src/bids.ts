import { Rank, RANKS, RANK_DISPLAY } from './cards';

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface Bid {
  id: string;
  display: string;
  category: HandCategory;
  rank: number;
  primaryRank?: Rank;
  secondaryRank?: Rank;
}

const STRAIGHT_HIGHS: Rank[] = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

function buildBidList(): Bid[] {
  const bids: Bid[] = [];
  let rank = 0;

  for (const r of RANKS) {
    bids.push({ id: `high-card-${r}`, display: `${RANK_DISPLAY[r]}-high`, category: 'high-card', rank: rank++, primaryRank: r });
  }

  for (const r of RANKS) {
    bids.push({ id: `pair-${r}`, display: `pair of ${RANK_DISPLAY[r]}s`, category: 'pair', rank: rank++, primaryRank: r });
  }

  for (let hi = 1; hi < RANKS.length; hi++) {
    for (let lo = 0; lo < hi; lo++) {
      const highRank = RANKS[hi];
      const lowRank = RANKS[lo];
      bids.push({
        id: `two-pair-${highRank}-${lowRank}`,
        display: `two pair, ${RANK_DISPLAY[highRank]}s and ${RANK_DISPLAY[lowRank]}s`,
        category: 'two-pair',
        rank: rank++,
        primaryRank: highRank,
        secondaryRank: lowRank,
      });
    }
  }

  for (const r of RANKS) {
    bids.push({ id: `three-of-a-kind-${r}`, display: `three of a kind, ${RANK_DISPLAY[r]}s`, category: 'three-of-a-kind', rank: rank++, primaryRank: r });
  }

  for (const r of STRAIGHT_HIGHS) {
    bids.push({ id: `straight-${r}`, display: `${RANK_DISPLAY[r]}-high straight`, category: 'straight', rank: rank++, primaryRank: r });
  }

  for (const r of RANKS.filter((r) => r >= 7)) {
    bids.push({ id: `flush-${r}`, display: `${RANK_DISPLAY[r]}-high flush`, category: 'flush', rank: rank++, primaryRank: r });
  }

  for (const tripsRank of RANKS) {
    for (const pairRank of RANKS) {
      if (pairRank === tripsRank) continue;
      bids.push({
        id: `full-house-${tripsRank}-${pairRank}`,
        display: `full house, ${RANK_DISPLAY[tripsRank]}s full of ${RANK_DISPLAY[pairRank]}s`,
        category: 'full-house',
        rank: rank++,
        primaryRank: tripsRank,
        secondaryRank: pairRank,
      });
    }
  }

  for (const r of RANKS) {
    bids.push({ id: `four-of-a-kind-${r}`, display: `four of a kind, ${RANK_DISPLAY[r]}s`, category: 'four-of-a-kind', rank: rank++, primaryRank: r });
  }

  for (const r of STRAIGHT_HIGHS.filter((r) => r < 14)) {
    bids.push({ id: `straight-flush-${r}`, display: `${RANK_DISPLAY[r]}-high straight flush`, category: 'straight-flush', rank: rank++, primaryRank: r });
  }

  bids.push({ id: 'royal-flush', display: 'royal flush', category: 'royal-flush', rank: rank++ });

  return bids;
}

export const ALL_BIDS: Bid[] = buildBidList();

export const BID_BY_ID: Map<string, Bid> = new Map(ALL_BIDS.map((b) => [b.id, b]));

export function getBid(id: string): Bid | undefined {
  return BID_BY_ID.get(id);
}

export function compareBids(a: Bid, b: Bid): number {
  return a.rank - b.rank;
}

export function getNextBids(afterBid: Bid, limit = 20): Bid[] {
  return ALL_BIDS.filter((b) => b.rank > afterBid.rank).slice(0, limit);
}

export function getLowestBid(): Bid {
  return ALL_BIDS[0];
}

export function getBidSummaryForPrompt(): string {
  const lines: string[] = [
    'Valid bid IDs (in ascending order of strength):',
    '',
    '--- HIGH CARD ---',
    ALL_BIDS.filter((b) => b.category === 'high-card').map((b) => `  ${b.id}  →  "${b.display}"`).join('\n'),
    '',
    '--- PAIR ---',
    ALL_BIDS.filter((b) => b.category === 'pair').map((b) => `  ${b.id}  →  "${b.display}"`).join('\n'),
    '',
    '--- TWO PAIR (high pair - low pair) ---',
    '  two-pair-{highRank}-{lowRank}  e.g. two-pair-14-13 → "two pair, aces and kings"',
    '',
    '--- THREE OF A KIND ---',
    ALL_BIDS.filter((b) => b.category === 'three-of-a-kind').map((b) => `  ${b.id}  →  "${b.display}"`).join('\n'),
    '',
    '--- STRAIGHT ---',
    ALL_BIDS.filter((b) => b.category === 'straight').map((b) => `  ${b.id}  →  "${b.display}"`).join('\n'),
    '',
    '--- FLUSH ---',
    ALL_BIDS.filter((b) => b.category === 'flush').map((b) => `  ${b.id}  →  "${b.display}"`).join('\n'),
    '',
    '--- FULL HOUSE (trips-pair) ---',
    '  full-house-{tripsRank}-{pairRank}  e.g. full-house-14-13 → "full house, aces full of kings"',
    '',
    '--- FOUR OF A KIND ---',
    ALL_BIDS.filter((b) => b.category === 'four-of-a-kind').map((b) => `  ${b.id}  →  "${b.display}"`).join('\n'),
    '',
    '--- STRAIGHT FLUSH ---',
    ALL_BIDS.filter((b) => b.category === 'straight-flush').map((b) => `  ${b.id}  →  "${b.display}"`).join('\n'),
    '',
    '--- ROYAL FLUSH ---',
    '  royal-flush  →  "royal flush"',
  ];
  return lines.join('\n');
}
