// FILE: useComposerVoiceController.test.ts
// Purpose: Covers voice transcription request identity and recorder action guards.
// Layer: Chat composer hook tests

import { ProjectId, ThreadId } from "@omnimind/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactHarness = vi.hoisted(() => {
  interface HookSlot {
    value?: unknown;
    deps?: readonly unknown[];
  }

  let slots: HookSlot[] = [];
  let cursor = 0;

  const nextSlot = () => {
    const index = cursor;
    cursor += 1;
    slots[index] ??= {};
    return slots[index]!;
  };
  const depsEqual = (left: readonly unknown[] | undefined, right: readonly unknown[]) =>
    left !== undefined &&
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]));
  const runEffect = (effect: () => void | (() => void), deps: readonly unknown[]) => {
    const slot = nextSlot();
    if (depsEqual(slot.deps, deps)) {
      return;
    }
    slot.deps = deps;
    effect();
  };

  return {
    beginRender() {
      cursor = 0;
    },
    reset() {
      slots = [];
      cursor = 0;
    },
    useEffect: runEffect,
    useLayoutEffect: runEffect,
    useRef<T>(initialValue: T) {
      const slot = nextSlot();
      slot.value ??= { current: initialValue };
      return slot.value as { current: T };
    },
    useState<T>(initialValue: T) {
      const slot = nextSlot();
      if (!("value" in slot)) {
        slot.value = initialValue;
      }
      const setValue = (next: T | ((current: T) => T)) => {
        slot.value =
          typeof next === "function" ? (next as (current: T) => T)(slot.value as T) : next;
      };
      return [slot.value as T, setValue] as const;
    },
  };
});

const recorder = vi.hoisted(() => ({
  isRecording: true,
  startRecording: vi.fn<() => Promise<void>>(),
  stopRecording: vi.fn(),
  cancelRecording: vi.fn<() => Promise<void>>(),
}));

const nativeApi = vi.hoisted(() => ({
  transcribeVoice: vi.fn(),
  available: true,
}));

const toast = vi.hoisted(() => ({ add: vi.fn() }));
const voiceAvailability = vi.hoisted(() => ({
  canStartVoiceNotes: true,
  showVoiceNotesControl: true,
}));

vi.mock("react", () => ({
  useEffect: reactHarness.useEffect,
  useLayoutEffect: reactHarness.useLayoutEffect,
  useRef: reactHarness.useRef,
  useState: reactHarness.useState,
}));

vi.mock("../../lib/voiceRecorder", () => ({
  formatVoiceRecordingDuration: () => "0:00",
  useVoiceRecorder: () => ({
    isRecording: recorder.isRecording,
    durationMs: 0,
    waveformLevels: [],
    startRecording: recorder.startRecording,
    stopRecording: recorder.stopRecording,
    cancelRecording: recorder.cancelRecording,
  }),
}));

vi.mock("../../nativeApi", () => ({
  readNativeApi: () =>
    nativeApi.available
      ? {
          server: {
            transcribeVoice: nativeApi.transcribeVoice,
          },
        }
      : null,
}));

vi.mock("../ui/toast", () => ({ toastManager: toast }));

vi.mock("../ChatView.logic", () => ({
  deriveComposerVoiceState: () => ({ ...voiceAvailability }),
  describeVoiceRecordingStartError: (error: unknown) => String(error),
  isVoiceAuthExpiredMessage: (message: string) => message.includes("expired"),
  sanitizeVoiceErrorMessage: (message: string) => message,
}));

import type { Project } from "../../types";
import {
  useComposerVoiceController,
  type UseComposerVoiceControllerOptions,
  type UseComposerVoiceControllerResult,
} from "./useComposerVoiceController";

const THREAD_A = ThreadId.makeUnsafe("thread-a");
const THREAD_B = ThreadId.makeUnsafe("thread-b");
const PROJECT: Project = {
  id: ProjectId.makeUnsafe("project-a"),
  kind: "project",
  name: "Project",
  remoteName: "Project",
  folderName: "project",
  localName: null,
  cwd: "/workspace/project",
  expanded: true,
  scripts: [],
};
const AUDIO_PAYLOAD = {
  audioBase64: "audio",
  mimeType: "audio/wav" as const,
  sampleRateHz: 24_000,
  durationMs: 500,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useComposerVoiceController", () => {
  let options: UseComposerVoiceControllerOptions;
  let result: UseComposerVoiceControllerResult;

  const render = (overrides: Partial<UseComposerVoiceControllerOptions> = {}) => {
    options = { ...options, ...overrides };
    reactHarness.beginRender();
    result = useComposerVoiceController(options);
    return result;
  };

  beforeEach(async () => {
    reactHarness.reset();
    recorder.isRecording = true;
    recorder.startRecording.mockReset().mockResolvedValue(undefined);
    recorder.stopRecording.mockReset().mockResolvedValue(AUDIO_PAYLOAD);
    recorder.cancelRecording.mockReset().mockResolvedValue(undefined);
    nativeApi.transcribeVoice.mockReset().mockResolvedValue({ text: "transcribed once" });
    nativeApi.available = true;
    voiceAvailability.canStartVoiceNotes = true;
    voiceAvailability.showVoiceNotesControl = true;
    toast.add.mockReset();
    options = {
      activeProject: PROJECT,
      activeThreadId: THREAD_A,
      threadId: THREAD_A,
      pendingUserInputCount: 0,
      onTranscriptReady: vi.fn(),
    };
    render();
    await Promise.resolve();
    recorder.cancelRecording.mockClear();
  });

  it("applies a successful transcription exactly once", async () => {
    await result.submitComposerVoiceRecording();

    expect(options.onTranscriptReady).toHaveBeenCalledTimes(1);
    expect(options.onTranscriptReady).toHaveBeenCalledWith("transcribed once");
  });

  it.each(["thread", "cancel"] as const)(
    "ignores a stale transcription after %s changes",
    async (staleCause) => {
      const transcription = deferred<{ text: string }>();
      nativeApi.transcribeVoice.mockReturnValueOnce(transcription.promise);

      const submission = result.submitComposerVoiceRecording();
      await vi.waitFor(() => expect(nativeApi.transcribeVoice).toHaveBeenCalledTimes(1));

      if (staleCause === "thread") {
        render({ activeThreadId: THREAD_B, threadId: THREAD_B });
      } else {
        result.cancelComposerVoiceRecording();
      }

      transcription.resolve({ text: "stale" });
      await submission;

      expect(options.onTranscriptReady).not.toHaveBeenCalled();
    },
  );

  it("blocks submit and cancel until the configured action-arm delay elapses", async () => {
    let now = 1_000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    recorder.isRecording = false;
    render({ actionArmDelayMs: 250, onGuardWarning: vi.fn() });

    await result.startComposerVoiceRecording();
    recorder.isRecording = true;
    render();
    recorder.cancelRecording.mockClear();
    now = 1_100;

    await result.submitComposerVoiceRecording();
    result.cancelComposerVoiceRecording();

    expect(recorder.stopRecording).not.toHaveBeenCalled();
    expect(recorder.cancelRecording).not.toHaveBeenCalled();
    expect(options.onGuardWarning).toHaveBeenCalledTimes(2);
  });

  it("supports ChatView-specific transcription failure copy without changing defaults", async () => {
    nativeApi.transcribeVoice.mockRejectedValueOnce(new Error("network failed"));
    render({
      failureCopy: {
        transcriptionFailedTitle: "Couldn't transcribe voice note",
      },
    });

    await result.submitComposerVoiceRecording();

    expect(toast.add).toHaveBeenCalledWith({
      type: "error",
      title: "Couldn't transcribe voice note",
      description: "network failed",
    });
  });

  it("cancels and invalidates transcription when voice becomes unavailable", async () => {
    const transcription = deferred<{ text: string }>();
    nativeApi.transcribeVoice.mockReturnValueOnce(transcription.promise);
    recorder.cancelRecording.mockImplementationOnce(async () => {
      recorder.isRecording = false;
    });

    const submission = result.submitComposerVoiceRecording();
    await vi.waitFor(() => expect(nativeApi.transcribeVoice).toHaveBeenCalledTimes(1));

    voiceAvailability.canStartVoiceNotes = false;
    render();
    await vi.waitFor(() => expect(recorder.cancelRecording).toHaveBeenCalledTimes(1));
    render();

    expect(result.isVoiceRecording).toBe(false);
    expect(result.isVoiceTranscribing).toBe(false);

    transcription.resolve({ text: "stale after availability loss" });
    await submission;
    expect(options.onTranscriptReady).not.toHaveBeenCalled();
  });

  it("does not let an older availability cancellation clear a newer transcription", async () => {
    const firstTranscription = deferred<{ text: string }>();
    const secondTranscription = deferred<{ text: string }>();
    const cancellation = deferred<void>();
    nativeApi.transcribeVoice
      .mockReturnValueOnce(firstTranscription.promise)
      .mockReturnValueOnce(secondTranscription.promise);
    recorder.cancelRecording.mockReturnValueOnce(cancellation.promise);

    const firstSubmission = result.submitComposerVoiceRecording();
    await vi.waitFor(() => expect(nativeApi.transcribeVoice).toHaveBeenCalledTimes(1));

    voiceAvailability.canStartVoiceNotes = false;
    render();
    await vi.waitFor(() => expect(recorder.cancelRecording).toHaveBeenCalledTimes(1));

    voiceAvailability.canStartVoiceNotes = true;
    render();
    const secondSubmission = result.submitComposerVoiceRecording();
    await vi.waitFor(() => expect(nativeApi.transcribeVoice).toHaveBeenCalledTimes(2));

    cancellation.resolve();
    await cancellation.promise;
    render();
    expect(result.isVoiceTranscribing).toBe(true);

    firstTranscription.resolve({ text: "stale first transcript" });
    secondTranscription.resolve({ text: "current second transcript" });
    await Promise.all([firstSubmission, secondSubmission]);

    expect(options.onTranscriptReady).toHaveBeenCalledTimes(1);
    expect(options.onTranscriptReady).toHaveBeenCalledWith("current second transcript");
  });
});
