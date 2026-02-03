import * as Phaser from 'phaser';
import { Bullet } from './Bullet';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private hp: number = 100;
  private speed: number = 220;
  private weapon: any;
  private lastFired = 0;
  private isMoving = false;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setTint(0x00ff00);
    this.setScale(0.8);
  }
  
  configure(hp: number, speed: number, weapon: any): void {
    this.hp = hp;
    this.speed = speed;
    this.weapon = weapon;
  }
  
  getHP(): number { return this.hp; }
  setHP(hp: number): void { this.hp = hp; }
  getIsMoving(): boolean { return this.isMoving; }
  
  update(keys: any, time: number): void {
    let vx = 0, vy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) vy = -1;
    if (keys['KeyS'] || keys['ArrowDown']) vy = 1;
    if (keys['KeyA'] || keys['ArrowLeft']) vx = -1;
    if (keys['KeyD'] || keys['ArrowRight']) vx = 1;
    this.isMoving = vx !== 0 || vy !== 0;
    if (this.isMoving) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len; vy /= len;
    }
    this.setVelocity(vx * this.speed, vy * this.speed);
  }
  
  canFire(time: number): boolean {
    return time - this.lastFired > 1000 / this.weapon.fireRate;
  }
  
  fire(time: number, angle: number, bulletGroup: Phaser.Physics.Arcade.Group): Bullet {
    this.lastFired = time;
    const bullet = new Bullet(this.scene, this.x, this.y, 'bullet');
    bullet.configure(this.weapon.damage, this.weapon.bulletSpeed, 0);
    bullet.fire(angle);
    bulletGroup.add(bullet);
    return bullet;
  }
  
  takeDamage(amount: number): void { this.hp -= amount; }
}
