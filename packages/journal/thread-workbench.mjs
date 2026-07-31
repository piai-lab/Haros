const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const REVEALED_SPLITS = new Set(["balanced", "workbench"]);
const SPLITS = new Set(["conversation", ...REVEALED_SPLITS]);
const PANES = new Set(["conversation", "workbench"]);

export function isRevealedWorkbenchSplit(value) {
  return REVEALED_SPLITS.has(value);
}

export function isWorkbenchLayout(split, activePane) {
  if (!SPLITS.has(split) || !PANES.has(activePane)) return false;
  if (split === "conversation") return activePane === "conversation";
  if (split === "workbench") return activePane === "workbench";
  return true;
}

export class ThreadWorkbenchError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ThreadWorkbenchError";
    this.code = code;
    this.details = details;
  }
}

function requireJournal(journal) {
  if (
    !journal ||
    typeof journal.append !== "function" ||
    typeof journal.threadId !== "string" ||
    !ID_PATTERN.test(journal.threadId)
  ) {
    throw new ThreadWorkbenchError("JOURNAL_INVALID", "a thread journal is required");
  }
}

function requireId(value, label) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new ThreadWorkbenchError("IDENTITY_INVALID", `${label} is invalid`);
  }
}

function requireRevealedSplit(split) {
  if (!isRevealedWorkbenchSplit(split)) {
    throw new ThreadWorkbenchError(
      "SPLIT_INVALID",
      "opening a workbench output requires a revealed semantic split",
    );
  }
}

function requireLayout(split, activePane) {
  if (!isWorkbenchLayout(split, activePane)) {
    throw new ThreadWorkbenchError(
      "LAYOUT_INVALID",
      "workbench layout is invalid or internally contradictory",
    );
  }
}

export function openWorkbenchOutput({ journal, outputRef, split = "balanced" }) {
  requireJournal(journal);
  if (!outputRef || typeof outputRef !== "object") {
    throw new ThreadWorkbenchError("OUTPUT_REF_INVALID", "an OutputRef is required");
  }
  requireId(outputRef.outputId, "output id");
  if (outputRef.threadId !== journal.threadId) {
    throw new ThreadWorkbenchError(
      "OUTPUT_THREAD_MISMATCH",
      "OutputRef belongs to another Thread",
    );
  }
  requireRevealedSplit(split);
  return journal.append({
    type: "workbench_output_opened",
    outputId: outputRef.outputId,
    split,
  });
}

export function closeWorkbenchOutput({ journal, outputId }) {
  requireJournal(journal);
  requireId(outputId, "output id");
  return journal.append({ type: "workbench_output_closed", outputId });
}

export function activateWorkbenchOutput({ journal, outputId, split = "balanced" }) {
  requireJournal(journal);
  requireId(outputId, "output id");
  requireRevealedSplit(split);
  return journal.append({
    type: "workbench_output_activated",
    outputId,
    split,
  });
}

export function setWorkbenchLayout({ journal, split, activePane }) {
  requireJournal(journal);
  requireLayout(split, activePane);
  return journal.append({
    type: "workbench_layout_changed",
    split,
    activePane,
  });
}
