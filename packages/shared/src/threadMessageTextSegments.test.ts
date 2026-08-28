import type { OrchestrationMessageTextSegment } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import { deriveNextMessageTextSegments } from "./threadMessageTextSegments";

const first: OrchestrationMessageTextSegment = {
  sequence: 10,
  startedAt: "2026-08-25T00:00:00.000Z",
  endedAt: "2026-08-25T00:00:00.000Z",
  text: "Before tool.",
};
const second: OrchestrationMessageTextSegment = {
  sequence: 30,
  startedAt: "2026-08-25T00:00:02.000Z",
  endedAt: "2026-08-25T00:00:02.000Z",
  text: "After tool.",
};

describe("deriveNextMessageTextSegments", () => {
  it.each([
    {
      name: "starts the first delta",
      previous: undefined,
      input: {
        text: first.text,
        streaming: true,
        segmentStartedAt: first.startedAt,
        sequence: first.sequence,
        createdAt: first.startedAt,
        updatedAt: first.endedAt,
      },
      expected: [first],
    },
    {
      name: "appends another delta to the current segment",
      previous: [first],
      input: {
        text: " More.",
        streaming: true,
        segmentStartedAt: undefined,
        sequence: 11,
        createdAt: first.startedAt,
        updatedAt: "2026-08-25T00:00:01.000Z",
      },
      expected: [
        {
          ...first,
          endedAt: "2026-08-25T00:00:01.000Z",
          text: "Before tool. More.",
        },
      ],
    },
    {
      name: "starts a new segment at a causal boundary",
      previous: [first],
      input: {
        text: second.text,
        streaming: true,
        segmentStartedAt: second.startedAt,
        sequence: second.sequence,
        createdAt: second.startedAt,
        updatedAt: second.endedAt,
      },
      expected: [first, second],
    },
    {
      name: "preserves multiple segments at terminal settlement",
      previous: [first, second],
      input: {
        text: `${first.text}${second.text}`,
        streaming: false,
        segmentStartedAt: undefined,
        sequence: 31,
        createdAt: first.startedAt,
        updatedAt: "2026-08-25T00:00:03.000Z",
      },
      expected: [first, { ...second, endedAt: "2026-08-25T00:00:03.000Z" }],
    },
    {
      name: "drops stale segments when terminal text does not match",
      previous: [first, second],
      input: {
        text: "Different terminal text.",
        streaming: false,
        segmentStartedAt: undefined,
        sequence: 31,
        createdAt: first.startedAt,
        updatedAt: "2026-08-25T00:00:03.000Z",
      },
      expected: undefined,
    },
  ])("$name", ({ previous, input, expected }) => {
    expect(deriveNextMessageTextSegments(previous, input)).toEqual(expected);
  });

  it("is idempotent when a segment-start event is replayed", () => {
    const previous = [first];
    const next = deriveNextMessageTextSegments(previous, {
      text: first.text,
      streaming: true,
      segmentStartedAt: first.startedAt,
      sequence: first.sequence,
      createdAt: first.startedAt,
      updatedAt: first.endedAt,
    });

    expect(next).toBe(previous);
  });
});
