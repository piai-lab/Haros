const presenterSymbol = Symbol.for("harnessos.engineWebSurface.presenter.v1");

function redirectUrlFromHtml(html) {
  if (typeof html !== "string") return null;
  const match = /window\.location\.replace\(("(?:[^"\\]|\\.)*")\)/u.exec(html);
  if (!match?.[1]) return null;
  try {
    const value = JSON.parse(match[1]);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

class HarnessOSEngineWebSurfaceWindow {
  #listeners = new Map();
  #closed = false;

  on(event, listener) {
    const listeners = this.#listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(event, listeners);
    if (event === "ready") {
      queueMicrotask(() => {
        if (!this.#closed) listener({});
      });
    }
  }

  close() {
    if (this.#closed) return;
    this.#closed = true;
    for (const listener of this.#listeners.get("closed") ?? []) listener();
  }

  _write() {}
}

export function open(html) {
  const url = redirectUrlFromHtml(html);
  const presenter = globalThis[presenterSymbol];
  if (!url || !presenter || typeof presenter.claim !== "function" || !presenter.claim(url)) {
    // This optional module is process-visible, but HarnessOS must consume only an
    // exact current-session intent registered by an Engine adapter. Throwing for
    // every other Glimpse request preserves that extension's native fallback.
    throw new Error("No matching HarnessOS Engine web-surface intent is active.");
  }
  return new HarnessOSEngineWebSurfaceWindow();
}
