import { createHash } from "node:crypto";
import { mkdir, open, readFile } from "node:fs/promises";
import path from "node:path";
import {
  isRevealedWorkbenchSplit,
  isWorkbenchLayout,
} from "./thread-workbench.mjs";

const THREAD_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const EVENT_TYPES = new Set([
  "thread_created",
  "turn_accepted",
  "attempt_started",
  "attempt_settled",
  "action_proposed",
  "action_policy_decided",
  "action_started",
  "action_dispatched",
  "action_progress",
  "action_settled",
  "output_created",
  "generation_activated",
  "generation_pinned",
  "extension_projection_unloaded",
  "workbench_output_opened",
  "workbench_output_closed",
  "workbench_output_activated",
  "workbench_layout_changed",
]);

export class ThreadJournalError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ThreadJournalError";
    this.code = code;
    this.details = details;
  }
}

function digestRecord(body) {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function requireEventId(event, key) {
  if (typeof event[key] !== "string" || !THREAD_ID_PATTERN.test(event[key])) {
    throw new ThreadJournalError("EVENT_INVALID", `journal event ${key} is invalid`, {
      type: event.type,
      key,
    });
  }
}

function validateEvent(event) {
  switch (event.type) {
    case "workbench_output_opened":
    case "workbench_output_activated":
      requireEventId(event, "outputId");
      if (!isRevealedWorkbenchSplit(event.split)) {
        throw new ThreadJournalError(
          "EVENT_INVALID",
          "workbench output event requires a revealed semantic split",
          { type: event.type },
        );
      }
      break;
    case "workbench_output_closed":
      requireEventId(event, "outputId");
      break;
    case "workbench_layout_changed":
      if (!isWorkbenchLayout(event.split, event.activePane)) {
        throw new ThreadJournalError(
          "EVENT_INVALID",
          "workbench layout event is invalid or internally contradictory",
          { type: event.type },
        );
      }
      break;
    default:
      break;
  }
}

function cloneEvent(event) {
  let serialized;
  try {
    serialized = JSON.stringify(event);
  } catch (error) {
    throw new ThreadJournalError("EVENT_NOT_SERIALIZABLE", "journal event must be JSON serializable", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
  if (serialized === undefined) {
    throw new ThreadJournalError("EVENT_NOT_SERIALIZABLE", "journal event must be JSON serializable");
  }
  const cloned = JSON.parse(serialized);
  if (!cloned || typeof cloned !== "object" || Array.isArray(cloned)) {
    throw new ThreadJournalError("EVENT_INVALID", "journal event must be an object");
  }
  if (!EVENT_TYPES.has(cloned.type)) {
    throw new ThreadJournalError("EVENT_TYPE_UNSUPPORTED", "journal event type is unsupported", {
      type: cloned.type,
    });
  }
  validateEvent(cloned);
  return cloned;
}

function journalPath(root, threadId) {
  if (typeof threadId !== "string" || !THREAD_ID_PATTERN.test(threadId)) {
    throw new ThreadJournalError("THREAD_ID_INVALID", "thread id is invalid");
  }
  return path.join(root, "threads", `${threadId}.jsonl`);
}

async function readText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

export async function recoverThreadJournal({ root, threadId, strict = true }) {
  const filePath = journalPath(root, threadId);
  const text = await readText(filePath);
  const lines = text.split("\n");
  const records = [];
  let previousDigest = null;
  let tailIssue = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "" && index === lines.length - 1) break;
    if (line.trim() === "") {
      tailIssue = { code: "JOURNAL_BLANK_RECORD", line: index + 1 };
      break;
    }

    let record;
    try {
      record = JSON.parse(line);
    } catch {
      tailIssue = { code: "JOURNAL_RECORD_INVALID", line: index + 1 };
      break;
    }

    const body = {
      version: record.version,
      sequence: record.sequence,
      previousDigest: record.previousDigest,
      recordedAt: record.recordedAt,
      threadId: record.threadId,
      event: record.event,
    };
    const expectedSequence = records.length + 1;
    let eventInvalid = false;
    try {
      if (!record.event || !EVENT_TYPES.has(record.event.type)) eventInvalid = true;
      else validateEvent(record.event);
    } catch {
      eventInvalid = true;
    }
    if (
      record.version !== 1 ||
      record.sequence !== expectedSequence ||
      record.previousDigest !== previousDigest ||
      record.threadId !== threadId ||
      record.digest !== digestRecord(body) ||
      eventInvalid
    ) {
      tailIssue = { code: "JOURNAL_CHAIN_INVALID", line: index + 1 };
      break;
    }

    records.push(record);
    previousDigest = record.digest;
  }

  if (tailIssue && strict) {
    throw new ThreadJournalError(tailIssue.code, "journal recovery found an invalid tail", tailIssue);
  }

  return {
    path: filePath,
    records,
    events: records.map((record) => record.event),
    tailIssue,
    lastDigest: previousDigest,
  };
}

export class ThreadJournal {
  #clock;
  #filePath;
  #lastDigest;
  #pending = Promise.resolve();
  #sequence;
  #threadId;

  static async open({ root, threadId, clock = () => new Date().toISOString() }) {
    const recovered = await recoverThreadJournal({ root, threadId, strict: true });
    await mkdir(path.dirname(recovered.path), { recursive: true });
    return new ThreadJournal({
      threadId,
      filePath: recovered.path,
      clock,
      sequence: recovered.records.length,
      lastDigest: recovered.lastDigest,
    });
  }

  constructor({ threadId, filePath, clock, sequence, lastDigest }) {
    this.#threadId = threadId;
    this.#filePath = filePath;
    this.#clock = clock;
    this.#sequence = sequence;
    this.#lastDigest = lastDigest;
  }

  append(event) {
    const operation = this.#pending.then(() => this.#append(event));
    this.#pending = operation.catch(() => undefined);
    return operation;
  }

  async #append(event) {
    const body = {
      version: 1,
      sequence: this.#sequence + 1,
      previousDigest: this.#lastDigest,
      recordedAt: this.#clock(),
      threadId: this.#threadId,
      event: cloneEvent(event),
    };
    const record = { ...body, digest: digestRecord(body) };
    const handle = await open(this.#filePath, "a");
    try {
      await handle.writeFile(`${JSON.stringify(record)}\n`);
      await handle.sync();
    } finally {
      await handle.close();
    }
    this.#sequence = record.sequence;
    this.#lastDigest = record.digest;
    return record;
  }

  get path() {
    return this.#filePath;
  }

  get threadId() {
    return this.#threadId;
  }
}
