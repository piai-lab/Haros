function initialProjection(threadId) {
  return {
    threadId,
    created: false,
    status: "idle",
    activeTurnId: null,
    activeAttemptId: null,
    attemptOutcome: null,
    actions: {},
    outputs: [],
    generation: {
      current: null,
      pinned: null,
      unloaded: [],
    },
    workbench: {
      tabs: [],
      activeTabKey: null,
      activePane: "conversation",
      split: "conversation",
    },
  };
}

export class ThreadProjectionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ThreadProjectionError";
    this.code = code;
    this.details = details;
  }
}

function action(state, actionId) {
  return state.actions[actionId] ?? null;
}

function outputTabKey(outputId) {
  return `output:${outputId}`;
}

function requireOutput(state, outputId, eventType) {
  if (!state.outputs.some((outputRef) => outputRef.outputId === outputId)) {
    throw new ThreadProjectionError(
      "WORKBENCH_OUTPUT_MISSING",
      "workbench event references an output absent from the Thread journal",
      { eventType, outputId },
    );
  }
}

function requireOpenTab(state, outputId, eventType) {
  const key = outputTabKey(outputId);
  const index = state.workbench.tabs.findIndex((tab) => tab.key === key);
  if (index === -1) {
    throw new ThreadProjectionError(
      "WORKBENCH_TAB_MISSING",
      "workbench event references an output that is not open",
      { eventType, outputId },
    );
  }
  return { index, key };
}

export function projectThread(threadId, events, { recoverInterrupted = false } = {}) {
  const state = initialProjection(threadId);

  for (const event of events) {
    switch (event.type) {
      case "thread_created":
        state.created = true;
        break;
      case "turn_accepted":
        state.activeTurnId = event.turnId;
        state.status = "accepted";
        break;
      case "attempt_started":
        state.activeAttemptId = event.attemptId;
        state.attemptOutcome = null;
        state.status = "running";
        break;
      case "attempt_settled":
        state.attemptOutcome = event.outcome;
        state.status = event.outcome === "outcome_unknown" ? "attention" : "idle";
        break;
      case "action_proposed":
        state.actions[event.actionId] = {
          actionId: event.actionId,
          attemptId: event.attemptId,
          toolId: event.toolId,
          effect: event.effect,
          lifecycle: "proposed",
          dispatchCertainty: "not_dispatched",
          settlement: null,
          outcome: null,
          progress: [],
          outputRefs: [],
        };
        break;
      case "action_policy_decided": {
        const current = action(state, event.actionId);
        if (current) current.lifecycle = event.decision === "allow" ? "policy_decided" : "denied";
        break;
      }
      case "action_started": {
        const current = action(state, event.actionId);
        if (current) current.lifecycle = "started";
        break;
      }
      case "action_dispatched": {
        const current = action(state, event.actionId);
        if (current) {
          current.lifecycle = "dispatched";
          current.dispatchCertainty = "dispatched";
        }
        break;
      }
      case "action_progress": {
        const current = action(state, event.actionId);
        if (current) current.progress.push({ message: event.message, fraction: event.fraction ?? null });
        break;
      }
      case "output_created": {
        state.outputs.push(event.outputRef);
        const current = action(state, event.actionId);
        if (current) current.outputRefs.push(event.outputRef);
        break;
      }
      case "action_settled": {
        const current = action(state, event.actionId);
        if (current) {
          current.lifecycle = "settled";
          current.dispatchCertainty = event.dispatchCertainty;
          current.settlement = event.settlement;
          current.outcome = event.outcome;
          current.resultDigest = event.resultDigest ?? null;
        }
        if (event.settlement === "outcome_unknown") state.status = "attention";
        break;
      }
      case "generation_activated":
        state.generation.current = event.generationId;
        break;
      case "generation_pinned":
        state.generation.current = event.generationId;
        state.generation.pinned = event.generationId;
        if (
          event.failedGenerationId &&
          !state.generation.unloaded.includes(event.failedGenerationId)
        ) {
          state.generation.unloaded.push(event.failedGenerationId);
        }
        break;
      case "extension_projection_unloaded":
        if (!state.generation.unloaded.includes(event.generationId)) {
          state.generation.unloaded.push(event.generationId);
        }
        break;
      case "workbench_output_opened": {
        requireOutput(state, event.outputId, event.type);
        const key = outputTabKey(event.outputId);
        if (!state.workbench.tabs.some((tab) => tab.key === key)) {
          state.workbench.tabs.push({ key, kind: "output", outputId: event.outputId });
        }
        state.workbench.activeTabKey = key;
        state.workbench.activePane = "workbench";
        state.workbench.split = event.split;
        break;
      }
      case "workbench_output_closed": {
        const { index, key } = requireOpenTab(state, event.outputId, event.type);
        state.workbench.tabs.splice(index, 1);
        if (state.workbench.tabs.length === 0) {
          state.workbench.activeTabKey = null;
          state.workbench.activePane = "conversation";
          state.workbench.split = "conversation";
        } else if (state.workbench.activeTabKey === key) {
          const next = state.workbench.tabs[Math.min(index, state.workbench.tabs.length - 1)];
          state.workbench.activeTabKey = next.key;
        }
        break;
      }
      case "workbench_output_activated": {
        const { key } = requireOpenTab(state, event.outputId, event.type);
        state.workbench.activeTabKey = key;
        state.workbench.activePane = "workbench";
        state.workbench.split = event.split;
        break;
      }
      case "workbench_layout_changed":
        state.workbench.activePane = event.activePane;
        state.workbench.split = event.split;
        break;
      default:
        break;
    }
  }

  if (recoverInterrupted) {
    for (const current of Object.values(state.actions)) {
      if (current.lifecycle === "started" || current.lifecycle === "dispatched") {
        current.lifecycle = "settled";
        current.settlement = "outcome_unknown";
        current.outcome = "interrupted";
        state.status = "attention";
      }
    }
    if (state.status === "running") {
      state.attemptOutcome = "outcome_unknown";
      state.status = "attention";
    }
  }

  if (Object.values(state.actions).some((current) => current.settlement === "outcome_unknown")) {
    state.status = "attention";
  }

  return state;
}
