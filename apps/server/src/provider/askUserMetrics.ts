import type { AskUserResultStatus } from "@harnessos/oa-ask";

export interface AskUserMetricsSnapshot {
  readonly counters: Readonly<Record<string, number>>;
  readonly waiting: { readonly count: number; readonly totalMs: number; readonly maxMs: number };
}

class AskUserMetrics {
  private readonly counters = new Map<string, number>();
  private waitingCount = 0;
  private waitingTotalMs = 0;
  private waitingMaxMs = 0;

  increment(
    name:
      | "requested"
      | "late_response_rejected"
      | "provenance_collision"
      | "barrier_sibling_blocked",
    count = 1,
  ): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + count);
  }

  settle(status: AskUserResultStatus, waitingMs: number): void {
    this.counters.set(status, (this.counters.get(status) ?? 0) + 1);
    const bounded = Number.isFinite(waitingMs) ? Math.max(0, waitingMs) : 0;
    this.waitingCount += 1;
    this.waitingTotalMs += bounded;
    this.waitingMaxMs = Math.max(this.waitingMaxMs, bounded);
  }

  snapshot(): AskUserMetricsSnapshot {
    return {
      counters: Object.fromEntries(this.counters),
      waiting: {
        count: this.waitingCount,
        totalMs: this.waitingTotalMs,
        maxMs: this.waitingMaxMs,
      },
    };
  }

  resetForTests(): void {
    this.counters.clear();
    this.waitingCount = 0;
    this.waitingTotalMs = 0;
    this.waitingMaxMs = 0;
  }
}

export const askUserMetrics = new AskUserMetrics();
