import { Card, Rank } from './cards';
import { Bid, ALL_BIDS } from './bids';

interface HandResult {
  category: Bid['category'];
  primaryRank?: Rank;
  secondaryRank?: Rank;
  score: number;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5Card(hand: Card[]): HandResult {
  const ranks = hand.map((c) => c.rank).sort((a, b) => b - a) as Rank[];
  const suits = hand.map((c) => c.suit);
  const rankCounts = new Map<Rank, number>();
  for (const r of ranks) rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1);

  const isFlush = suits.every((s) => s === suits[0]);
  const isStraight = checkStraight(ranks);
  const straightHigh = isStraight ? getStraightHigh(ranks) : undefined;

  const counts = [...rankCounts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const groups = counts.map(([rank, count]) => ({ rank, count }));

  if (isFlush && isStraight && straightHigh === 14) {
    return { category: 'royal-flush', score: bidRank('royal-flush') };
  }

  if (isFlush && isStraight && straightHigh) {
    return { category: 'straight-flush', primaryRank: straightHigh as Rank, score: bidRank(`straight-flush-${straightHigh}`) };
  }

  if (groups[0].count === 4) {
    return { category: 'four-of-a-kind', primaryRank: groups[0].rank, score: bidRank(`four-of-a-kind-${groups[0].rank}`) };
  }

  if (groups[0].count === 3 && groups[1]?.count === 2) {
    return {
      category: 'full-house',
      primaryRank: groups[0].rank,
      secondaryRank: groups[1].rank,
      score: bidRank(`full-house-${groups[0].rank}-${groups[1].rank}`),
    };
  }

  if (isFlush) {
    return { category: 'flush', primaryRank: ranks[0], score: bidRank(`flush-${ranks[0]}`) };
  }

  if (isStraight && straightHigh) {
    return { category: 'straight', primaryRank: straightHigh as Rank, score: bidRank(`straight-${straightHigh}`) };
  }

  if (groups[0].count === 3) {
    return { category: 'three-of-a-kind', primaryRank: groups[0].rank, score: bidRank(`three-of-a-kind-${groups[0].rank}`) };
  }

  if (groups[0].count === 2 && groups[1]?.count === 2) {
    const highPair = Math.max(groups[0].rank, groups[1].rank) as Rank;
    const lowPair = Math.min(groups[0].rank, groups[1].rank) as Rank;
    return {
      category: 'two-pair',
      primaryRank: highPair,
      secondaryRank: lowPair,
      score: bidRank(`two-pair-${highPair}-${lowPair}`),
    };
  }

  if (groups[0].count === 2) {
    return { category: 'pair', primaryRank: groups[0].rank, score: bidRank(`pair-${groups[0].rank}`) };
  }

  return { category: 'high-card', primaryRank: ranks[0], score: bidRank(`high-card-${ranks[0]}`) };
}

function checkStraight(sortedRanks: Rank[]): boolean {
  const aceLow = [14, 5, 4, 3, 2] as Rank[];
  if (sortedRanks.join(',') === aceLow.join(',')) return true;
  for (let i = 0; i < sortedRanks.length - 1; i++) {
    if (sortedRanks[i] - sortedRanks[i + 1] !== 1) return false;
  }
  return true;
}

function getStraightHigh(sortedRanks: Rank[]): number {
  const aceLow = [14, 5, 4, 3, 2];
  if (sortedRanks.join(',') === aceLow.join(',')) return 5;
  return sortedRanks[0];
}

const bidRankCache = new Map<string, number>();
function bidRank(id: string): number {
  if (!bidRankCache.has(id)) {
    const bid = ALL_BIDS.find((b) => b.id === id);
    bidRankCache.set(id, bid?.rank ?? -1);
  }
  return bidRankCache.get(id)!;
}

export function bestHand(cards: Card[]): HandResult | null {
  if (cards.length < 5) return null;
  let best: HandResult | null = null;
  for (const combo of combinations(cards, 5)) {
    const result = evaluate5Card(combo);
    if (best === null || result.score > best.score) {
      best = result;
    }
  }
  return best;
}

export function verifyBid(bid: Bid, allCards: Card[]): boolean {
  const best = bestHand(allCards);
  if (!best) return false;
  return best.score >= bid.rank;
}

export { HandResult };
