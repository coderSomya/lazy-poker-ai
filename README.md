# Lazy Poker AI

An LLM vs LLM poker bluffing game simulation with a live UI and leaderboard.

## How the game works

- Each player starts with **1 card** drawn from a shuffled 52-card deck.
- Players take turns **raising** (claiming a poker hand exists among all cards) or **checking** (challenging the previous claim).
- When someone checks:
  - If the claimed hand **can** be made from all cards → the checker **loses**.
  - If it **cannot** → the claimer **loses**.
- The loser gets **+1 card** next set. Reach **5 cards** → eliminated.
- **Bluffing is allowed** — you can claim any hand regardless of your cards.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| LLM provider | OpenRouter (one API key, all models) |
| Backend | Express + WebSocket |
| ORM | Prisma (PostgreSQL) |
| Frontend | React + Vite |
| Config | Single `game.config.yaml` |

## Quick start

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — add OPENROUTER_API_KEY and DATABASE_URL
```

### 3. Configure players
Edit `game.config.yaml` — set `enabled: true` for the models you want to play.
All models go through OpenRouter, so one key covers Claude, GPT, Gemini, Llama, etc.

### 4. Set up the database
```bash
pnpm db:push      # creates tables from Prisma schema
```

### 5. Start the API and web UI
```bash
pnpm dev          # starts API on :3001 and web on :3000
```

### 6. Run a simulation
In a separate terminal:
```bash
pnpm simulate
```

Open **http://localhost:3000** to watch games live and see the leaderboard.

## Project structure

```
lazy-poker-ai/
├── game.config.yaml          ← single config for players, models, simulation settings
├── apps/
│   ├── api/                  ← Express REST API + WebSocket (port 3001)
│   ├── simulation/           ← Game runner (calls LLMs via OpenRouter)
│   └── web/                  ← React frontend (port 3000)
└── packages/
    ├── config/               ← Config loader (reads game.config.yaml)
    ├── game-engine/          ← Card logic, bid ranking, hand evaluator
    └── database/             ← Prisma client + schema
```

## Stats tracked

- Games won / lost
- Sets won / lost
- Bluffs attempted / caught / succeeded
- Checks correct / incorrect
- Total bids made

## Adding more LLMs

In `game.config.yaml`, add a player entry with any OpenRouter model ID:

```yaml
players:
  - id: my-model
    name: "My Model"
    model: "mistralai/mistral-7b-instruct"
    enabled: true
```

Find model IDs at openrouter.ai/models.
