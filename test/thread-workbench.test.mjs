import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  recoverThreadJournal,
  ThreadJournal,
  ThreadJournalError,
} from "../packages/journal/thread-journal.mjs";
import {
  projectThread,
  ThreadProjectionError,
} from "../packages/journal/thread-projection.mjs";
import {
  activateWorkbenchOutput,
  closeWorkbenchOutput,
  openWorkbenchOutput,
  setWorkbenchLayout,
  ThreadWorkbenchError,
} from "../packages/journal/thread-workbench.mjs";

function outputRef(threadId, outputId, name) {
  return {
    outputId,
    threadId,
    attemptId: "attempt-1",
    actionId: "action-1",
    path: `/product-outputs/${threadId}/${outputId}/${name}`,
    name,
    mimeType: "text/plain",
    size: 4,
    digest: "a".repeat(64),
  };
}

async function appendOutput(journal, ref) {
  await journal.append({
    type: "output_created",
    turnId: "turn-1",
    attemptId: ref.attemptId,
    actionId: ref.actionId,
    outputRef: ref,
  });
}

test("restores per-Thread output tabs, active tab, pane, and semantic split exactly", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "thread-workbench-"));
  const journal = await ThreadJournal.open({ root, threadId: "thread-1" });
  const first = outputRef("thread-1", "output-1", "first.txt");
  const second = outputRef("thread-1", "output-2", "second.txt");
  await journal.append({ type: "thread_created" });
  await appendOutput(journal, first);
  await appendOutput(journal, second);
  await openWorkbenchOutput({ journal, outputRef: first });
  await openWorkbenchOutput({ journal, outputRef: first });
  await openWorkbenchOutput({ journal, outputRef: second, split: "workbench" });
  await setWorkbenchLayout({ journal, split: "conversation", activePane: "conversation" });

  const recovered = await recoverThreadJournal({ root, threadId: "thread-1" });
  const opened = recovered.events.filter((event) => event.type === "workbench_output_opened");
  assert.equal(opened.length, 3);
  assert.deepEqual(Object.keys(opened[0]).sort(), ["outputId", "split", "type"]);
  const hidden = projectThread("thread-1", recovered.events);
  assert.deepEqual(hidden.workbench, {
    tabs: [
      { key: "output:output-1", kind: "output", outputId: "output-1" },
      { key: "output:output-2", kind: "output", outputId: "output-2" },
    ],
    activeTabKey: "output:output-2",
    activePane: "conversation",
    split: "conversation",
  });

  const reopenedJournal = await ThreadJournal.open({ root, threadId: "thread-1" });
  await activateWorkbenchOutput({
    journal: reopenedJournal,
    outputId: "output-1",
    split: "balanced",
  });
  await closeWorkbenchOutput({ journal: reopenedJournal, outputId: "output-1" });
  const finalEvents = await recoverThreadJournal({ root, threadId: "thread-1" });
  assert.deepEqual(projectThread("thread-1", finalEvents.events).workbench, {
    tabs: [{ key: "output:output-2", kind: "output", outputId: "output-2" }],
    activeTabKey: "output:output-2",
    activePane: "workbench",
    split: "balanced",
  });
});

test("refuses cross-Thread OutputRefs before they become journal facts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "thread-workbench-scope-"));
  const journal = await ThreadJournal.open({ root, threadId: "thread-1" });
  assert.throws(
    () => openWorkbenchOutput({ journal, outputRef: outputRef("thread-2", "output-1", "note.txt") }),
    (error) =>
      error instanceof ThreadWorkbenchError && error.code === "OUTPUT_THREAD_MISMATCH",
  );
  const recovered = await recoverThreadJournal({ root, threadId: "thread-1" });
  assert.deepEqual(recovered.events, []);
});

test("rejects contradictory layout events at the durable boundary", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "thread-workbench-layout-"));
  const journal = await ThreadJournal.open({ root, threadId: "thread-1" });
  await assert.rejects(
    journal.append({
      type: "workbench_layout_changed",
      split: "conversation",
      activePane: "workbench",
    }),
    (error) => error instanceof ThreadJournalError && error.code === "EVENT_INVALID",
  );
  const recovered = await recoverThreadJournal({ root, threadId: "thread-1" });
  assert.deepEqual(recovered.events, []);
});

test("surfaces a semantically corrupt output-open event instead of inventing a tab", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "thread-workbench-reference-"));
  const journal = await ThreadJournal.open({ root, threadId: "thread-1" });
  await journal.append({
    type: "workbench_output_opened",
    outputId: "missing-output",
    split: "balanced",
  });
  const recovered = await recoverThreadJournal({ root, threadId: "thread-1" });
  assert.throws(
    () => projectThread("thread-1", recovered.events),
    (error) =>
      error instanceof ThreadProjectionError && error.code === "WORKBENCH_OUTPUT_MISSING",
  );
});
