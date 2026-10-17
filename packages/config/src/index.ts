import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

dotenv.config();

export interface PlayerConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'mistral' | 'qwen' | 'glm' | 'kimi';
  model: string;
  enabled: boolean;
}

export interface GameConfig {
  players: PlayerConfig[];
  simulation: {
    gamesPerRun: number;
    maxSetsPerGame: number;
    delayBetweenTurnsMs: number;
    maxBidsPerSet: number;
  };
  database: {
    url: string;
  };
  api: {
    port: number;
  };
  web: {
    port: number;
  };
}

function interpolateEnv(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] ?? '');
}

function interpolateConfig(obj: unknown): unknown {
  if (typeof obj === 'string') return interpolateEnv(obj);
  if (Array.isArray(obj)) return obj.map(interpolateConfig);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, interpolateConfig(v)])
    );
  }
  return obj;
}

function loadConfig(): GameConfig {
  const configPath = path.resolve(process.cwd(), 'game.config.yaml');
  const altPath = path.resolve(process.cwd(), '../../game.config.yaml');

  const filePath = fs.existsSync(configPath) ? configPath : altPath;
  const raw = yaml.load(fs.readFileSync(filePath, 'utf8'));
  return interpolateConfig(raw) as GameConfig;
}

export const config = loadConfig();

export function getEnabledPlayers(): PlayerConfig[] {
  return config.players.filter((p) => p.enabled);
}
