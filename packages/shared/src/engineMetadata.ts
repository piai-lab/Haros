// FILE: engineMetadata.ts
// Purpose: The exhaustive, credential-blind identity owner for top-level Agent Engines.

import type { EngineKind } from "@harnessos/contracts";

export interface EngineDescriptor {
  readonly kind: EngineKind;
  readonly displayName: string;
  readonly usage: {
    readonly signInCommand: string;
    readonly learnMoreHref: string;
  } | null;
}

type ExhaustiveEngineDescriptors<Descriptors extends readonly EngineDescriptor[]> =
  Exclude<EngineKind, Descriptors[number]["kind"]> extends never ? Descriptors : never;

function defineEngineDescriptors<const Descriptors extends readonly EngineDescriptor[]>(
  descriptors: ExhaustiveEngineDescriptors<Descriptors>,
): Descriptors {
  return descriptors;
}

export const ENGINE_DESCRIPTORS = defineEngineDescriptors([
  {
    kind: "oa",
    displayName: "OA",
    usage: null,
  },
  {
    kind: "codex",
    displayName: "Codex",
    usage: {
      signInCommand: "codex login",
      learnMoreHref: "https://platform.openai.com/usage",
    },
  },
  {
    kind: "claude",
    displayName: "Claude",
    usage: {
      signInCommand: "claude",
      learnMoreHref: "https://docs.anthropic.com/en/docs/about-claude/models#rate-limits",
    },
  },
  {
    kind: "cursor",
    displayName: "Cursor",
    usage: {
      signInCommand: "cursor-agent login",
      learnMoreHref: "https://cursor.com/dashboard",
    },
  },
  {
    kind: "antigravity",
    displayName: "Antigravity",
    usage: {
      signInCommand: "agy",
      learnMoreHref: "https://antigravity.google",
    },
  },
  {
    kind: "grok",
    displayName: "Grok",
    usage: {
      signInCommand: "grok login",
      learnMoreHref: "https://console.x.ai",
    },
  },
  {
    kind: "droid",
    displayName: "Droid",
    usage: {
      signInCommand: "droid",
      learnMoreHref: "https://docs.factory.ai/pricing",
    },
  },
  {
    kind: "kilo",
    displayName: "Kilo",
    usage: {
      signInCommand: "kilo",
      learnMoreHref: "https://kilo.ai",
    },
  },
  {
    kind: "opencode",
    displayName: "OpenCode",
    usage: {
      signInCommand: "opencode auth login",
      learnMoreHref: "https://opencode.ai",
    },
  },
  {
    kind: "pi",
    displayName: "Pi",
    // Stock Pi private state is intentionally isolated. HarnessOS must not discover or read
    // ~/.pi merely to populate a background settings panel.
    usage: null,
  },
] as const satisfies readonly EngineDescriptor[]);

export const ENGINE_DESCRIPTOR_BY_KIND = Object.fromEntries(
  ENGINE_DESCRIPTORS.map((descriptor) => [descriptor.kind, descriptor]),
) as Record<EngineKind, (typeof ENGINE_DESCRIPTORS)[number]>;

export const ENGINE_DISPLAY_NAMES: Readonly<Record<EngineKind, string>> = Object.fromEntries(
  ENGINE_DESCRIPTORS.map((descriptor) => [descriptor.kind, descriptor.displayName]),
) as Record<EngineKind, string>;
