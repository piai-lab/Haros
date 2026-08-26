// FILE: InlineChip.tsx
// Purpose: Shared inner structure for every inline token chip (skill, mention,
//          agent, link). Centralizes the `{icon}{label}` shape and the label
//          class so all chips render identically; each chip component owns only
//          its icon, label text, host element, and class/variant.
// Layer: Shared UI component
// Exports: InlineChipContent

import type { ReactNode } from "react";
import {
  COMPOSER_INLINE_CHIP_LABEL_CLASS_NAME,
  TIMELINE_INLINE_CHIP_LABEL_CLASS_NAME,
  type InlineChipSelectionMode,
} from "./composerInlineChip";

export function InlineChipContent(props: {
  icon: ReactNode;
  label: ReactNode;
  selectionMode: InlineChipSelectionMode;
}) {
  return (
    <>
      {props.icon}
      <span
        className={
          props.selectionMode === "document"
            ? TIMELINE_INLINE_CHIP_LABEL_CLASS_NAME
            : COMPOSER_INLINE_CHIP_LABEL_CLASS_NAME
        }
      >
        {props.label}
      </span>
    </>
  );
}
