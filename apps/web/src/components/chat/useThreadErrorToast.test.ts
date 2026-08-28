// FILE: useThreadErrorToast.test.ts
// Purpose: Guards the thread error toast payload and its quarantine recovery action.
// Layer: Chat status presentation tests
// Depends on: the toast option builder and the engine-delivery block format.

import { ThreadId } from "@harnessos/contracts";
import { formatEngineDeliveryBlockDetail } from "@harnessos/shared/engineDeliveryBlock";
import { describe, expect, it } from "vitest";

import { buildThreadErrorToastOptions, threadErrorToastId } from "./useThreadErrorToast";

const threadId = ThreadId.makeUnsafe("11111111-1111-4111-8111-111111111111");

const blockedError = formatEngineDeliveryBlockDetail(
  "External engine command claim expired without a durable acceptance result; execution was not replayed.",
);

function build(error: string, unblocking = false) {
  return buildThreadErrorToastOptions({
    error,
    threadId,
    unblocking,
    onClose: () => {},
    onUnblock: () => {},
  });
}

describe("buildThreadErrorToastOptions", () => {
  it("renders a persistent error toast scoped to its thread", () => {
    const options = build("The engine rejected the prompt.");

    expect(options.id).toBe(threadErrorToastId(threadId));
    expect(options.type).toBe("error");
    expect(options.title).toBe("The engine rejected the prompt.");
    expect(options.timeout).toBe(0);
    expect(options.data).toMatchObject({
      copyText: "The engine rejected the prompt.",
      threadId,
    });
  });

  it("offers the unblock action for a engine-delivery quarantine", () => {
    expect(build(blockedError).actionProps).toMatchObject({ children: "Unblock thread" });
  });

  it("disables the action while unblocking", () => {
    expect(build(blockedError, true).actionProps).toMatchObject({
      children: "Unblocking…",
      disabled: true,
    });
  });

  it("hides the action for unrelated thread errors", () => {
    expect(build("The engine rejected the prompt.").actionProps).toBeUndefined();
  });
});
