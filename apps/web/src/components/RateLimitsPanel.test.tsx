import { describe, expect, it } from "vitest";
import { EventId, type OrchestrationThreadActivity, TurnId } from "@harnessos/contracts";

import {
  deriveAccountRateLimits,
  deriveVisibleRateLimitRows,
  formatRateLimitRemainingPercent,
} from "~/lib/rateLimits";

function makeActivity(
  id: string,
  kind: string,
  payload: OrchestrationThreadActivity["payload"],
  createdAt = "2099-04-08T18:00:00.000Z",
): OrchestrationThreadActivity {
  return {
    id: EventId.makeUnsafe(id),
    tone: "info",
    kind,
    summary: kind,
    payload,
    turnId: TurnId.makeUnsafe("turn-1"),
    createdAt,
  };
}

describe("RateLimitsPanel helpers", () => {
  it("normalizes direct rate-limit snapshots into visible 5h and Weekly rows", () => {
    const rateLimits = deriveAccountRateLimits([
      {
        activities: [
          makeActivity("activity-1", "account.rate-limits.updated", {
            engine: "codex",
            rateLimitsByLimitId: {
              short: {
                primary: {
                  usedPercent: 12,
                  windowDurationMins: 300,
                  resetsAt: "2099-04-08T20:43:00.000Z",
                },
              },
              weekly: {
                primary: {
                  usedPercent: 8,
                  windowDurationMins: 10_080,
                  resetsAt: "2099-04-15T00:00:00.000Z",
                },
              },
            },
          }),
        ],
      },
    ]);

    const rows = deriveVisibleRateLimitRows(rateLimits);

    expect(rows).toEqual([
      {
        id: "codex-5h",
        label: "5h",
        remainingPercent: 88,
        resetsAt: "2099-04-08T20:43:00.000Z",
        windowDurationMins: 300,
      },
      {
        id: "codex-Weekly",
        label: "Weekly",
        remainingPercent: 92,
        resetsAt: "2099-04-15T00:00:00.000Z",
        windowDurationMins: 10080,
      },
    ]);
    expect(formatRateLimitRemainingPercent(rows[0]?.remainingPercent)).toBe("88%");
  });

  it("keeps the most constrained row when multiple engines report the same window", () => {
    const rows = deriveVisibleRateLimitRows([
      {
        engine: "codex",
        updatedAt: "2099-04-08T18:00:00.000Z",
        limits: [
          {
            window: "Weekly",
            usedPercent: 8,
            resetsAt: "2099-04-15T00:00:00.000Z",
            windowDurationMins: 10080,
          },
        ],
      },
      {
        engine: "claude",
        updatedAt: "2099-04-08T18:05:00.000Z",
        limits: [
          {
            window: "Weekly",
            usedPercent: 20,
            resetsAt: "2099-04-14T20:00:00.000Z",
            windowDurationMins: 10080,
          },
        ],
      },
    ]);

    expect(rows).toEqual([
      {
        id: "claudeAgent-Weekly",
        label: "Weekly",
        remainingPercent: 80,
        resetsAt: "2099-04-14T20:00:00.000Z",
        windowDurationMins: 10080,
      },
    ]);
  });

  it("reads nested codex runtime payloads like the app-server notifications", () => {
    const rateLimits = deriveAccountRateLimits([
      {
        activities: [
          makeActivity("activity-1", "account.rate-limits.updated", {
            engine: "codex",
            rateLimits: {
              limitId: "codex",
              primary: {
                usedPercent: 12,
                windowDurationMins: 300,
                resetsAt: "2099-04-08T20:43:00.000Z",
              },
              secondary: {
                usedPercent: 8,
                windowDurationMins: 10_080,
                resetsAt: "2099-04-15T00:00:00.000Z",
              },
            },
          }),
        ],
      },
    ]);

    const rows = deriveVisibleRateLimitRows(rateLimits);

    expect(rows).toEqual([
      {
        id: "codex-5h",
        label: "5h",
        remainingPercent: 88,
        resetsAt: "2099-04-08T20:43:00.000Z",
        windowDurationMins: 300,
      },
      {
        id: "codex-Weekly",
        label: "Weekly",
        remainingPercent: 92,
        resetsAt: "2099-04-15T00:00:00.000Z",
        windowDurationMins: 10080,
      },
    ]);
  });

  it("reads doubly nested codex runtime payloads from engine logs", () => {
    const rateLimits = deriveAccountRateLimits([
      {
        activities: [
          makeActivity("activity-1", "account.rate-limits.updated", {
            engine: "codex",
            rateLimits: {
              rateLimits: {
                primary: {
                  usedPercent: 20,
                  windowDurationMins: 300,
                  resetsAt: 4_079_388_780,
                },
                secondary: {
                  usedPercent: 10,
                  windowDurationMins: 10_080,
                  resetsAt: 4_079_880_000,
                },
              },
            },
          }),
        ],
      },
    ]);

    expect(deriveVisibleRateLimitRows(rateLimits)).toEqual([
      {
        id: "codex-5h",
        label: "5h",
        remainingPercent: 80,
        resetsAt: "2099-04-09T03:33:00.000Z",
        windowDurationMins: 300,
      },
      {
        id: "codex-Weekly",
        label: "Weekly",
        remainingPercent: 90,
        resetsAt: "2099-04-14T20:00:00.000Z",
        windowDurationMins: 10080,
      },
    ]);
  });

  it("reads claude rate_limit_info payloads from runtime telemetry", () => {
    const rateLimits = deriveAccountRateLimits([
      {
        activities: [
          makeActivity("activity-1", "account.rate-limits.updated", {
            engine: "claude",
            rate_limit_info: {
              status: "allowed_warning",
              rateLimitType: "five_hour",
              utilization: 0.9,
              resetsAt: 4_078_972_980,
            },
          }),
        ],
      },
    ]);

    const rows = deriveVisibleRateLimitRows(rateLimits);

    expect(rows).toEqual([
      {
        id: "claudeAgent-5h",
        label: "5h",
        remainingPercent: 10,
        resetsAt: "2099-04-04T08:03:00.000Z",
        windowDurationMins: 300,
      },
    ]);
  });

  it("projects the included-overage telemetry window immediately after Weekly", () => {
    const rateLimits = deriveAccountRateLimits([
      {
        activities: [
          makeActivity("activity-overage", "account.rate-limits.updated", {
            engine: "claude",
            rate_limit_info: {
              status: "allowed",
              rateLimitType: "seven_day_overage_included",
              utilization: 0.25,
              resetsAt: 4_079_880_000,
            },
          }),
        ],
      },
    ]);

    expect(deriveVisibleRateLimitRows(rateLimits)).toEqual([
      {
        id: "claudeAgent-Weekly (overage)",
        label: "Weekly (overage)",
        remainingPercent: 75,
        resetsAt: "2099-04-14T20:00:00.000Z",
      },
    ]);
  });

  it("humanizes unknown windows without collapsing their identity or sort order", () => {
    const rows = deriveVisibleRateLimitRows([
      {
        engine: "codex",
        updatedAt: "2099-04-08T18:00:00.000Z",
        limits: [
          { window: "new_provider_window", usedPercent: 10 },
          { window: "Weekly", usedPercent: 5 },
          { window: "another-engine-window", usedPercent: 20 },
          { window: "weekly_overage", usedPercent: 15, windowDurationMins: 10_080 },
          { window: "new-engine-window", usedPercent: 30 },
          { window: "Sonnet", usedPercent: 25 },
        ],
      },
    ]);

    expect(
      rows.map(({ id, label, remainingPercent }) => ({ id, label, remainingPercent })),
    ).toEqual([
      { id: "codex-Weekly", label: "Weekly", remainingPercent: 95 },
      {
        id: "codex-Weekly (overage)",
        label: "Weekly (overage)",
        remainingPercent: 85,
      },
      { id: "codex-Sonnet", label: "Sonnet", remainingPercent: 75 },
      {
        id: "codex-Another Engine Window",
        label: "Another Engine Window",
        remainingPercent: 80,
      },
      {
        id: "codex-New Engine Window",
        label: "New Engine Window",
        remainingPercent: 70,
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain("new_provider_window");
  });
});
