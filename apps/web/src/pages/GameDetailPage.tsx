import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';

interface GameDetail {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  winnerId: string | null;
  loserId: string | null;
  gamePlayers: { player: { id: string; name: string; model: string }; finalCardCount: number }[];
  sets: {
    id: string;
    setNumber: number;
    loserId: string | null;
    winnerId: string | null;
    bluffCaught: boolean | null;
    bidValid: boolean | null;
    finalBidId: string | null;
    bids: {
      id: string;
      playerId: string;
      playerName: string;
      action: string;
      bidId: string | null;
      bidDisplay: string | null;
    }[];
    cardCounts: { playerId: string; count: number }[];
  }[];
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: game, loading } = useApi<GameDetail>(`/api/games/${id}`);

  if (loading) return <div className="empty">Loading…</div>;
  if (!game) return <div className="empty">Game not found.</div>;

  const playerMap = Object.fromEntries(game.gamePlayers.map((gp) => [gp.player.id, gp.player.name]));
  const winner = game.winnerId ? playerMap[game.winnerId] : null;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={{ color: 'var(--muted)', fontSize: 13 }}>← Back</Link>
      </div>
      <h1>Game {game.id.slice(0, 8)}…</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="tag">Status</div>
            <span className={`badge ${game.status === 'finished' ? 'badge-green' : 'badge-yellow'}`}>
              {game.status}
            </span>
          </div>
          {winner && (
            <div>
              <div className="tag">Winner</div>
              <strong>🏆 {winner}</strong>
            </div>
          )}
          <div>
            <div className="tag">Sets played</div>
            <strong>{game.sets.length}</strong>
          </div>
          <div>
            <div className="tag">Duration</div>
            <strong>
              {game.finishedAt
                ? `${Math.round((new Date(game.finishedAt).getTime() - new Date(game.startedAt).getTime()) / 1000)}s`
                : 'ongoing'}
            </strong>
          </div>
        </div>
      </div>

      <h2>Players</h2>
      <div className="grid3" style={{ marginBottom: 20 }}>
        {game.gamePlayers.map((gp) => (
          <div key={gp.player.id} className="card">
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{gp.player.name}</div>
            <div className="tag">{gp.player.model}</div>
            <div style={{ marginTop: 8 }}>
              Final cards: <strong>{gp.finalCardCount}</strong>
              {game.winnerId === gp.player.id && <span className="badge badge-green" style={{ marginLeft: 8 }}>Winner</span>}
              {game.loserId === gp.player.id && <span className="badge badge-red" style={{ marginLeft: 8 }}>Eliminated</span>}
            </div>
          </div>
        ))}
      </div>

      <h2>Sets</h2>
      {game.sets.map((set) => (
        <div key={set.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong>Set {set.setNumber}</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              {set.bluffCaught && <span className="badge badge-yellow">🎯 Bluff caught</span>}
              {set.loserId && (
                <span className="badge badge-red">Loser: {playerMap[set.loserId] ?? set.loserId}</span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div className="tag" style={{ marginBottom: 4 }}>Cards held this set</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {set.cardCounts.map((cc) => (
                <span key={cc.playerId} style={{ fontSize: 13 }}>
                  {playerMap[cc.playerId] ?? cc.playerId}: {cc.count}
                </span>
              ))}
            </div>
          </div>

          <div className="bid-history">
            {set.bids.map((bid, i) => (
              <div key={bid.id} className="bid-entry">
                <span className="player-tag">{bid.playerName}</span>
                {bid.action === 'check' ? (
                  <span className="badge badge-red">CHECK</span>
                ) : (
                  <>
                    <span className="badge badge-purple">RAISE</span>
                    <span>{bid.bidDisplay}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
