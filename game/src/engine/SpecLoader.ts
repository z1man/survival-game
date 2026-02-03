import gameSpec from '../../spec/gameSpec.json';
import rulesCatalog from '../../spec/rules.catalog.json';

export interface GameSpec {
  version: string;
  seed: number;
  meta: { title: string; difficultyTarget: string; sessionSeconds: number };
  arena: { width: number; height: number; walls: boolean };
  player: { hp: number; speed: number; weapon: any };
  enemies: { spawn: { pattern: string; everySeconds: number; count: number }; templates: any[] };
  rules: Array<{ type: string; params: any }>;
  winCondition: { type: string; params: { seconds: number } };
}

export function loadSpec(overrides?: Partial<GameSpec>): GameSpec {
  return { ...gameSpec, ...overrides };
}

export function loadRulesCatalog(): Record<string, any> {
  return rulesCatalog;
}

export function getSpecHash(spec: GameSpec): string {
  const str = JSON.stringify(spec);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
