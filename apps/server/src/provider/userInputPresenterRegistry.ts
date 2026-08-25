export interface UserInputPresenterLease {
  readonly id: string;
  release(): void;
}

type UnavailableListener = () => void | Promise<void>;

export class UserInputPresenterRegistry {
  private readonly leases = new Set<string>();
  private readonly unavailableListeners = new Set<UnavailableListener>();
  private readonly unavailableHandoffs = new Set<Promise<void>>();
  private unavailableHandoffFailures = 0;
  private sealed = false;

  get available(): boolean {
    return this.leases.size > 0;
  }

  get size(): number {
    return this.leases.size;
  }

  acquire(id: string, version: 1): UserInputPresenterLease {
    if (version !== 1)
      throw new Error(`Unsupported canonical user-input presenter version: ${version}`);
    if (this.sealed) {
      throw new Error("Canonical user-input presenter registration is closed.");
    }
    const leaseId = `${id}:${crypto.randomUUID()}`;
    this.leases.add(leaseId);
    let released = false;
    return {
      id: leaseId,
      release: () => {
        if (released) return;
        released = true;
        const hadPresenter = this.available;
        this.leases.delete(leaseId);
        if (hadPresenter && !this.available) {
          this.notifyUnavailableListeners();
        }
      },
    };
  }

  onUnavailable(listener: UnavailableListener): () => void {
    if (this.sealed) {
      return () => undefined;
    }
    this.unavailableListeners.add(listener);
    return () => this.unavailableListeners.delete(listener);
  }

  /** Tracks an immediate fail-closed settlement when no compatible lease exists. */
  handoffUnavailable(listener: UnavailableListener): void {
    this.invokeUnavailableListener(listener);
  }

  private invokeUnavailableListener(listener: UnavailableListener): void {
    let result: void | Promise<void>;
    try {
      result = listener();
    } catch {
      this.unavailableHandoffFailures += 1;
      return;
    }
    const handoff = Promise.resolve(result);
    this.unavailableHandoffs.add(handoff);
    void handoff.then(
      () => this.unavailableHandoffs.delete(handoff),
      () => {
        this.unavailableHandoffs.delete(handoff);
        this.unavailableHandoffFailures += 1;
      },
    );
  }

  private notifyUnavailableListeners(): void {
    for (const listener of Array.from(this.unavailableListeners)) {
      this.invokeUnavailableListener(listener);
    }
  }

  async drainUnavailableHandoffs(): Promise<number> {
    while (this.unavailableHandoffs.size > 0) {
      await Promise.allSettled(Array.from(this.unavailableHandoffs));
    }
    const failures = this.unavailableHandoffFailures;
    this.unavailableHandoffFailures = 0;
    return failures;
  }

  /** Seals registration, revokes every lease, and awaits current settlement handoffs. */
  async sealAndRevoke(): Promise<number> {
    if (!this.sealed) {
      this.sealed = true;
      this.leases.clear();
      this.notifyUnavailableListeners();
    }
    return this.drainUnavailableHandoffs();
  }
}

export const userInputPresenterRegistry = new UserInputPresenterRegistry();
