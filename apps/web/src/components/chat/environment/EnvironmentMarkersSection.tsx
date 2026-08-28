// FILE: EnvironmentMarkersSection.tsx
// Purpose: "Markers" section of the Environment panel for highlighted transcript text.
// Layer: Environment panel section

import type { MessageId, ThreadMarker, ThreadMarkerId } from "@harnessos/contracts";
import { isThreadMarkerAvailable } from "@harnessos/shared/threadMarkers";

import { cn } from "~/lib/utils";
import { deriveThreadMarkerLabel } from "~/threadMarkers";
import { useI18n } from "~/i18n";

import { EnvironmentEditableChecklistRow } from "./EnvironmentEditableChecklistRow";
import { EnvironmentCollapsibleSection } from "./EnvironmentRow";

const MARKER_SWATCH_CLASS: Record<ThreadMarker["color"], string> = {
  yellow: "bg-[color-mix(in_srgb,var(--color-text-accent)_14%,transparent)]",
  blue: "border border-[color-mix(in_srgb,var(--color-text-foreground)_22%,transparent)] bg-transparent",
  green: "bg-[#34d399]",
  pink: "bg-[#f472b6]",
};

interface EnvironmentMarkersSectionProps {
  markers: readonly ThreadMarker[];
  messageTextById: ReadonlyMap<MessageId, string>;
  onJump: (marker: ThreadMarker) => void;
  onToggleDone: (markerId: ThreadMarkerId) => void;
  onRemove: (markerId: ThreadMarkerId) => void;
  onRename: (markerId: ThreadMarkerId, label: string | null) => void;
}

export function EnvironmentMarkersSection({
  markers,
  messageTextById,
  onJump,
  onToggleDone,
  onRemove,
  onRename,
}: EnvironmentMarkersSectionProps) {
  const { t } = useI18n();
  if (markers.length === 0) {
    return null;
  }
  return (
    <EnvironmentCollapsibleSection label={t("environment.textMarkers")}>
      <ul className="flex flex-col">
        {markers.map((marker) => (
          <MarkerRow
            key={marker.id}
            marker={marker}
            text={messageTextById.get(marker.messageId)}
            onJump={onJump}
            onToggleDone={onToggleDone}
            onRemove={onRemove}
            onRename={onRename}
          />
        ))}
      </ul>
    </EnvironmentCollapsibleSection>
  );
}

function MarkerRow({
  marker,
  text,
  onJump,
  onToggleDone,
  onRemove,
  onRename,
}: {
  marker: ThreadMarker;
  text: string | undefined;
  onJump: (marker: ThreadMarker) => void;
  onToggleDone: (markerId: ThreadMarkerId) => void;
  onRemove: (markerId: ThreadMarkerId) => void;
  onRename: (markerId: ThreadMarkerId, label: string | null) => void;
}) {
  const { t } = useI18n();
  const available = text !== undefined && isThreadMarkerAvailable(marker, text);
  const resolvedLabel = marker.label?.trim() || deriveThreadMarkerLabel(marker);
  const displayLabel = available
    ? resolvedLabel
    : t("environment.markerUnavailable", { label: resolvedLabel });

  return (
    <EnvironmentEditableChecklistRow
      checked={marker.done}
      available={available}
      displayLabel={displayLabel}
      initialEditLabel={marker.label ?? resolvedLabel}
      checkboxAriaLabel={marker.done ? t("environment.markNotDone") : t("environment.markDone")}
      labelAriaLabel={
        available ? t("environment.jumpMarkerAria") : t("environment.markerUnavailableAria")
      }
      labelTitle={
        available ? t("environment.jumpMarkerTooltip") : t("environment.markerUnavailableTooltip")
      }
      removeLabel={t("environment.removeMarker")}
      removeTooltip={t("environment.remove")}
      leading={
        <span
          aria-hidden="true"
          className={cn("size-2.5 shrink-0 rounded-full", MARKER_SWATCH_CLASS[marker.color])}
        />
      }
      className="group/marker"
      removeButtonClassName="group-hover/marker:opacity-100"
      onJump={() => onJump(marker)}
      onToggleDone={() => onToggleDone(marker.id)}
      onRemove={() => onRemove(marker.id)}
      onRename={(label) => onRename(marker.id, label)}
    />
  );
}
