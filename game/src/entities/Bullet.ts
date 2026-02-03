import * as Phaser from 'phaser';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  private damage: number = 8;
  private bouncesRemaining: number = 0;
  private bounceCallback?: (bullet: Bullet) => void;
  
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body!.onWorldBounds = true;
    this.setTint(0xffff00);
    this.setScale(0.3);
  }
  
  configure(damage: number, speed: number, bounces: number, bounceCallback?: (bullet: Bullet) => void): void {
    this.damage = damage;
    this.bouncesRemaining = bounces;
    this.bounceCallback = bounceCallback;
    this.setVelocity(speed, 0);
  }
  
  fire(angle: number): void {
    this.scene.physics.velocityFromRotation(angle, 520, this.body!.velocity);
  }
  
  getDamage(): number { return this.damage; }
  getBouncesRemaining(): number { return this.bouncesRemaining; }
  recordBounce(): void {
    this.bouncesRemaining--;
    if (this.bounceCallback) this.bounceCallback(this);
  }
}
