import 'dotenv/config';
import { config, getEnabledPlayers } from '@lazy-poker/config';
import { runGame } from './game-runner';
import { ensurePlayers, createGameRecord, recordSet, finalizeGame } from './reporter';

const API_HOST = process.env.API_HOST ?? 'http://localhost:3001';

async function postEvent(event: unknown): Promise<void> {
  try {
    await fetch(`${API_HOST}/api/simulation/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // API may not be running — continue silently
  }
  const e = event as Record<string, unknown>;
  if (e.type !== 'turn') {
    console.log('[SIM]', JSON.stringify(event));
  }
}

async function main(): Promise<void> {
  const players = getEnabledPlayers();
  if (players.length < 2) {
    console.error('Need at least 2 enabled players in game.config.yaml');
    process.exit(1);
  }

  console.log(`Starting ${config.simulation.gamesPerRun} game(s) with ${players.length} players:`);
  players.forEach((p) => console.log(`  - ${p.name} (${p.model})`));

  await ensurePlayers(players);

  for (let g = 1; g <= config.simulation.gamesPerRun; g++) {
    console.log(`\n=== GAME ${g} / ${config.simulation.gamesPerRun} ===`);
    const gameId = await createGameRecord(players.map((p) => p.id));

    const state = await runGame(
      players,
      gameId,
      async (event) => { await postEvent({ ...event as object, gameId }); },
      async (setNumber, result, bidHistory, cardCounts) => {
        await recordSet(gameId, setNumber, result, bidHistory, cardCounts);
      }
    );

    const finalCardCounts: Record<string, number> = {};
    for (const p of state.players) finalCardCounts[p.id] = p.cardCount;
    await finalizeGame(gameId, state, finalCardCounts);

    console.log(`Game ${g} finished. Winner: ${state.winnerId ?? 'none'}`);
  }

  console.log('\nSimulation complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
