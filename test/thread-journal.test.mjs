import assert from "node:assert/strict";
import { appendFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  recoverThreadJournal,
  ThreadJournal,
  ThreadJournalError,
} from "../packages/journal/thread-journal.mjs";
import { projectThread } from "../packages/journal/thread-projection.mjs";

test("strict recovery rejects a corrupt tail while display recovery preserves verified records", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "journal-tail-"));
  const journal = await ThreadJournal.open({ root, threadId: "thread-1" });
  await journal.append({ type: "thread_created" });
  await journal.append({ type: "turn_accepted", turnId: "turn-1" });
  await appendFile(journal.path, '{"version":1,"sequence":3');

  await assert.rejects(
    recoverThreadJournal({ root, threadId: "thread-1", strict: true }),
    (error) => error instanceof ThreadJournalError && error.code === "JOURNAL_RECORD_INVALID",
  );
  const display = await recoverThreadJournal({ root, threadId: "thread-1", strict: false });
  assert.equal(display.events.length, 2);
  assert.equal(display.tailIssue.code, "JOURNAL_RECORD_INVALID");
});

test("restart reconciliation marks a started action unknown without rewriting journal history", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "journal-interrupted-"));
  const journal = await ThreadJournal.open({ root, threadId: "thread-1" });
  await journal.append({ type: "thread_created" });
  await journal.append({ type: "turn_accepted", turnId: "turn-1" });
  await journal.append({ type: "attempt_started", turnId: "turn-1", attemptId: "attempt-1" });
  await journal.append({
    type: "action_proposed",
    turnId: "turn-1",
    attemptId: "attempt-1",
    actionId: "action-1",
    toolId: "ordinary_tool",
    effect: "write",
  });
  await journal.append({
    type: "action_policy_decided",
    turnId: "turn-1",
    attemptId: "attempt-1",
    actionId: "action-1",
    decision: "allow",
  });
  await journal.append({
    type: "action_started",
    turnId: "turn-1",
    attemptId: "attempt-1",
    actionId: "action-1",
  });

  const recovered = await recoverThreadJournal({ root, threadId: "thread-1" });
  assert.equal(projectThread("thread-1", recovered.events).actions["action-1"].lifecycle, "started");
  const restart = projectThread("thread-1", recovered.events, { recoverInterrupted: true });
  assert.equal(restart.actions["action-1"].settlement, "outcome_unknown");
  assert.equal(restart.status, "attention");
  assert.equal(recovered.events.some((event) => event.type === "action_settled"), false);
});
