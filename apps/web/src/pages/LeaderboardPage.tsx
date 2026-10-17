import React from 'react';
import { useApi } from '../hooks/useApi.js';

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  model: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: string;
  setsWon: number;
  setsLost: number;
  bluffsAttempted: number;
  bluffsCaught: number;
  bluffsSucceeded: number;
  bluffSuccessRate: string;
  checksCorrect: number;
  checksIncorrect: number;
  totalBidsMade: number;
}

function RankBadge({ rank }: { rank: number }) {
  const cls = rank <= 3 ? `rank-badge rank-${rank}` : 'rank-badge';
  const label = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
  return <span className={cls}>{label}</span>;
}

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, width: 80 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

export default function LeaderboardPage() {
  const { data, loading } = useApi<LeaderboardEntry[]>('/api/leaderboard', 15000);

  if (loading) return <div className="empty">Loading leaderboard…</div>;
  if (!data || data.length === 0) return <div className="empty">No data yet. Run a simulation first.</div>;

  const maxGames = Math.max(...data.map((e) => e.gamesPlayed));
  const maxBluffs = Math.max(...data.map((e) => e.bluffsAttempted), 1);

  return (
    <div>
      <h1>Leaderboard</h1>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{data.length}</div>
          <div className="stat-label">Players</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{data.reduce((s, e) => s + e.gamesPlayed, 0) / data.length | 0}</div>
          <div className="stat-label">Avg Games/Player</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{data.reduce((s, e) => s + e.bluffsAttempted, 0)}</div>
          <div className="stat-label">Total Bluffs</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{data.reduce((s, e) => s + e.checksCorrect, 0)}</div>
          <div className="stat-label">Bluffs Caught</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Model</th>
              <th>Games</th>
              <th>Win Rate</th>
              <th>Sets W/L</th>
              <th>Bluffs</th>
              <th>Bluff Success</th>
              <th>Checks ✓/✗</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.playerId}>
                <td><RankBadge rank={entry.rank} /></td>
                <td style={{ fontWeight: 600 }}>{entry.playerName}</td>
                <td><span className="tag">{entry.model}</span></td>
                <td>
                  <div>{entry.gamesPlayed}</div>
                  <StatBar value={entry.gamesPlayed} max={maxGames} color="var(--accent)" />
                </td>
                <td>
                  <span className={`badge ${parseFloat(entry.winRate) >= 50 ? 'badge-green' : 'badge-red'}`}>
                    {entry.winRate}%
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {entry.gamesWon}W / {entry.gamesLost}L
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{entry.setsWon}W / {entry.setsLost}L</td>
                <td>
                  <div>{entry.bluffsAttempted} total</div>
                  <StatBar value={entry.bluffsAttempted} max={maxBluffs} color="var(--yellow)" />
                </td>
                <td>
                  <span className={`badge ${parseFloat(entry.bluffSuccessRate) >= 50 ? 'badge-green' : 'badge-red'}`}>
                    {entry.bluffSuccessRate}%
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {entry.bluffsSucceeded} succeeded / {entry.bluffsCaught} caught
                  </div>
                </td>
                <td>
                  <span className="badge badge-green">{entry.checksCorrect}✓</span>
                  {' '}
                  <span className="badge badge-red">{entry.checksIncorrect}✗</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
