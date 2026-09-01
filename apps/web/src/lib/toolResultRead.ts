import type { ThreadId, ToolResultFullReadResult } from "@harnessos/contracts";
import { ensureNativeApi } from "../nativeApi";

interface InFlightRead {
  readonly controller: AbortController;
  readonly promise: Promise<ToolResultFullReadResult>;
  consumers: number;
}

const inFlightReads = new Map<string, InFlightRead>();

export function acquireToolResultRead(input: {
  readonly threadId: ThreadId;
  readonly toolCallId: string;
}): {
  readonly promise: Promise<ToolResultFullReadResult>;
  readonly release: () => void;
} {
  const key = `${input.threadId}\u0000${input.toolCallId}`;
  let entry = inFlightReads.get(key);
  if (!entry) {
    const controller = new AbortController();
    const promise = ensureNativeApi().engine.readToolResult(input, { signal: controller.signal });
    entry = { controller, promise, consumers: 0 };
    inFlightReads.set(key, entry);
    void promise.then(
      () => {
        if (inFlightReads.get(key) === entry) inFlightReads.delete(key);
      },
      () => {
        if (inFlightReads.get(key) === entry) inFlightReads.delete(key);
      },
    );
  }
  entry.consumers += 1;

  let released = false;
  return {
    promise: entry.promise,
    release: () => {
      if (released) return;
      released = true;
      entry.consumers -= 1;
      if (entry.consumers === 0 && inFlightReads.get(key) === entry) {
        inFlightReads.delete(key);
        entry.controller.abort();
      }
    },
  };
}
