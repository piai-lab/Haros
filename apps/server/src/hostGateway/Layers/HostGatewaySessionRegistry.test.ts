import { assert, describe, it } from "@effect/vitest";
import { ThreadId } from "@harnessos/contracts";

import { makeHostGatewaySessionRegistry } from "./HostGatewaySessionRegistry.ts";

describe("HostGatewaySessionRegistry", () => {
  it("allows independent legitimate sessions for the same thread", () => {
    let nextId = 0;
    const registry = makeHostGatewaySessionRegistry({ randomId: () => String(++nextId) });
    const first = registry.issue(ThreadId.makeUnsafe("thread-1"), "codex");
    const second = registry.issue(ThreadId.makeUnsafe("thread-1"), "claude");
    assert.notEqual(first.token, second.token);
    assert.equal(registry.verify(first.token)?.threadId, "thread-1");
    assert.equal(registry.verify(second.token)?.threadId, "thread-1");
    assert.equal(registry.verify(first.token)?.engine, "codex");
    assert.equal(registry.verify(second.token)?.engine, "claude");
  });

  it("keeps replacement runtime credentials independent from outgoing-session revocation", () => {
    let nextId = 0;
    const registry = makeHostGatewaySessionRegistry({ randomId: () => String(++nextId) });
    const first = registry.issue(ThreadId.makeUnsafe("thread-1"), "codex");
    const second = registry.issue(ThreadId.makeUnsafe("thread-1"), "codex");
    assert.notEqual(first.token, second.token);
    assert.equal(registry.verify(first.token)?.threadId, "thread-1");
    assert.equal(registry.verify(second.token)?.threadId, "thread-1");

    registry.revoke(first.token);
    assert.isNull(registry.verify(first.token));
    assert.equal(registry.verify(second.token)?.threadId, "thread-1");
  });

  it("binds tool-call authority to one exact turn and invalidates it on revocation", () => {
    const registry = makeHostGatewaySessionRegistry({ randomId: () => "authority" });
    const issued = registry.issue(ThreadId.makeUnsafe("thread-1"), "codex");
    const authority = registry.bindTurnAuthority(issued.token, "turn-a");

    assert.isNotNull(authority);
    assert.equal(authority?.turnId, "turn-a");
    assert.isTrue(registry.verifyTurnAuthority(authority!));

    registry.revoke(issued.token);
    assert.isFalse(registry.verifyTurnAuthority(authority!));
    assert.isNull(registry.bindTurnAuthority(issued.token, "turn-b"));
  });

  it("permanently fences a terminal turn credential even when A never used it", () => {
    let nextId = 0;
    const registry = makeHostGatewaySessionRegistry({ randomId: () => String(++nextId) });
    const outgoing = registry.issue(ThreadId.makeUnsafe("thread-1"), "codex");

    assert.isTrue(registry.retireTurnAuthority(outgoing.token, "turn-a"));
    assert.isNull(registry.bindTurnAuthority(outgoing.token, "turn-a"));
    assert.isNull(registry.bindTurnAuthority(outgoing.token, "turn-b"));
    // Retirement is idempotent for the same terminal turn but cannot be
    // reassigned to a different one.
    assert.isTrue(registry.retireTurnAuthority(outgoing.token, "turn-a"));
    assert.isFalse(registry.retireTurnAuthority(outgoing.token, "turn-b"));

    const replacement = registry.issue(ThreadId.makeUnsafe("thread-1"), "codex");
    const turnBAuthority = registry.bindTurnAuthority(replacement.token, "turn-b");
    assert.isNotNull(turnBAuthority);
    assert.isTrue(registry.verifyTurnAuthority(turnBAuthority!));
  });

  it("keeps credentials valid for a long-lived engine session but not across restart", () => {
    let time = 1_000;
    const firstRegistry = makeHostGatewaySessionRegistry({
      now: () => time,
      randomId: () => "first",
    });
    const issued = firstRegistry.issue(ThreadId.makeUnsafe("thread-1"), "codex");
    time += 48 * 60 * 60 * 1_000;
    assert.equal(firstRegistry.verify(issued.token)?.threadId, "thread-1");

    const afterRestart = makeHostGatewaySessionRegistry({ randomId: () => "second" });
    assert.isNull(afterRestart.verify(issued.token));
  });

  it("keeps raw bearer tokens out of verified session identity snapshots", () => {
    const registry = makeHostGatewaySessionRegistry({ randomId: () => "opaque-secret" });
    const issued = registry.issue(ThreadId.makeUnsafe("thread-1"), "codex");
    const verified = registry.verify(issued.token);
    assert.match(issued.token, /^sagw_session_/);
    assert.notProperty(verified, "token");
    assert.notInclude(JSON.stringify(verified), issued.token);
  });
});
