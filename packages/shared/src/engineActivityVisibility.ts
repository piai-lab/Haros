import {
  STUDIO_OUTPUTS_ACTIVITY_KIND,
  type OrchestrationThreadActivity,
} from "@harnessos/contracts";

function isPlanBoundaryToolActivity(activity: OrchestrationThreadActivity): boolean {
  if (activity.kind !== "tool.updated" && activity.kind !== "tool.completed") {
    return false;
  }
  const payload =
    activity.payload && typeof activity.payload === "object"
      ? (activity.payload as Record<string, unknown>)
      : null;
  return (
    typeof payload?.detail === "string" &&
    /^[\w.-]+:/.exec(payload.detail.trim())?.[0] === "ExitPlanMode:"
  );
}

/**
 * Whether a durable Engine activity can become an existing WorkLog/Timeline row.
 * Instance-specific collapsing still belongs to WorkLog; this only owns the
 * activity classes that every presentation path hides.
 */
export function isPotentiallyVisibleEngineRuntimeActivity(
  activity: OrchestrationThreadActivity,
): boolean {
  if (
    activity.kind === "task.started" ||
    activity.kind === "task.updated" ||
    activity.kind === "task.completed" ||
    activity.kind === "account.rate-limits.updated" ||
    activity.kind === "context-window.updated" ||
    activity.kind === "context-window.configured" ||
    activity.kind === STUDIO_OUTPUTS_ACTIVITY_KIND ||
    activity.summary === "Checkpoint captured" ||
    isPlanBoundaryToolActivity(activity)
  ) {
    return false;
  }
  if (activity.kind === "turn.completed" || activity.kind === "turn.aborted") {
    return activity.tone === "error";
  }
  return true;
}
