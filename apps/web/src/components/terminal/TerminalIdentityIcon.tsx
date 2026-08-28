// FILE: TerminalIdentityIcon.tsx
// Purpose: Renders a terminal/engine icon without extra activity chrome.
// Layer: Terminal presentation primitive
// Depends on: shared terminal icon keys plus local engine/icon components.

import type { TerminalIconKey } from "@harnessos/shared/terminalThreads";

import { TerminalSquare } from "~/lib/icons";
import { cn } from "~/lib/utils";

import { AntigravityIcon, ClaudeAI, OpenAI } from "../Icons";

interface TerminalIdentityIconProps {
  iconKey: TerminalIconKey;
  className?: string;
}

// Keep engine branding reusable across every terminal surface.
export default function TerminalIdentityIcon({ iconKey, className }: TerminalIdentityIconProps) {
  const IconComponent =
    iconKey === "openai"
      ? OpenAI
      : iconKey === "claude"
        ? ClaudeAI
        : iconKey === "antigravity"
          ? AntigravityIcon
          : TerminalSquare;

  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
      <IconComponent className={cn("size-full text-[var(--color-text-foreground)]")} />
    </span>
  );
}
