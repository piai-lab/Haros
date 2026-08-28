import type { OrchestrationMessageTextSegment } from "@harnessos/contracts";

export interface MessageTextSegmentProjectionInput {
  readonly text: string;
  readonly streaming: boolean;
  readonly segmentStartedAt: string | undefined;
  readonly sequence: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function deriveNextMessageTextSegments(
  previous: ReadonlyArray<OrchestrationMessageTextSegment> | undefined,
  input: MessageTextSegmentProjectionInput,
): ReadonlyArray<OrchestrationMessageTextSegment> | undefined {
  if (input.streaming) {
    if (input.segmentStartedAt) {
      const tail = previous?.[previous.length - 1];
      if (
        tail?.sequence === input.sequence &&
        tail.startedAt === input.segmentStartedAt &&
        tail.endedAt === input.updatedAt &&
        tail.text === input.text
      ) {
        return previous;
      }
      return [
        ...(previous ?? []),
        {
          sequence: input.sequence,
          startedAt: input.segmentStartedAt,
          endedAt: input.updatedAt,
          text: input.text,
        },
      ];
    }
    if (previous && previous.length > 0) {
      const tail = previous[previous.length - 1]!;
      return [
        ...previous.slice(0, -1),
        {
          ...tail,
          text: `${tail.text}${input.text}`,
          endedAt: input.updatedAt,
        },
      ];
    }
    return [
      {
        sequence: input.sequence,
        startedAt: input.createdAt,
        endedAt: input.updatedAt,
        text: input.text,
      },
    ];
  }

  if (previous && previous.length > 1) {
    const collatedSegmentText = previous.map((segment) => segment.text).join("");
    if (collatedSegmentText === input.text || input.text.length === 0) {
      const tail = previous[previous.length - 1]!;
      if (tail.endedAt === input.updatedAt) return previous;
      return [...previous.slice(0, -1), { ...tail, endedAt: input.updatedAt }];
    }
  }
  return undefined;
}
