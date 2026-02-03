import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Bullet } from '../entities/Bullet';
import { RNG } from '../engine/RNG';
import { Telemetry } from '../engine/Telemetry';
import { RuleEngine, createRule, registerRule } from '../engine/RuleEngine';
import { GameSpec, loadSpec, loadRulesCatalog, getSpecHash } from '../engine/SpecLoader';
import { setGameScene, getBotEnabled } from '../engine/TestHooks';
import { NoIdleDamage } from '../rules/NoIdleDamage';
import { BulletBounce } from '../rules/BulletBounce';

// Register rules
registerRule('NoIdleDamage', NoIdleDamage);
registerRule('BulletBounce', BulletBounce);

export class GameScene extends Phaser.Scene {
  private spec: GameSpec;
  private rng: RNG;
  private telemetry: Telemetry;
  private ruleEngine: RuleEngine;
  
  private player!: Player;
  private enemies: Enemy[] = [];
  private bulletGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  
  private keys: any;
  private gameTime = 0;
  private gameStarted = false;
  private gameEnded = false;
  private spawnTimer = 0;
  private winTime = 0;
  
  private botMode = false;
  private botTimer = 0;
  private wallThickness = 32;
  
  constructor() {
    super({ key: 'GameScene' });
    this.spec = loadSpec();
    this.rng = new RNG(this.spec.seed);
    this.telemetry = new Telemetry();
    this.ruleEngine = new RuleEngine(this.telemetry, this.rng, () => this.gameTime);
  }
  
  preload(): void {
    // Create textures programmatically
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Player texture (green circle)
    graphics.clear();
    graphics.fillStyle(0x00ff00);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('player', 32, 32);
    
    // Enemy texture (red circle)
    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(14, 14, 14);
    graphics.generateTexture('enemy', 28, 28);
    
    // Bullet texture (yellow small circle)
    graphics.clear();
    graphics.fillStyle(0xffff00);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('bullet', 8, 8);
    
    // Wall texture
    graphics.clear();
    graphics.fillStyle(0x444444);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('wall', 32, 32);
  }
  
  create(): void {
    // Setup scene reference for TestHooks
    setGameScene(this);
    
    const w = this.spec.arena.width;
    const h = this.spec.arena.height;
    
    // Create arena walls
    if (this.spec.arena.walls) {
      // Top wall
      const top = this.physics.add.staticSprite(w / 2, this.wallThickness / 2, 'wall');
      top.setDisplaySize(w, this.wallThickness);
      top.refreshBody();
      top.body!.onWorldBounds = true;
      
      // Bottom wall
      const bottom = this.physics.add.staticSprite(w / 2, h - this.wallThickness / 2, 'wall');
      bottom.setDisplaySize(w, this.wallThickness);
      bottom.refreshBody();
      bottom.body!.onWorldBounds = true;
      
      // Left wall
      const left = this.physics.add.staticSprite(this.wallThickness / 2, h / 2, 'wall');
      left.setDisplaySize(this.wallThickness, h);
      left.refreshBody();
      left.body!.onWorldBounds = true;
      
      // Right wall
      const right = this.physics.add.staticSprite(w - this.wallThickness / 2, h / 2, 'wall');
      right.setDisplaySize(this.wallThickness, h);
      right.refreshBody();
      right.body!.onWorldBounds = true;
    }
    
    // Create groups
    this.bulletGroup = this.physics.add.group();
    this.enemyGroup = this.physics.add.group();
    
    // Create player
    this.player = new Player(this, w / 2, h / 2);
    this.player.configure(this.spec.player.hp, this.spec.player.speed, this.spec.player.weapon);
    
    // Setup collision
    this.physics.add.collider(this.player, this.enemyGroup, this.handlePlayerEnemyCollision, undefined, this);
    this.physics.add.collider(this.bulletGroup, this.enemyGroup, this.handleBulletEnemyCollision, undefined, this);
    this.physics.world.on('worldbounds', this.handleWorldBounds, this);
    
    // Input
    this.keys = this.input.keyboard?.addKeys({
      KeyW: Phaser.Input.Keyboard.KeyCodes.W,
      KeyA: Phaser.Input.Keyboard.KeyCodes.A,
      KeyS: Phaser.Input.Keyboard.KeyCodes.S,
      KeyD: Phaser.Input.Keyboard.KeyCodes.D,
      ArrowUp: Phaser.Input.Keyboard.KeyCodes.UP,
      ArrowDown: Phaser.Input.Keyboard.KeyCodes.DOWN,
      ArrowLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
      ArrowRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Space: Phaser.Input.Keyboard.KeyCodes.SPACE
    }) as any;
    
    // Start game
    this.startGame();
    
    // UI
    this.add.text(10, 10, this.spec.meta.title, { fontSize: '16px', color: '#ffffff' });
    this.hpText = this.add.text(10, 30, '', { fontSize: '14px', color: '#00ff00' });
    this.timeText = this.add.text(10, 50, '', { fontSize: '14px', color: '#ffffff' });
    this.statusText = this.add.text(w / 2, h / 2, '', { fontSize: '24px', color: '#ffff00' }).setOrigin(0.5);
  }
  
  private hpText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  
  private startGame(): void {
    this.gameStarted = true;
    this.gameTime = 0;
    this.gameEnded = false;
    this.winTime = this.spec.winCondition.params.seconds * 1000;
    
    // Initialize telemetry
    this.telemetry.start();
    this.telemetry.emit('session_start', {
      seed: this.spec.seed,
      specHash: getSpecHash(this.spec)
    });
    
    // Initialize rules
    const catalog = loadRulesCatalog();
    this.spec.rules.forEach(ruleDef => {
      const rule = createRule(ruleDef.type, ruleDef.params, catalog[ruleDef.type]);
      this.ruleEngine.addRule(rule);
    });
    
    this.ruleEngine.start({
      rng: this.rng,
      telemetry: this.telemetry,
      gameTime: this.gameTime,
      spec: this.spec,
      entities: {
        player: this.player,
        enemies: this.enemies,
        bullets: []
      }
    });
    
    // Initial enemy spawn
    this.spawnEnemies();
  }
  
  private spawnEnemies(): void {
    const count = this.spec.enemies.spawn.count;
    const template = this.spec.enemies.templates[0];
    const w = this.spec.arena.width;
    const h = this.spec.arena.height;
    const t = this.wallThickness;
    
    for (let i = 0; i < count; i++) {
      // Spawn at random edge position
      let x: number, y: number;
      const edge = this.rng.nextInt(0, 3);
      switch (edge) {
        case 0: // Top
          x = this.rng.nextFloat(t + 20, w - t - 20);
          y = t + 20;
          break;
        case 1: // Bottom
          x = this.rng.nextFloat(t + 20, w - t - 20);
          y = h - t - 20;
          break;
        case 2: // Left
          x = t + 20;
          y = this.rng.nextFloat(t + 20, h - t - 20);
          break;
        default: // Right
          x = w - t - 20;
          y = this.rng.nextFloat(t + 20, h - t - 20);
          break;
      }
      
      const enemy = new Enemy(this, x, y, 'enemy');
      enemy.configure(template);
      this.enemyGroup.add(enemy);
      this.enemies.push(enemy);
    }
    
    this.telemetry.emit('enemy_spawn', { count });
  }
  
  private handlePlayerEnemyCollision = (player: any, enemy: any): void => {
    const time = this.time.now;
    if ((enemy as Enemy).canDamage(time)) {
      (enemy as Enemy).recordDamage(time);
      this.player.takeDamage(10);
      this.telemetry.emit('player_damage', { amount: 10, reason: 'enemy_contact' });
      
      if (this.player.getHP() <= 0) {
        this.telemetry.emit('player_dead', { reason: 'enemy_contact' });
        this.endGame('lose');
      }
    }
  };
  
  private handleBulletEnemyCollision = (bullet: any, enemy: any): void => {
    bullet.destroy();
    (enemy as Enemy).takeDamage(bullet.getDamage());
    
    if ((enemy as Enemy).getHP() <= 0) {
      enemy.destroy();
      const idx = this.enemies.indexOf(enemy as Enemy);
      if (idx > -1) this.enemies.splice(idx, 1);
      this.telemetry.emit('enemy_killed', { enemyType: (enemy as Enemy).getTemplateId() });
    }
  };
  
  private handleWorldBounds = (body: any): void => {
    if (body.gameObject.texture.key === 'bullet') {
      const bullet = body.gameObject as Bullet;
      const bounces = bullet.getBouncesRemaining();
      
      if (bounces > 0) {
        bullet.recordBounce();
        this.ruleEngine.emit('BulletHitWall', { bullet });
      } else {
        bullet.destroy();
      }
    }
  };
  
  update(time: number, delta: number): void {
    if (!this.gameStarted || this.gameEnded) return;
    
    const dt = Math.min(delta, 50);
    this.gameTime += dt;
    
    // Bot mode updates
    if (this.botMode) {
      this.updateBot(time);
    } else {
      this.player.update(this.keys, time);
    }
    
    // Shooting with mouse or space
    if (Phaser.Input.Keyboard.JustDown(this.keys['Space'])) {
      const pointer = this.input.activePointer;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
      this.player.fire(time, angle, this.bulletGroup);
    }
    
    // Enemy updates
    this.enemies.forEach(enemy => {
      enemy.update(this.player, time);
    });
    
    // Rule engine tick
    this.ruleEngine.tick({
      rng: this.rng,
      telemetry: this.telemetry,
      gameTime: this.gameTime,
      spec: this.spec,
      entities: {
        player: this.player,
        enemies: this.enemies,
        bullets: []
      }
    }, dt);
    
    // Enemy spawn
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spec.enemies.spawn.everySeconds * 1000) {
      this.spawnTimer = 0;
      this.spawnEnemies();
    }
    
    // Win condition
    if (this.gameTime >= this.winTime) {
      this.endGame('win');
    }
    
    // Player death check
    if (this.player.getHP() <= 0) {
      this.endGame('lose');
    }
    
    // Update UI
    this.hpText.setText(`HP: ${Math.max(0, Math.round(this.player.getHP()))}`);
    this.timeText.setText(`Time: ${Math.round(this.gameTime / 1000)}s / ${this.spec.winCondition.params.seconds}s`);
  }
  
  private updateBot(time: number): void {
    this.botTimer -= 16;
    
    if (this.botTimer <= 0) {
      this.botTimer = 500 + this.rng.nextFloat(0, 1000);
      const angle = this.rng.nextFloat(0, Math.PI * 2);
      const speed = this.spec.player.speed;
      this.player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
    
    // Auto-fire at enemies
    if (this.player.canFire(time)) {
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;
      
      for (const enemy of this.enemies) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = enemy;
        }
      }
      
      if (nearest) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y);
        this.player.fire(time, angle, this.bulletGroup);
      }
    }
  }
  
  private endGame(result: 'win' | 'lose'): void {
    this.gameEnded = true;
    this.telemetry.emit(result, { reason: result === 'win' ? 'survived' : 'died' });
    
    this.statusText.setText(result === 'win' ? 'VICTORY!' : 'GAME OVER');
    this.statusText.setVisible(true);
    
    // Stop all physics
    this.physics.pause();
    this.player.setVelocity(0, 0);
  }
  
  // Public methods for TestHooks
  loadNewSpec(spec: any): void {
    this.spec = spec;
    this.scene.restart();
  }
  
  setSeed(seed: number): void {
    this.rng.seed(seed);
  }
  
  setBotMode(enable: boolean): void {
    this.botMode = enable;
  }
  
  getTelemetry(): Telemetry {
    return this.telemetry;
  }
  
  forceEnd(result: 'win' | 'lose'): void {
    this.endGame(result);
  }
}
