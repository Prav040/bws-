// src/services/restTimer.ts
// Rest-Timer: zählt nach jedem Satz die konfigurierte Pause herunter.

export interface RestTimerCallbacks {
  onTick: (remaining: number, total: number) => void;
  onDone: () => void;
}

export class RestTimer {
  private total = 0;
  private remaining = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private callbacks: RestTimerCallbacks | null = null;

  start(seconds: number, callbacks: RestTimerCallbacks): void {
    this.stop();
    this.total = seconds;
    this.remaining = seconds;
    this.callbacks = callbacks;
    this.callbacks.onTick(this.remaining, this.total);

    this.interval = setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    this.remaining -= 1;
    if (this.remaining <= 0) {
      this.stop();
      this.callbacks?.onDone();
      return;
    }
    this.callbacks?.onTick(this.remaining, this.total);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  isRunning(): boolean {
    return this.interval !== null;
  }

  getRemaining(): number {
    return this.remaining;
  }

  getTotal(): number {
    return this.total;
  }

  /** Verlängert eine laufende Pause um `seconds` Sekunden (+30s). */
  addTime(seconds: number): void {
    if (!this.isRunning()) return;
    this.remaining += seconds;
    this.total += seconds;
    this.callbacks?.onTick(this.remaining, this.total);
  }
}
