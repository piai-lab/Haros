export interface UserInputPresenterLease {
  readonly id: string;
  release(): void;
}

type UnavailableListener = () => void;

class UserInputPresenterRegistry {
  private readonly leases = new Set<string>();
  private readonly unavailableListeners = new Set<UnavailableListener>();

  get available(): boolean {
    return this.leases.size > 0;
  }

  get size(): number {
    return this.leases.size;
  }

  acquire(id: string, version: 1): UserInputPresenterLease {
    if (version !== 1)
      throw new Error(`Unsupported canonical user-input presenter version: ${version}`);
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
          for (const listener of [...this.unavailableListeners]) listener();
        }
      },
    };
  }

  onUnavailable(listener: UnavailableListener): () => void {
    this.unavailableListeners.add(listener);
    return () => this.unavailableListeners.delete(listener);
  }
}

export const userInputPresenterRegistry = new UserInputPresenterRegistry();
