import {
  DEFAULT_APP_FONT_SIZE_PX,
  MAX_CHAT_FONT_SIZE_PX,
  normalizeChatFontSizePx,
} from "../appSettings";

export interface AppTypographyScale {
  basePx: number;
  activityPx: number;
  uiPx: number;
  uiLgPx: number;
  uiSmPx: number;
  uiXsPx: number;
  ui2XsPx: number;
  uiMicroPx: number;
  uiMetaPx: number;
  uiTimestampPx: number;
  chatPx: number;
  chatCodePx: number;
  chatMetaPx: number;
  chatTinyPx: number;
}

function clampTypographyPx(value: number, min: number, max = MAX_CHAT_FONT_SIZE_PX + 2): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function getAppTypographyScale(
  baseFontSizePx = DEFAULT_APP_FONT_SIZE_PX,
): AppTypographyScale {
  const basePx = normalizeChatFontSizePx(baseFontSizePx);

  return {
    basePx,
    // Work/tool activity is supporting evidence, not reading copy. Keep it one
    // optical step below the transcript at normal sizes without collapsing a
    // user-selected 11–12px scale into unreadable microcopy.
    activityPx: clampTypographyPx(basePx * 0.96, 11),
    uiPx: basePx,
    uiLgPx: clampTypographyPx(basePx * 1.08, basePx),
    uiSmPx: clampTypographyPx(basePx * 0.92, 11),
    uiXsPx: clampTypographyPx(basePx * 0.84, 11),
    ui2XsPx: clampTypographyPx(basePx * 0.76, 10),
    uiMicroPx: clampTypographyPx(basePx * 0.72, 9),
    uiMetaPx: clampTypographyPx(basePx * 0.84, 11),
    uiTimestampPx: clampTypographyPx(basePx * 0.78, 10),
    chatPx: basePx,
    chatCodePx: clampTypographyPx(basePx * 0.95, 11),
    chatMetaPx: clampTypographyPx(basePx * 0.78, 10),
    chatTinyPx: clampTypographyPx(basePx * 0.72, 10),
  };
}
