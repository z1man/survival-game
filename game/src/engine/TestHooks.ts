import { GameScene } from '../scenes/GameScene';
import { loadSpec } from './SpecLoader';
import { Telemetry } from './Telemetry';

let gameScene: GameScene | null = null;
let currentSpec: any = null;
let botEnabled = false;

if (typeof window !== 'undefined') {
  (window as any).__TEST__ = {
    loadSpec: (spec: any) => {
      currentSpec = loadSpec(spec);
      if (gameScene) gameScene.loadNewSpec(currentSpec);
    },
    setSeed: (seed: number) => {
      if (gameScene) gameScene.setSeed(seed);
    },
    enableBot: (enable: boolean) => {
      botEnabled = enable;
      if (gameScene) gameScene.setBotMode(enable);
    },
    getTelemetry: () => {
      return gameScene ? gameScene.getTelemetry().dump() : { events: [] };
    },
    forceEnd: (result: 'win' | 'lose') => {
      if (gameScene) gameScene.forceEnd(result);
    }
  };
}

export function setGameScene(scene: GameScene): void {
  gameScene = scene;
  if (botEnabled) scene.setBotMode(true);
}

export function getBotEnabled(): boolean {
  return botEnabled;
}
