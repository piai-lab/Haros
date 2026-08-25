// Adapted from @mrclrchtr/supi-ask-user@5.0.0 src/session/lock.ts.

export type QuestionnaireLease = symbol;

export class ActiveQuestionnaireLock {
  private activeLease: QuestionnaireLease | undefined;

  acquire(): QuestionnaireLease | undefined {
    if (this.activeLease !== undefined) return undefined;
    const lease = Symbol("ask-user-questionnaire");
    this.activeLease = lease;
    return lease;
  }

  release(lease: QuestionnaireLease): boolean {
    if (this.activeLease !== lease) return false;
    this.activeLease = undefined;
    return true;
  }

  get isActive(): boolean {
    return this.activeLease !== undefined;
  }
}
