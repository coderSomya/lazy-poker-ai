import { prisma } from '@lazy-poker/database';
import { GameState, SetResult, BidEntry } from '@lazy-poker/game-engine';
import { PlayerConfig } from '@lazy-poker/config';

export async function ensurePlayers(players: PlayerConfig[]): Promise<void> {
  for (const p of players) {
    await prisma.playerProfile.upsert({
      where: { id: p.id },
      create: { id: p.id, name: p.name, model: p.model },
      update: { name: p.name, model: p.model },
    });
    await prisma.playerStats.upsert({
      where: { playerId: p.id },
      create: { playerId: p.id },
      update: {},
    });
  }
}

export async function createGameRecord(playerIds: string[]): Promise<string> {
  const game = await prisma.game.create({
    data: {
      gamePlayers: {
        create: playerIds.map((id) => ({ playerId: id })),
      },
    },
  });
  return game.id;
}

export async function recordSet(
  gameId: string,
  setNumber: number,
  result: SetResult,
  bidHistory: BidEntry[],
  cardCounts: Record<string, number>
): Promise<void> {
  await prisma.gameSet.create({
    data: {
      gameId,
      setNumber,
      loserId: result.loserId,
      winnerId: result.winnerId,
      finalBidId: result.finalBid.id,
      bidValid: result.bidWasValid,
      bluffCaught: result.bluffCaught,
      bids: {
        create: bidHistory.map((b) => ({
          playerId: b.playerId,
          playerName: b.playerName,
          action: b.action,
          bidId: b.bid?.id,
          bidDisplay: b.bid?.display,
        })),
      },
      cardCounts: {
        create: Object.entries(cardCounts).map(([playerId, count]) => ({ playerId, count })),
      },
    },
  });

  for (const bid of bidHistory) {
    if (bid.action === 'raise') {
      await prisma.playerStats.update({
        where: { playerId: bid.playerId },
        data: { totalBidsMade: { increment: 1 } },
      });
    }
  }

  await prisma.playerStats.update({
    where: { playerId: result.loserId },
    data: { setsLost: { increment: 1 }, setsPlayed: { increment: 1 } },
  });
  await prisma.playerStats.update({
    where: { playerId: result.winnerId },
    data: { setsWon: { increment: 1 }, setsPlayed: { increment: 1 } },
  });

  if (result.bluffCaught) {
    await prisma.playerStats.update({
      where: { playerId: result.loserId },
      data: { bluffsAttempted: { increment: 1 }, bluffsCaught: { increment: 1 } },
    });
    await prisma.playerStats.update({
      where: { playerId: result.winnerId },
      data: { checksCorrect: { increment: 1 } },
    });
  } else {
    await prisma.playerStats.update({
      where: { playerId: result.winnerId },
      data: { bluffsAttempted: { increment: 1 }, bluffsSucceeded: { increment: 1 } },
    });
    await prisma.playerStats.update({
      where: { playerId: result.loserId },
      data: { checksIncorrect: { increment: 1 } },
    });
  }
}

export async function finalizeGame(
  gameId: string,
  state: GameState,
  cardCounts: Record<string, number>
): Promise<void> {
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'finished',
      finishedAt: new Date(),
      winnerId: state.winnerId ?? undefined,
      loserId: state.loserId ?? undefined,
    },
  });

  for (const [playerId, finalCount] of Object.entries(cardCounts)) {
    await prisma.gamePlayer.updateMany({
      where: { gameId, playerId },
      data: { finalCardCount: finalCount },
    });
  }

  if (state.winnerId) {
    await prisma.playerStats.update({
      where: { playerId: state.winnerId },
      data: { gamesWon: { increment: 1 }, gamesPlayed: { increment: 1 } },
    });
  }
  if (state.loserId) {
    await prisma.playerStats.update({
      where: { playerId: state.loserId },
      data: { gamesLost: { increment: 1 }, gamesPlayed: { increment: 1 } },
    });
  }
  const otherPlayers = Object.keys(cardCounts).filter(
    (id) => id !== state.winnerId && id !== state.loserId
  );
  for (const id of otherPlayers) {
    await prisma.playerStats.update({
      where: { playerId: id },
      data: { gamesPlayed: { increment: 1 } },
    });
  }
}
