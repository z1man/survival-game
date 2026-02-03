// SpecLoader.ts - 内嵌规格数据 (浏览器兼容)

const DEFAULT_SPEC: any = {
  version: "0.1",
  seed: 88421,
  meta: { title: "One Room, Many Fates", difficultyTarget: "medium", sessionSeconds: 120 },
  arena: { width: 960, height: 540, walls: true },
  player: { hp: 100, speed: 220, weapon: { type: "pistol", fireRate: 5, damage: 8, bulletSpeed: 520 } },
  enemies: { spawn: { pattern: "waves", everySeconds: 8, count: 4 }, templates: [{ id: "chaser", hp: 22, speed: 135, behavior: "ChasePlayer" }] },
  rules: [{ type: "NoIdleDamage", params: { dps: 1.4, idleGraceMs: 700 } }, { type: "BulletBounce", params: { maxBounces: 2 } }],
  winCondition: { type: "SurviveTime", params: { seconds: 90 } }
};

const RULES_CATALOG: Record<string, any> = {
  NoIdleDamage: { params: { dps: [0.5, 6], idleGraceMs: [0, 1500] }, mustEmit: ["rule_effect:idle_damage"] },
  BulletBounce: { params: { maxBounces: [0, 6] }, mustEmit: ["rule_effect:bullet_bounce"] }
};

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
  return { ...DEFAULT_SPEC, ...overrides };
}

export function loadRulesCatalog(): Record<string, any> {
  return { ...RULES_CATALOG };
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
