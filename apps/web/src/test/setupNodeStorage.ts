class MemoryStorage implements Storage {
  readonly #entries = new Map<string, string>();

  get length(): number {
    return this.#entries.size;
  }

  clear(): void {
    this.#entries.clear();
  }

  getItem(key: string): string | null {
    return this.#entries.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#entries.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.#entries.set(String(key), String(value));
  }
}

// Node exposes an incomplete experimental localStorage unless a backing file is
// configured. Install the complete test double before any store module imports,
// so persistence is exercised without adding production fallbacks.
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: new MemoryStorage(),
});
