import { describe, expect, it } from "vitest";

import { getAppTypographyScale } from "./appTypography";

describe("getAppTypographyScale", () => {
  it("maps the default base to readable semantic UI, activity, and chat roles", () => {
    expect(getAppTypographyScale()).toEqual({
      basePx: 14,
      activityPx: 13,
      uiPx: 14,
      uiLgPx: 15,
      uiSmPx: 13,
      uiXsPx: 12,
      ui2XsPx: 11,
      uiMetaPx: 12,
      uiTimestampPx: 11,
      chatPx: 14,
      chatCodePx: 13,
      chatMetaPx: 11,
      chatTinyPx: 10,
    });
  });

  it("preserves useful hierarchy at the supported minimum and maximum", () => {
    expect(getAppTypographyScale(11)).toMatchObject({
      basePx: 11,
      activityPx: 11,
      uiPx: 11,
      uiSmPx: 11,
      uiXsPx: 11,
      ui2XsPx: 10,
      uiMetaPx: 11,
      uiTimestampPx: 10,
      chatPx: 11,
      chatCodePx: 11,
      chatMetaPx: 10,
      chatTinyPx: 10,
    });
    expect(getAppTypographyScale(18)).toMatchObject({
      basePx: 18,
      activityPx: 17,
      uiPx: 18,
      uiLgPx: 19,
      uiSmPx: 17,
      uiXsPx: 15,
      ui2XsPx: 14,
      uiMetaPx: 15,
      uiTimestampPx: 14,
      chatPx: 18,
      chatCodePx: 17,
      chatMetaPx: 14,
      chatTinyPx: 13,
    });
  });
});
