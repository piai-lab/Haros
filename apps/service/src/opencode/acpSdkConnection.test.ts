import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  attachWorkerDiagnosticStream,
  OpenCodeAcpError,
  OpenCodeAcpSdkConnection,
} from "./acpSdkConnection";

const fixture = fileURLToPath(new URL("./test-fixtures/acp-child.mjs", import.meta.url));

const spawnFixture = (mode: string) =>
  OpenCodeAcpSdkConnection.spawn({
    executable: fixture,
    cwd: process.cwd(),
    env: { ...process.env, OMNIMIND_ACP_FIXTURE_MODE: mode },
  });

const initialize = (connection: OpenCodeAcpSdkConnection, timeoutMs = 1_000) =>
  connection.initialize(
    {
      protocolVersion: 1,
      clientCapabilities: { fs: {}, terminal: false },
      clientInfo: { name: "OmniMind", version: "0.1.0" },
    },
    timeoutMs,
  );

describe("official ACP SDK resource boundary", () => {
  it("skips absent Bun diagnostic streams and still attaches present streams", () => {
    const onData = vi.fn();
    expect(() => attachWorkerDiagnosticStream(null, onData)).not.toThrow();
    expect(() => attachWorkerDiagnosticStream(undefined, onData)).not.toThrow();

    const stream = new PassThrough();
    attachWorkerDiagnosticStream(stream, onData);
    stream.write(Buffer.from("diagnostic"));
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData.mock.calls[0]?.[0]).toEqual(Buffer.from("diagnostic"));
  });

  it.each([
    ["malformed-frame", "ACP_FRAME_INVALID"],
    ["oversized-frame", "ACP_FRAME_TOO_LARGE"],
    ["closed-process", "ACP_CLOSED"],
    ["slow-initialize", "ACP_REQUEST_TIMEOUT"],
  ] as const)("fails closed for %s", async (mode, code) => {
    const connection = spawnFixture(mode);
    await expect(
      initialize(connection, mode === "slow-initialize" ? 50 : 1_000),
    ).rejects.toMatchObject({
      name: "OpenCodeAcpError",
      code,
    } satisfies Partial<OpenCodeAcpError>);
    await connection.close();
  });

  it("maps only official RequestError -32000 to a bounded auth-required code", async () => {
    const connection = spawnFixture("auth-required");
    try {
      const cause = await initialize(connection).catch((error: unknown) => error);
      expect(cause).toMatchObject({
        name: "OpenCodeAcpError",
        code: "ACP_AUTH_REQUIRED",
        message: "OpenCode ACP authentication is required.",
      });
      const serialized = JSON.stringify(cause);
      expect(serialized).not.toContain("private auth diagnostic");
      expect(serialized).not.toContain("must-not-cross");
      expect(serialized).not.toContain("credential");
      expect(serialized).not.toContain("data");
    } finally {
      await connection.close();
    }
  });

  it("isolates schema-invalid notification diagnostics from the Service log sink", async () => {
    const captured: string[] = [];
    const errorSink = vi.spyOn(console, "error").mockImplementation((...values: unknown[]) => {
      captured.push(values.map(String).join(" "));
    });
    const connection = spawnFixture("invalid-usage-sentinel");
    const closeCauses: OpenCodeAcpError[] = [];
    connection.onClose((cause) => closeCauses.push(cause));
    try {
      await initialize(connection);
      const session = await connection.newSession({ cwd: process.cwd(), mcpServers: [] });
      await expect(
        connection.prompt(
          { sessionId: session.sessionId, prompt: [{ type: "text", text: "hello" }] },
          1_000,
        ),
      ).rejects.toMatchObject({
        name: "OpenCodeAcpError",
        code: "ACP_FRAME_INVALID",
      } satisfies Partial<OpenCodeAcpError>);
      expect(closeCauses).toHaveLength(1);
      expect(closeCauses[0]).toMatchObject({ code: "ACP_FRAME_INVALID" });
    } finally {
      await connection.close();
      errorSink.mockRestore();
    }

    const output = captured.join("\n");
    expect(captured).toHaveLength(1);
    expect(output.length).toBeLessThan(256);
    expect(output).toContain('reason="sdk-diagnostic-isolated"');
    expect(output).not.toContain("OMNIMIND_ACP_PRIVATE_SENTINEL_7f3f9c");
    expect(output).not.toContain("credential-private-value");
    expect(output).not.toContain("/private/fixture/path");
    expect(output).not.toContain("session/update");
    expect(output).not.toContain("usage_update");
    expect(output).not.toContain("ZodError");
    expect(output).not.toContain("invalid_type");
  });
});
