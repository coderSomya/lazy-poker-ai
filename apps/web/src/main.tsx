import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import SimulationPage from './pages/SimulationPage.js';
import LeaderboardPage from './pages/LeaderboardPage.js';
import GameDetailPage from './pages/GameDetailPage.js';
import './styles.css';

function Nav() {
  return (
    <nav className="nav">
      <span className="nav-brand">🃏 Lazy Poker AI</span>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Live Simulation</NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>Leaderboard</NavLink>
      </div>
    </nav>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<SimulationPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/games/:id" element={<GameDetailPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  </React.StrictMode>
);
