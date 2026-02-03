import * as Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private hp: number = 22;
  private speed: number = 135;
  private lastDamageTime = 0;
  private templateId: string = 'chaser';
  
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setTint(0xff0000);
    this.setScale(0.7);
  }
  
  configure(template: any): void {
    this.hp = template.hp;
    this.speed = template.speed;
    this.templateId = template.id;
  }
  
  getHP(): number { return this.hp; }
  setHP(hp: number): void { this.hp = hp; }
  getTemplateId(): string { return this.templateId; }
  
  update(player: Phaser.Physics.Arcade.Sprite, time: number): void {
    this.scene.physics.moveToObject(this, player, this.speed);
  }
  
  takeDamage(amount: number): void { this.hp -= amount; }
  canDamage(time: number): boolean { return time - this.lastDamageTime > 1000; }
  recordDamage(time: number): void { this.lastDamageTime = time; }
}
