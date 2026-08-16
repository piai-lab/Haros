import { describe, expect, it } from "vitest";

import {
  resolveEnvironmentAutoSuppressed,
  resolveEnvironmentPresentation,
  resolvePlanSidebarPresentation,
  resolveThreadSidebarAutoSuppressed,
  resolveThreadSidebarPresentation,
  resolveWorkbenchAutoExclusive,
  resolveWorkbenchPresentation,
  CHAT_CANVAS_COMPACT_WIDTH_PX,
  ENVIRONMENT_HYSTERESIS_PX,
  ENVIRONMENT_SUPPRESS_WIDTH_PX,
  THREAD_SIDEBAR_HYSTERESIS_PX,
  WORKBENCH_SPLIT_RESTORE_WIDTH_PX,
  WORKBENCH_SPLIT_SUPPRESS_WIDTH_PX,
} from "./responsiveWorkbench";

describe("responsive Workbench presentation", () => {
  const defaultSidebarWidth = 23 * 16;

  it("restores a manually open Sidebar after temporary spatial suppression", () => {
    const suppressed = resolveThreadSidebarAutoSuppressed({
      availableWidth: defaultSidebarWidth + CHAT_CANVAS_COMPACT_WIDTH_PX - 1,
      sidebarWidth: defaultSidebarWidth,
      previouslySuppressed: false,
    });
    expect(suppressed).toBe(true);
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: true,
        autoSuppressed: suppressed,
        temporaryReveal: false,
      }),
    ).toBe("hidden");

    const restored = resolveThreadSidebarAutoSuppressed({
      availableWidth:
        defaultSidebarWidth + CHAT_CANVAS_COMPACT_WIDTH_PX + THREAD_SIDEBAR_HYSTERESIS_PX,
      sidebarWidth: defaultSidebarWidth,
      previouslySuppressed: suppressed,
    });
    expect(restored).toBe(false);
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: true,
        autoSuppressed: restored,
        temporaryReveal: false,
      }),
    ).toBe("docked");
  });

  it("never revives a manually closed Sidebar", () => {
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: false,
        autoSuppressed: false,
        temporaryReveal: true,
      }),
    ).toBe("hidden");
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: false,
        autoSuppressed: true,
        temporaryReveal: false,
      }),
    ).toBe("hidden");
  });

  it("keeps passive edge peek distinct from modal temporary reveal", () => {
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: false,
        autoSuppressed: false,
        temporaryReveal: false,
        pointerPeek: true,
      }),
    ).toBe("peek");
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: false,
        autoSuppressed: true,
        temporaryReveal: true,
        pointerPeek: true,
      }),
    ).toBe("overlay");
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: false,
        autoSuppressed: true,
        temporaryReveal: false,
        pointerPeek: true,
      }),
    ).toBe("hidden");
  });

  it("lets an explicitly requested pressured reveal overlay a manually closed Sidebar", () => {
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: false,
        autoSuppressed: true,
        temporaryReveal: true,
      }),
    ).toBe("overlay");
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: false,
        autoSuppressed: false,
        temporaryReveal: false,
      }),
    ).toBe("hidden");
  });

  it("reveals a pressured Sidebar as a temporary overlay without changing manual intent", () => {
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: true,
        autoSuppressed: true,
        temporaryReveal: true,
      }),
    ).toBe("overlay");
    expect(
      resolveThreadSidebarPresentation({
        manualOpen: true,
        autoSuppressed: true,
        temporaryReveal: false,
      }),
    ).toBe("hidden");
  });

  it("uses hysteresis instead of oscillating at the Sidebar boundary", () => {
    let suppressed = false;
    for (const width of [687, 700, 720, 751]) {
      suppressed = resolveThreadSidebarAutoSuppressed({
        availableWidth: width,
        sidebarWidth: defaultSidebarWidth,
        previouslySuppressed: suppressed,
      });
      expect(suppressed).toBe(true);
    }
    suppressed = resolveThreadSidebarAutoSuppressed({
      availableWidth: 752,
      sidebarWidth: defaultSidebarWidth,
      previouslySuppressed: suppressed,
    });
    expect(suppressed).toBe(false);
  });

  it.each([480, 564, 640, 687])(
    "suppresses the default-width Sidebar only in the compact pressure range at %ipx",
    (availableWidth) => {
      expect(
        resolveThreadSidebarAutoSuppressed({
          availableWidth,
          sidebarWidth: defaultSidebarWidth,
          previouslySuppressed: false,
        }),
      ).toBe(true);
    },
  );

  it.each([688, 840, 1009, 1076, 1280, 1440, 1536])(
    "keeps the default-width Sidebar docked through the Codex-like navigation range at %ipx",
    (availableWidth) => {
      expect(
        resolveThreadSidebarAutoSuppressed({
          availableWidth,
          sidebarWidth: defaultSidebarWidth,
          previouslySuppressed: false,
        }),
      ).toBe(false);
    },
  );

  it("uses an explicitly resized Sidebar width in the same shell budget", () => {
    expect(
      resolveThreadSidebarAutoSuppressed({
        availableWidth: 528,
        sidebarWidth: 208,
        previouslySuppressed: false,
      }),
    ).toBe(false);
  });

  it("suppresses Environment before Sidebar and restores it with hysteresis", () => {
    let suppressed = resolveEnvironmentAutoSuppressed({
      availableWidth: ENVIRONMENT_SUPPRESS_WIDTH_PX - 1,
      previouslySuppressed: false,
    });
    expect(suppressed).toBe(true);
    expect(
      resolveEnvironmentPresentation({
        manualOpen: true,
        autoSuppressed: suppressed,
        temporaryReveal: false,
      }),
    ).toBe("hidden");

    suppressed = resolveEnvironmentAutoSuppressed({
      availableWidth: ENVIRONMENT_SUPPRESS_WIDTH_PX + ENVIRONMENT_HYSTERESIS_PX - 1,
      previouslySuppressed: suppressed,
    });
    expect(suppressed).toBe(true);

    suppressed = resolveEnvironmentAutoSuppressed({
      availableWidth: ENVIRONMENT_SUPPRESS_WIDTH_PX + ENVIRONMENT_HYSTERESIS_PX,
      previouslySuppressed: suppressed,
    });
    expect(suppressed).toBe(false);
    expect(
      resolveEnvironmentPresentation({
        manualOpen: true,
        autoSuppressed: suppressed,
        temporaryReveal: false,
      }),
    ).toBe("floating");
  });

  it("lets Environment temporarily overlay under pressure without requiring or rewriting intent", () => {
    expect(
      resolveEnvironmentPresentation({
        manualOpen: true,
        autoSuppressed: true,
        temporaryReveal: true,
      }),
    ).toBe("overlay");
    expect(
      resolveEnvironmentPresentation({
        manualOpen: false,
        autoSuppressed: true,
        temporaryReveal: true,
      }),
    ).toBe("overlay");
  });

  it("uses split on wide shells and exclusive presentation under pressure", () => {
    expect(
      resolveWorkbenchPresentation({
        dockOpen: false,
        autoExclusive: false,
      }),
    ).toBe("closed");
    expect(
      resolveWorkbenchPresentation({
        dockOpen: true,
        autoExclusive: resolveWorkbenchAutoExclusive({
          availableWidth: 1440,
          planSidebarOpen: false,
          previouslyExclusive: false,
        }),
      }),
    ).toBe("split");
    expect(
      resolveWorkbenchPresentation({
        dockOpen: true,
        autoExclusive: resolveWorkbenchAutoExclusive({
          availableWidth: 1009,
          planSidebarOpen: false,
          previouslyExclusive: false,
        }),
      }),
    ).toBe("exclusive");
  });

  it("counts the existing 340px PlanSidebar as pressure without making it an owner", () => {
    expect(
      resolveWorkbenchAutoExclusive({
        availableWidth: 1400,
        planSidebarOpen: false,
        previouslyExclusive: false,
      }),
    ).toBe(false);
    expect(
      resolveWorkbenchAutoExclusive({
        availableWidth: 1400,
        planSidebarOpen: true,
        previouslyExclusive: false,
      }),
    ).toBe(false);
    expect(
      resolveWorkbenchAutoExclusive({
        availableWidth: 1395,
        planSidebarOpen: true,
        previouslyExclusive: false,
      }),
    ).toBe(true);
  });

  it("gives a pressured Plan the existing Chat surface instead of squeezing both below usability", () => {
    expect(resolvePlanSidebarPresentation({ availableWidth: 659 })).toBe("exclusive");
    expect(resolvePlanSidebarPresentation({ availableWidth: 660 })).toBe("side-by-side");
  });

  it("does not flap Workbench split/exclusive around the threshold", () => {
    let exclusive = false;
    exclusive = resolveWorkbenchAutoExclusive({
      availableWidth: WORKBENCH_SPLIT_SUPPRESS_WIDTH_PX - 1,
      planSidebarOpen: false,
      previouslyExclusive: exclusive,
    });
    expect(exclusive).toBe(true);
    for (const width of [1060, 1080, 1100, WORKBENCH_SPLIT_RESTORE_WIDTH_PX - 1]) {
      exclusive = resolveWorkbenchAutoExclusive({
        availableWidth: width,
        planSidebarOpen: false,
        previouslyExclusive: exclusive,
      });
      expect(exclusive).toBe(true);
    }
    exclusive = resolveWorkbenchAutoExclusive({
      availableWidth: WORKBENCH_SPLIT_RESTORE_WIDTH_PX,
      planSidebarOpen: false,
      previouslyExclusive: exclusive,
    });
    expect(exclusive).toBe(false);
  });
});
