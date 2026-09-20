// FILE: useThreadErrorToast.test.ts
// Purpose: Guards the thread error toast payload and its quarantine recovery action.
// Layer: Chat status presentation tests
// Depends on: the toast option builder and the engine-delivery block format.

import { ThreadId } from "@harnessos/contracts";
import { formatEngineDeliveryBlockDetail } from "@harnessos/shared/engineDeliveryBlock";
import { describe, expect, it } from "vitest";

import {
  buildThreadErrorToastOptions,
  shouldNotifyThreadErrorToast,
  threadErrorToastId,
} from "./useThreadErrorToast";
import { STATUS_TOAST_TIMEOUT_MS } from "../ui/toast.logic";

const threadId = ThreadId.makeUnsafe("11111111-1111-4111-8111-111111111111");

const blockedError = formatEngineDeliveryBlockDetail(
  "External engine command claim expired without a durable acceptance result; execution was not replayed.",
);

function build(error: string, unblocking = false) {
  return buildThreadErrorToastOptions({
    error,
    threadId,
    unblocking,
    copy: {
      deliveryFailed: "Message was not sent to the Engine.",
      unblock: "Unblock task",
      unblocking: "Unblocking…",
    },
    onUnblock: () => {},
  });
}

describe("buildThreadErrorToastOptions", () => {
  it("renders an expiring error toast scoped to its thread", () => {
    const options = build("The engine rejected the prompt.");

    expect(options.id).toBe(threadErrorToastId(threadId));
    expect(options.type).toBe("error");
    expect(options.title).toBe("The engine rejected the prompt.");
    expect(options.timeout).toBe(STATUS_TOAST_TIMEOUT_MS);
    expect(options.data).toMatchObject({
      copyText: "The engine rejected the prompt.",
      threadId,
    });
    expect(options.description).toBeUndefined();
  });

  it("offers the unblock action for a engine-delivery quarantine", () => {
    expect(build(blockedError)).toMatchObject({
      title: "Message was not sent to the Engine.",
      actionProps: { children: "Unblock task" },
    });
  });

  it("disables the action while unblocking", () => {
    expect(build(blockedError, true)).toMatchObject({
      timeout: 0,
      actionProps: { children: "Unblocking…", disabled: true },
    });
  });

  it("hides the action for unrelated thread errors", () => {
    expect(build("The engine rejected the prompt.").actionProps).toBeUndefined();
  });
});

describe("shouldNotifyThreadErrorToast", () => {
  it("does not replay a persisted error when a thread is first observed", () => {
    expect(
      shouldNotifyThreadErrorToast({
        previous: null,
        threadId,
        error: "The engine rejected the prompt.",
        unblocking: false,
      }),
    ).toBe(false);
  });

  it("notifies only when the observed error or recovery state changes", () => {
    const previous = { threadId, error: null, unblocking: false };

    expect(
      shouldNotifyThreadErrorToast({
        previous,
        threadId,
        error: "The engine rejected the prompt.",
        unblocking: false,
      }),
    ).toBe(true);
    expect(
      shouldNotifyThreadErrorToast({
        previous: { ...previous, error: "The engine rejected the prompt." },
        threadId,
        error: "The engine rejected the prompt.",
        unblocking: false,
      }),
    ).toBe(false);
    expect(
      shouldNotifyThreadErrorToast({
        previous: { ...previous, error: "The engine rejected the prompt." },
        threadId,
        error: "The engine rejected the prompt.",
        unblocking: true,
      }),
    ).toBe(true);
  });
});
