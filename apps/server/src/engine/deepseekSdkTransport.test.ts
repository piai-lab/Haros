import { EventEmitter } from "node:events";
import type { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  DeepSeekJsonlFramer,
  DeepSeekJsonlWriter,
  DeepSeekSdkTransportError,
} from "./deepseekSdkTransport.ts";

describe("DeepSeek SDK transport", () => {
  it("frames split UTF-8 and rejects invalid, oversize, or unterminated input", () => {
    const framer = new DeepSeekJsonlFramer(64);
    const encoded = Buffer.from('{"text":"A😀B"}\r\n{"id":2}\n', "utf8");
    const emojiStart = encoded.indexOf(Buffer.from("😀", "utf8"));

    expect(framer.push(encoded.subarray(0, emojiStart + 2))).toEqual([]);
    expect(framer.push(encoded.subarray(emojiStart + 2))).toEqual(['{"text":"A😀B"}', '{"id":2}']);
    framer.finish();
    expect(framer.bufferedBytes).toBe(0);

    expect(() => new DeepSeekJsonlFramer(8).push(Buffer.from("123456789"))).toThrowError(
      expect.objectContaining({ reason: "frame-too-large" }),
    );

    const unterminated = new DeepSeekJsonlFramer(64);
    unterminated.push(Buffer.from('{"id":1}'));
    expect(() => unterminated.finish()).toThrowError(
      expect.objectContaining({ reason: "unterminated-frame" }),
    );

    expect(() => new DeepSeekJsonlFramer(64).push(Buffer.from([0xff, 0x0a]))).toThrowError(
      expect.objectContaining({ reason: "invalid-utf8" }),
    );
    expect(new DeepSeekSdkTransportError({ reason: "read-closed", maxBytes: 1, observedBytes: 0 }).name).toBe(
      "DeepSeekSdkTransportError",
    );
  });

  it("serializes slow stdin writes within one retained-byte budget", async () => {
    class ControlledWritable extends EventEmitter {
      writable = true;
      autoComplete = false;
      readonly chunks: Array<Buffer> = [];
      readonly callbacks: Array<(error?: Error | null) => void> = [];

      write(chunk: Uint8Array, callback: (error?: Error | null) => void): boolean {
        this.chunks.push(Buffer.from(chunk));
        if (this.autoComplete) {
          queueMicrotask(() => callback());
          return true;
        }
        this.callbacks.push(callback);
        return false;
      }

      release(): void {
        this.autoComplete = true;
        for (const callback of this.callbacks.splice(0)) callback();
        this.emit("drain");
      }
    }

    const stream = new ControlledWritable();
    const writer = new DeepSeekJsonlWriter(stream as unknown as Writable, 64, 120);
    const messages = [1, 2, 3].map((id) => ({ id, payload: "x".repeat(16) }));
    const writes = messages.map((message) => writer.write(message));

    expect(stream.chunks).toHaveLength(1);
    expect(writer.bufferedBytes).toBeLessThanOrEqual(120);
    await expect(writer.write({ id: 4, payload: "x".repeat(16) })).rejects.toMatchObject({
      reason: "write-overloaded",
    });
    expect(writer.bufferedBytes).toBeLessThanOrEqual(120);

    stream.release();
    await Promise.all(writes);
    expect(writer.bufferedBytes).toBe(0);
    expect(stream.chunks.map((chunk) => JSON.parse(chunk.toString("utf8")))).toEqual(messages);
  });
});
