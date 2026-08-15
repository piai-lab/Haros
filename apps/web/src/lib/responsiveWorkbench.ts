// The authored chat column is 46rem (736px) and its desktop gutter is 1.25rem (20px)
// per side. Keeping this full 776px reading/composer frame visible is the observable
// comfort floor; the 640px route min-width remains a survivability floor, not the point
// at which the user's navigation should keep consuming space.
export const CHAT_CANVAS_COMFORTABLE_WIDTH_PX = 46 * 16 + 2 * 20;
export const THREAD_SIDEBAR_HYSTERESIS_PX = 64;

export const WORKBENCH_PANE_MIN_WIDTH_PX = 416;
export const CHAT_CANVAS_MIN_WIDTH_PX = 640;
export const PLAN_SIDEBAR_WIDTH_PX = 340;
export const WORKBENCH_SPLIT_SUPPRESS_WIDTH_PX =
  CHAT_CANVAS_MIN_WIDTH_PX + WORKBENCH_PANE_MIN_WIDTH_PX;
export const WORKBENCH_SPLIT_RESTORE_WIDTH_PX = WORKBENCH_SPLIT_SUPPRESS_WIDTH_PX + 64;

export type ThreadSidebarPresentation = "docked" | "hidden" | "overlay";
export type WorkbenchPresentation = "closed" | "split" | "exclusive";

export function resolveThreadSidebarAutoSuppressed(input: {
  readonly availableWidth: number;
  readonly sidebarWidth: number;
  readonly previouslySuppressed: boolean;
}): boolean {
  const threshold =
    input.sidebarWidth +
    CHAT_CANVAS_COMFORTABLE_WIDTH_PX +
    (input.previouslySuppressed ? THREAD_SIDEBAR_HYSTERESIS_PX : 0);
  return input.availableWidth < threshold;
}

export function resolveThreadSidebarPresentation(input: {
  readonly manualOpen: boolean;
  readonly autoSuppressed: boolean;
  readonly temporaryReveal: boolean;
  readonly forceHidden?: boolean;
}): ThreadSidebarPresentation {
  if (input.forceHidden) {
    return "hidden";
  }
  if (input.autoSuppressed) {
    return input.temporaryReveal ? "overlay" : "hidden";
  }
  return input.manualOpen ? "docked" : "hidden";
}

export function resolveWorkbenchAutoExclusive(input: {
  readonly availableWidth: number;
  readonly planSidebarOpen: boolean;
  readonly previouslyExclusive: boolean;
}): boolean {
  const planSidebarWidth = input.planSidebarOpen ? PLAN_SIDEBAR_WIDTH_PX : 0;
  const threshold = input.previouslyExclusive
    ? WORKBENCH_SPLIT_RESTORE_WIDTH_PX + planSidebarWidth
    : WORKBENCH_SPLIT_SUPPRESS_WIDTH_PX + planSidebarWidth;
  return input.availableWidth < threshold;
}

export function resolveWorkbenchPresentation(input: {
  readonly dockOpen: boolean;
  readonly autoExclusive: boolean;
}): WorkbenchPresentation {
  if (!input.dockOpen) {
    return "closed";
  }
  return input.autoExclusive ? "exclusive" : "split";
}
