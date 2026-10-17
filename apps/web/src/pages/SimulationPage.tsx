import React from 'react';
import { Link } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { useApi } from '../hooks/useApi.js';

interface SimEvent {
  type: string;
  gameId?: string;
  player?: string;
  players?: { id: string; name: string; cardCount?: number; cards?: string[] }[];
  action?: string;
  bid?: string;
  reasoning?: string;
  winner?: string;
  loser?: string;
  setNumber?: number;
  finalBid?: string;
  bidValid?: boolean;
  bluffCaught?: boolean;
  allCards?: Record<string, string[]>;
}

function eventClass(type: string, action?: string): string {
  if (type === 'game-start') return 'event-item game-start';
  if (type === 'game-end') return 'event-item game-end';
  if (type === 'set-start') return 'event-item set-start';
  if (type === 'set-end') return 'event-item set-end';
  if (type === 'eliminated') return 'event-item eliminated';
  if (type === 'turn' && action === 'check') return 'event-item turn-check';
  return 'event-item turn-raise';
}

function renderEvent(ev: SimEvent, idx: number) {
  const { type, gameId, player, players, action, bid, reasoning, winner, loser, setNumber, finalBid, bidValid, bluffCaught, allCards } = ev;

  let title = '';
  let detail = '';

  if (type === 'game-start') {
    title = `🎮 Game started`;
    detail = `Players: ${players?.map((p) => p.name).join(', ')}`;
  } else if (type === 'game-end') {
    title = `🏆 Game over — Winner: ${winner}, Eliminated: ${loser}`;
    detail = gameId ? `Game ID: ${gameId}` : '';
  } else if (type === 'set-start') {
    title = `🃏 Set ${setNumber} begins`;
    detail = players?.map((p) => `${p.name}: ${p.cardCount} card(s) [${p.cards?.join(', ')}]`).join(' | ') ?? '';
  } else if (type === 'set-end') {
    const emoji = bluffCaught ? '🎯 Bluff caught!' : bidValid ? '✅ Bid valid' : '❌ Bid invalid';
    title = `${emoji} — Set ${setNumber} ends. Final bid: "${finalBid}". Loser: ${loser}`;
    detail = allCards
      ? Object.entries(allCards).map(([n, c]) => `${n}: [${c.join(', ')}]`).join(' | ')
      : '';
  } else if (type === 'turn') {
    if (action === 'check') {
      title = `🔍 ${player} CHECKS`;
    } else {
      title = `↑ ${player} raises → "${bid}"`;
    }
    detail = reasoning ? `"${reasoning}"` : '';
  } else if (type === 'eliminated') {
    title = `💀 ${player} is eliminated (5 cards reached)`;
  }

  return (
    <div key={idx} className={eventClass(type, action)}>
      <div>{title}</div>
      {detail && <div className="event-meta">{detail}</div>}
    </div>
  );
}

interface RecentGame {
  id: string;
  status: string;
  startedAt: string;
  winnerId: string | null;
  gamePlayers: { player: { name: string } }[];
  sets: { id: string }[];
}

export default function SimulationPage() {
  const { events, connected } = useWebSocket(300);
  const { data: recentGames } = useApi<RecentGame[]>('/api/games', 10000);

  const simEvents: SimEvent[] = events.map((e) => ({ type: e.type, ...(e.data as object) }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Live Simulation</h1>
        <div className="connected-badge">
          <span className={`dot ${connected ? 'dot-green' : 'dot-red'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Event Stream</h2>
          {simEvents.length === 0 ? (
            <div className="empty">No events yet. Start the simulation to see live activity.</div>
          ) : (
            <div className="event-log">
              {[...simEvents].reverse().map((ev, i) => renderEvent(ev, i))}
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h2>Recent Games</h2>
            {!recentGames || recentGames.length === 0 ? (
              <div className="empty">No games yet.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Players</th>
                    <th>Sets</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentGames.slice(0, 20).map((g) => (
                    <tr key={g.id}>
                      <td>
                        <span className={`badge ${g.status === 'finished' ? 'badge-green' : 'badge-yellow'}`}>
                          {g.status}
                        </span>
                      </td>
                      <td>{g.gamePlayers.map((gp) => gp.player.name).join(', ')}</td>
                      <td>{g.sets.length}</td>
                      <td>
                        <Link to={`/games/${g.id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
