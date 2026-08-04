export const NATIVE_HOST_AUTHENTICATED_READY_MARKER =
  "OMNIMIND_NATIVE_HOST_AUTHENTICATED protocol=1";
export const NATIVE_HOST_AUTHENTICATED_UNAVAILABLE_MARKER =
  "OMNIMIND_NATIVE_HOST_UNAVAILABLE protocol=1";
const MAX_BUFFER_CHARS = 2_048;

export class NativeHostAuthenticatedReadinessDetector {
  #buffer = "";
  readonly #onReady: () => void;
  readonly #onUnavailable: () => void;

  constructor(options: { readonly onReady: () => void; readonly onUnavailable: () => void }) {
    this.#onReady = options.onReady;
    this.#onUnavailable = options.onUnavailable;
  }

  push(chunk: unknown): void {
    const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    this.#buffer = `${this.#buffer}${text.replace(/\r/gu, "")}`;
    for (;;) {
      const newline = this.#buffer.indexOf("\n");
      if (newline < 0) break;
      const line = this.#buffer.slice(0, newline).trim();
      this.#buffer = this.#buffer.slice(newline + 1);
      if (line.includes(NATIVE_HOST_AUTHENTICATED_READY_MARKER)) this.#onReady();
      if (line.includes(NATIVE_HOST_AUTHENTICATED_UNAVAILABLE_MARKER)) this.#onUnavailable();
    }
    if (this.#buffer.length > MAX_BUFFER_CHARS) {
      this.#buffer = this.#buffer.slice(-MAX_BUFFER_CHARS);
    }
  }
}
