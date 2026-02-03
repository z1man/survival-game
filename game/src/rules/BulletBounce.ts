import { GameRule, RuleContext, validateParams } from '../engine/RuleEngine';

export class BulletBounce implements GameRule {
  type = 'BulletBounce';
  params: { maxBounces: number };
  
  constructor(params: any) {
    this.params = params;
    validateParams(params, { params: { maxBounces: [0, 6] }, mustEmit: [] });
  }
  
  onStart(ctx: RuleContext): void {
    ctx.telemetry.emit('rule_start', { type: this.type, params: this.params });
  }
  
  onEvent(ctx: RuleContext, evt: string, data?: any): void {
    if (evt === 'BulletHitWall' && data?.bullet) {
      data.bullet.bouncesRemaining--;
      ctx.telemetry.emit('rule_effect:bullet_bounce', { remaining: data.bullet.bouncesRemaining });
    }
  }
}
