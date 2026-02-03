export interface TelemetryEvent {
  t: number;
  event: string;
  data?: any;
}

export class Telemetry {
  private events: TelemetryEvent[] = [];
  private startTime: number = 0;
  
  start(): void {
    this.events = [];
    this.startTime = performance.now();
  }
  
  emit(event: string, data?: any): void {
    this.events.push({
      t: Math.round(performance.now() - this.startTime),
      event,
      data
    });
  }
  
  dump(): { events: TelemetryEvent[] } {
    return { events: this.events.map(e => ({ ...e })) };
  }
  
  clear(): void {
    this.events = [];
  }
  
  count(): number {
    return this.events.length;
  }
  
  hasEvent(event: string): boolean {
    return this.events.some(e => e.event === event);
  }
  
  last(n: number): TelemetryEvent[] {
    return this.events.slice(-n);
  }
}
