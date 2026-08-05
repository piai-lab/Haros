import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  AppSettingsSchema,
  DEFAULT_CHAT_FONT_SIZE_PX,
  DEFAULT_TERMINAL_FONT_SIZE_PX,
  normalizeChatFontSizePx,
  normalizeStoredAppSettings,
  normalizeTerminalFontFamily,
  normalizeTerminalFontSizePx,
  resolveAssistantDeliveryMode,
  resolveFollowUpDispatchMode,
  resolveTerminalFontFamilyStack,
} from "./appSettings";

const decodeSettings = Schema.decodeUnknownSync(AppSettingsSchema);

describe("local app settings", () => {
  it("does not persist retired Provider authority", () => {
    const decoded = decodeSettings({
      defaultProvider: "codex",
      hiddenProviders: ["pi"],
      providerOrder: ["codex", "pi"],
      customCodexModels: ["legacy-model"],
      codexBinaryPath: "/tmp/codex",
      textGenerationProvider: "codex",
      textGenerationModel: "legacy-model",
    });

    expect(decoded).not.toHaveProperty("defaultProvider");
    expect(decoded).not.toHaveProperty("hiddenProviders");
    expect(decoded).not.toHaveProperty("providerOrder");
    expect(decoded).not.toHaveProperty("customCodexModels");
    expect(decoded).not.toHaveProperty("codexBinaryPath");
    expect(decoded).not.toHaveProperty("textGenerationProvider");
  });

  it("normalizes bounded typography values", () => {
    expect(normalizeChatFontSizePx(undefined)).toBe(DEFAULT_CHAT_FONT_SIZE_PX);
    expect(normalizeChatFontSizePx(100)).toBe(18);
    expect(normalizeTerminalFontSizePx(undefined)).toBe(DEFAULT_TERMINAL_FONT_SIZE_PX);
    expect(normalizeTerminalFontSizePx(1)).toBe(10);
    expect(normalizeTerminalFontFamily("Fira Code; color: red")).toBe("Fira Code color: red");
    expect(resolveTerminalFontFamilyStack("Fira Code")).toBe('"Fira Code", monospace');
  });

  it("migrates the AppSnap rename without retaining the legacy key", () => {
    const decoded = decodeSettings({ enableAppshots: true });
    const normalized = normalizeStoredAppSettings(decoded);
    expect(normalized.enableAppSnap).toBe(true);
    expect(normalized).not.toHaveProperty("enableAppshots");
  });

  it("keeps local delivery and follow-up preferences deterministic", () => {
    expect(resolveAssistantDeliveryMode({ enableAssistantStreaming: true })).toBe("streaming");
    expect(resolveAssistantDeliveryMode({ enableAssistantStreaming: false })).toBe("buffered");
    expect(resolveFollowUpDispatchMode({ behavior: "steer", hasLiveTurn: false })).toBe("queue");
    expect(
      resolveFollowUpDispatchMode({
        behavior: "queue",
        hasLiveTurn: true,
        useOppositeBehavior: true,
      }),
    ).toBe("steer");
  });
});
