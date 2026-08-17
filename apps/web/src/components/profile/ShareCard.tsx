// FILE: ShareCard.tsx
// Purpose: Fixed, theme-independent OmniMind activity card rendered locally to PNG.

import { forwardRef } from "react";
import type { ProfileStats, ProfileTokenStats } from "@omnimind/contracts";

import { OmniMindLogo } from "~/components/OmniMindLogo";
import { useI18n } from "~/i18n";
import {
  ActivityHeatmap,
  CARD_HEATMAP_INTENSITY_CLASSES,
} from "./ActivityHeatmap";
import { ProfileAvatar } from "./ProfileAvatar";
import { formatCompact, formatNumber } from "./profileFormatting";

export const SHARE_CARD_WIDTH = 860;
export const SHARE_CARD_HEIGHT = 440;
const CARD_HEATMAP_DAYS = 183;

interface ShareCardProps {
  readonly stats: ProfileStats;
  readonly tokenStats: ProfileTokenStats | null;
  readonly displayName: string;
  readonly handle: string;
  readonly avatarColor: string;
  readonly avatarImage: string | null;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard(
    { stats, tokenStats, displayName, handle, avatarColor, avatarImage },
    ref,
  ) {
    const { t } = useI18n();
    const tiles = [
      {
        value: formatCompact(tokenStats?.lifetimeTotalTokens ?? null),
        label: t("settings.lifetimeTokens"),
      },
      {
        value: formatCompact(tokenStats?.peakDayTokens ?? null),
        label: t("settings.peakDay"),
      },
      {
        value: formatNumber(stats.activity.currentStreakDays),
        label: t("settings.currentStreak"),
      },
      {
        value: formatNumber(stats.activity.longestStreakDays),
        label: t("settings.longestStreak"),
      },
    ];

    return (
      <div
        ref={ref}
        style={{ width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT }}
        className="flex flex-col justify-center gap-7 overflow-hidden bg-white px-12 font-sans text-slate-900"
      >
        <div className="flex min-w-0 items-center justify-between gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <ProfileAvatar
              initials={stats.identity.initials}
              color={avatarColor}
              image={avatarImage}
              className="size-16 shrink-0 text-lg font-medium"
              textClassName="text-lg font-medium"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-2xl leading-tight tracking-tight">
                {displayName}
              </span>
              <span className="truncate text-base text-slate-400">
                {handle}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-slate-600">
            <OmniMindLogo size={24} variant="flat" responsive={false} />
            <span className="text-xl tracking-tight">OmniMind</span>
          </div>
        </div>
        <ActivityHeatmap
          cells={stats.activity.heatmap.slice(-CARD_HEATMAP_DAYS)}
          cellSize={22}
          gap={4}
          radius={5}
          intensityClasses={CARD_HEATMAP_INTENSITY_CLASSES}
        />
        <div className="flex items-stretch">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="flex flex-1 flex-col items-start gap-1"
            >
              <span className="text-2xl leading-none tracking-tight">
                {tile.value}
              </span>
              <span className="text-sm text-slate-400">{tile.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
);
