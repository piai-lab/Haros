// FILE: providerMetadata.ts
// Purpose: Exhaustive credential-blind provider presentation metadata.

import type { ProviderKind } from "@omnimind/contracts";

export interface ProviderDescriptor {
  readonly kind: ProviderKind;
  readonly displayName: string;
  readonly usage: {
    readonly signInCommand: string;
    readonly learnMoreHref: string;
  } | null;
}

type ExhaustiveProviderDescriptors<Descriptors extends readonly ProviderDescriptor[]> =
  Exclude<ProviderKind, Descriptors[number]["kind"]> extends never ? Descriptors : never;

function defineProviderDescriptors<const Descriptors extends readonly ProviderDescriptor[]>(
  descriptors: ExhaustiveProviderDescriptors<Descriptors>,
): Descriptors {
  return descriptors;
}

export const PROVIDER_DESCRIPTORS = defineProviderDescriptors([
  {
    kind: "omnimind",
    displayName: "OmniMind",
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
    kind: "claudeAgent",
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
    // Stock Pi private state is intentionally isolated. OmniMind must not discover or read
    // ~/.pi merely to populate a background settings panel.
    usage: null,
  },
] as const satisfies readonly ProviderDescriptor[]);

export const PROVIDER_DESCRIPTOR_BY_KIND = Object.fromEntries(
  PROVIDER_DESCRIPTORS.map((descriptor) => [descriptor.kind, descriptor]),
) as Record<ProviderKind, (typeof PROVIDER_DESCRIPTORS)[number]>;

export const PROVIDER_DISPLAY_NAMES: Readonly<Record<ProviderKind, string>> = Object.fromEntries(
  PROVIDER_DESCRIPTORS.map((descriptor) => [descriptor.kind, descriptor.displayName]),
) as Record<ProviderKind, string>;
