import { GameRule, RuleContext, validateParams } from '../engine/RuleEngine';

export class NoIdleDamage implements GameRule {
  type = 'NoIdleDamage';
  params: { dps: number; idleGraceMs: number };
  private lastMoveTime = 0;
  private idleTimerStarted = false;
  
  constructor(params: any) {
    this.params = params;
    validateParams(params, { params: { dps: [0.5, 6], idleGraceMs: [0, 1500] }, mustEmit: [] });
  }
  
  onStart(ctx: RuleContext): void {
    this.lastMoveTime = ctx.gameTime;
    this.idleTimerStarted = false;
    ctx.telemetry.emit('rule_start', { type: this.type, params: this.params });
  }
  
  onTick(ctx: RuleContext, dt: number): void {
    const player = ctx.entities.player as any;
    if (!player || player.hp <= 0) return;
    
    const isMoving = player.isMoving || false;
    if (isMoving) {
      this.lastMoveTime = ctx.gameTime;
      this.idleTimerStarted = false;
    } else if (ctx.gameTime - this.lastMoveTime > this.params.idleGraceMs) {
      if (!this.idleTimerStarted) {
        this.idleTimerStarted = true;
        ctx.telemetry.emit('rule_effect:idle_damage', { dps: this.params.dps, idleGraceMs: this.params.idleGraceMs });
      }
      const damage = this.params.dps * (dt / 1000);
      player.hp -= damage;
      ctx.telemetry.emit('player_damage', { amount: damage, reason: 'idle' });
      if (player.hp <= 0) ctx.telemetry.emit('player_dead', { reason: 'idle_damage' });
    }
  }
  
  onEvent(ctx: RuleContext, evt: string): void {
    if (evt === 'PlayerMoved') this.lastMoveTime = ctx.gameTime;
  }
}
