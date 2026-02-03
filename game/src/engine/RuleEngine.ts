import { Telemetry } from './Telemetry';
import { RNG } from './RNG';

export interface GameRule {
  type: string;
  params: Record<string, any>;
  onStart?(ctx: RuleContext): void;
  onTick?(ctx: RuleContext, dt: number): void;
  onEvent?(ctx: RuleContext, evt: string, data?: any): void;
}

export interface RuleContext {
  rng: RNG;
  telemetry: Telemetry;
  gameTime: number;
  spec: any;
  entities: {
    player: any;
    enemies: any[];
    bullets: any[];
  };
}

export interface RuleCatalogEntry {
  params: Record<string, [number, number]>;
  mustEmit: string[];
}

const ruleRegistry: Record<string, new (params: any) => GameRule> = {};

export function registerRule(name: string, ruleClass: new (params: any) => GameRule): void {
  ruleRegistry[name] = ruleClass;
}

export function createRule(type: string, params: any): GameRule {
  const RuleClass = ruleRegistry[type];
  if (!RuleClass) throw new Error(`Unknown rule type: ${type}`);
  return new RuleClass(params);
}

export function validateParams(params: Record<string, any>, catalog: RuleCatalogEntry): void {
  for (const [key, [min, max]] of Object.entries(catalog.params)) {
    const value = params[key];
    if (value === undefined || value === null) throw new Error(`Missing param: ${key}`);
    if (typeof value !== 'number' || value < min || value > max) {
      throw new Error(`Param ${key} must be in [${min}, ${max}], got ${value}`);
    }
  }
}

export class RuleEngine {
  private rules: GameRule[] = [];
  private telemetry: Telemetry;
  private rng: RNG;
  private getGameTime: () => number;
  
  constructor(telemetry: Telemetry, rng: RNG, getGameTime: () => number) {
    this.telemetry = telemetry;
    this.rng = rng;
    this.getGameTime = getGameTime;
  }
  
  addRule(rule: GameRule): void {
    this.rules.push(rule);
  }
  
  start(ctx: RuleContext): void {
    this.rules.forEach(r => r.onStart?.(ctx));
  }
  
  tick(ctx: RuleContext, dt: number): void {
    this.rules.forEach(r => r.onTick?.(ctx, dt));
  }
  
  emit(evt: string, data?: any): void {
    this.rules.forEach(r => r.onEvent?.({
      ...this.getCurrentContext(),
      gameTime: this.getGameTime()
    }, evt, data));
  }
  
  private getCurrentContext(): RuleContext {
    return {
      rng: this.rng,
      telemetry: this.telemetry,
      gameTime: this.getGameTime(),
      spec: {},
      entities: { player: null, enemies: [], bullets: [] }
    };
  }
}
