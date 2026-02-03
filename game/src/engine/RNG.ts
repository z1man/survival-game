// Simple LCG RNG for deterministic random (seeded)
export class RNG {
  private state: number;
  
  constructor(seed: number = 0) {
    this.state = seed;
  }
  
  seed(value: number): void {
    this.state = value;
  }
  
  next(): number {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x80000000;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
  
  nextBool(): boolean {
    return this.next() < 0.5;
  }
  
  pick<T>(array: readonly T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}
