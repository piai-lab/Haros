// Codex's current resize journey keeps navigation present well below the authored
// 46rem reading width. Sidebar yields only when its measured width would leave less
// than a compact, still-operable Chat surface; comfortable whitespace is not worth
// removing navigation at 1000–1100px.
export const CHAT_CANVAS_COMPACT_WIDTH_PX = 320;
export const THREAD_SIDEBAR_HYSTERESIS_PX = 64;

export const ENVIRONMENT_PANEL_WIDTH_PX = 18 * 16;
export const ENVIRONMENT_PANEL_EDGE_GUTTER_PX = 2 * 12;
export const ENVIRONMENT_CHAT_CANVAS_MIN_WIDTH_PX = 640;
export const ENVIRONMENT_SUPPRESS_WIDTH_PX =
  ENVIRONMENT_CHAT_CANVAS_MIN_WIDTH_PX +
  ENVIRONMENT_PANEL_WIDTH_PX +
  ENVIRONMENT_PANEL_EDGE_GUTTER_PX;
export const ENVIRONMENT_HYSTERESIS_PX = 64;

export const WORKBENCH_PANE_MIN_WIDTH_PX = 416;
export const CHAT_CANVAS_MIN_WIDTH_PX = 640;
export const PLAN_SIDEBAR_WIDTH_PX = 340;
export const PLAN_CHAT_CANVAS_COMPACT_WIDTH_PX = 320;
export const PLAN_SIDEBAR_EXCLUSIVE_WIDTH_PX =
  PLAN_SIDEBAR_WIDTH_PX + PLAN_CHAT_CANVAS_COMPACT_WIDTH_PX;
export const WORKBENCH_SPLIT_SUPPRESS_WIDTH_PX =
  CHAT_CANVAS_MIN_WIDTH_PX + WORKBENCH_PANE_MIN_WIDTH_PX;
export const WORKBENCH_SPLIT_RESTORE_WIDTH_PX = WORKBENCH_SPLIT_SUPPRESS_WIDTH_PX + 64;

export type ThreadSidebarPresentation = "docked" | "hidden" | "overlay" | "peek";
export type EnvironmentPresentation = "hidden" | "docked" | "overlay";
export type WorkbenchPresentation = "closed" | "split" | "exclusive";
export type PlanSidebarPresentation = "side-by-side" | "exclusive";

export function resolveThreadSidebarAutoSuppressed(input: {
  readonly availableWidth: number;
  readonly sidebarWidth: number;
  readonly previouslySuppressed: boolean;
}): boolean {
  const threshold =
    input.sidebarWidth +
    CHAT_CANVAS_COMPACT_WIDTH_PX +
    (input.previouslySuppressed ? THREAD_SIDEBAR_HYSTERESIS_PX : 0);
  return input.availableWidth < threshold;
}

export function resolveThreadSidebarPresentation(input: {
  readonly manualOpen: boolean;
  readonly autoSuppressed: boolean;
  readonly temporaryReveal: boolean;
  readonly pointerPeek?: boolean;
  readonly forceHidden?: boolean;
}): ThreadSidebarPresentation {
  if (input.forceHidden) {
    return "hidden";
  }
  if (input.autoSuppressed) {
    return input.temporaryReveal ? "overlay" : "hidden";
  }
  if (input.manualOpen) {
    return "docked";
  }
  return input.pointerPeek ? "peek" : "hidden";
}

/**
 * Explicit toggle intent is not the inverse of visual visibility. A passive
 * pointer peek is visually open while manual intent remains closed, so a button
 * or keyboard toggle promotes it to docked instead of dismissing it.
 */
export function resolveThreadSidebarToggleOpen(presentation: ThreadSidebarPresentation): boolean {
  return presentation === "hidden" || presentation === "peek";
}

export function resolveEnvironmentAutoSuppressed(input: {
  readonly availableWidth: number;
  readonly previouslySuppressed: boolean;
}): boolean {
  const threshold =
    ENVIRONMENT_SUPPRESS_WIDTH_PX + (input.previouslySuppressed ? ENVIRONMENT_HYSTERESIS_PX : 0);
  return input.availableWidth < threshold;
}

export function resolveEnvironmentPresentation(input: {
  readonly manualOpen: boolean;
  readonly autoSuppressed: boolean;
  readonly temporaryReveal: boolean;
}): EnvironmentPresentation {
  if (input.autoSuppressed) {
    return input.temporaryReveal ? "overlay" : "hidden";
  }
  return input.manualOpen ? "docked" : "hidden";
}

export function resolveEnvironmentPanelVisible(input: {
  readonly environmentEnabled: boolean;
  readonly environmentPanelOpen: boolean;
}): boolean {
  return input.environmentEnabled && input.environmentPanelOpen;
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

export function resolvePlanSidebarPresentation(input: {
  readonly availableWidth: number;
}): PlanSidebarPresentation {
  return input.availableWidth < PLAN_SIDEBAR_EXCLUSIVE_WIDTH_PX ? "exclusive" : "side-by-side";
}
