import { describe, expect, it } from "vitest";
import { normalizeSearchText, rankSearchItems } from "./searchRanking";

describe("rankSearchItems", () => {
  const items = [
    { title: "Release Prep", detail: "Ship the desktop app" },
    { title: "Check Code", detail: "Review recent changes" },
    { title: "Documentation", detail: "Release checklist" },
  ];

  it("prioritizes primary fields over weighted secondary matches", () => {
    expect(
      rankSearchItems(items, "release", (item) => [
        { value: item.title },
        { value: item.detail, weight: 200 },
      ]).map((item) => item.title),
    ).toEqual(["Release Prep", "Documentation"]);
  });

  it("matches compact queries across normalized separators", () => {
    expect(normalizeSearchText("CHECK_code")).toBe("check code");
    expect(
      rankSearchItems(items, "checkcode", (item) => [{ value: item.title }]).map(
        (item) => item.title,
      ),
    ).toEqual(["Check Code"]);
  });
});
