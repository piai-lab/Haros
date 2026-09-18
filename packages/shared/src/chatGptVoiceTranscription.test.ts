// FILE: chatGptVoiceTranscription.test.ts
// Purpose: Verifies the voice transport warms the provider connection safely.

import { Buffer } from "node:buffer";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CHATGPT_VOICE_TRANSCRIPTION_URL,
  prewarmChatGptVoiceTranscriptionConnection,
  requestChatGptVoiceTranscription,
} from "./chatGptVoiceTranscription";
import { outboundHttp } from "./outboundHttp";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("prewarmChatGptVoiceTranscriptionConnection", () => {
  it("opens the ChatGPT HTTPS origin with a bounded HEAD request", async () => {
    const request = vi.spyOn(outboundHttp, "request").mockResolvedValue({
      status: 200,
      headers: new Headers(),
      body: new Uint8Array(),
      url: "https://chatgpt.com/",
    });

    await prewarmChatGptVoiceTranscriptionConnection();

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: new URL("/", CHATGPT_VOICE_TRANSCRIPTION_URL),
        method: "HEAD",
        headers: {
          "User-Agent": expect.stringContaining("Mozilla/5.0"),
        },
        policy: expect.objectContaining({
          service: "chatgpt-voice-transcription",
          timeoutMs: 10_000,
          maxResponseBytes: 64 * 1024,
          maxConcurrent: 2,
        }),
      }),
    );
  });

  it("uses the accepted browser identity for transcription uploads", async () => {
    const request = vi.spyOn(outboundHttp, "request").mockResolvedValue({
      status: 200,
      headers: new Headers(),
      body: new Uint8Array(),
      url: CHATGPT_VOICE_TRANSCRIPTION_URL,
    });

    await requestChatGptVoiceTranscription({
      audio: Uint8Array.from([1, 2, 3]),
      mimeType: "audio/wav",
      token: "test-token",
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          Accept: "application/json, text/plain, */*",
          originator: "codex_cli_rs",
          Origin: "https://chatgpt.com",
          Referer: "https://chatgpt.com/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": expect.stringContaining("Mozilla/5.0"),
        }),
      }),
    );
  });

  it("forwards the ChatGPT account id from the Codex access token", async () => {
    const request = vi.spyOn(outboundHttp, "request").mockResolvedValue({
      status: 200,
      headers: new Headers(),
      body: new Uint8Array(),
      url: CHATGPT_VOICE_TRANSCRIPTION_URL,
    });
    const encode = (value: string) => Buffer.from(value).toString("base64url");
    const token = `${encode("{}")}.${encode(
      JSON.stringify({
        "https://api.openai.com/auth": { chatgpt_account_id: "account-123" },
      }),
    )}.signature`;

    await requestChatGptVoiceTranscription({
      audio: Uint8Array.from([1, 2, 3]),
      mimeType: "audio/wav",
      token,
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ "ChatGPT-Account-ID": "account-123" }),
      }),
    );
  });
});
