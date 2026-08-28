import { Schema } from "effect";

import type { CheckpointServiceError } from "../checkpointing/Errors.ts";

/**
 * EngineAdapterValidationError - Invalid adapter API input.
 */
export class EngineAdapterValidationError extends Schema.TaggedErrorClass<EngineAdapterValidationError>()(
  "EngineAdapterValidationError",
  {
    engine: Schema.String,
    operation: Schema.String,
    issue: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Engine adapter validation failed (${this.engine}) in ${this.operation}: ${this.issue}`;
  }
}

/**
 * EngineAdapterSessionNotFoundError - Adapter-owned session id is unknown.
 */
export class EngineAdapterSessionNotFoundError extends Schema.TaggedErrorClass<EngineAdapterSessionNotFoundError>()(
  "EngineAdapterSessionNotFoundError",
  {
    engine: Schema.String,
    threadId: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Unknown ${this.engine} adapter thread: ${this.threadId}`;
  }
}

/**
 * EngineAdapterSessionClosedError - Adapter session exists but is closed.
 */
export class EngineAdapterSessionClosedError extends Schema.TaggedErrorClass<EngineAdapterSessionClosedError>()(
  "EngineAdapterSessionClosedError",
  {
    engine: Schema.String,
    threadId: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `${this.engine} adapter thread is closed: ${this.threadId}`;
  }
}

/**
 * EngineAdapterRequestError - Engine protocol request failed or timed out.
 */
export class EngineAdapterRequestError extends Schema.TaggedErrorClass<EngineAdapterRequestError>()(
  "EngineAdapterRequestError",
  {
    engine: Schema.String,
    method: Schema.String,
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Engine adapter request failed (${this.engine}) for ${this.method}: ${this.detail}`;
  }
}

/**
 * EngineAdapterProcessError - Engine process lifecycle failure.
 */
export class EngineAdapterProcessError extends Schema.TaggedErrorClass<EngineAdapterProcessError>()(
  "EngineAdapterProcessError",
  {
    engine: Schema.String,
    threadId: Schema.String,
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Engine adapter process error (${this.engine}) for thread ${this.threadId}: ${this.detail}`;
  }
}

/**
 * EngineValidationError - Invalid engine API input.
 */
export class EngineValidationError extends Schema.TaggedErrorClass<EngineValidationError>()(
  "EngineValidationError",
  {
    operation: Schema.String,
    issue: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Engine validation failed in ${this.operation}: ${this.issue}`;
  }
}

/**
 * EngineUnsupportedError - Requested engine is not implemented.
 */
export class EngineUnsupportedError extends Schema.TaggedErrorClass<EngineUnsupportedError>()(
  "EngineUnsupportedError",
  {
    engine: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Engine '${this.engine}' is not implemented`;
  }
}

/**
 * EngineSessionNotFoundError - Engine-facing session not found.
 */
export class EngineSessionNotFoundError extends Schema.TaggedErrorClass<EngineSessionNotFoundError>()(
  "EngineSessionNotFoundError",
  {
    threadId: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Unknown engine thread: ${this.threadId}`;
  }
}

/**
 * EngineSessionDirectoryPersistenceError - Session directory persistence failure.
 */
export class EngineSessionDirectoryPersistenceError extends Schema.TaggedErrorClass<EngineSessionDirectoryPersistenceError>()(
  "EngineSessionDirectoryPersistenceError",
  {
    operation: Schema.String,
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Engine session directory persistence error in ${this.operation}: ${this.detail}`;
  }
}

export type EngineAdapterError =
  | EngineAdapterValidationError
  | EngineAdapterSessionNotFoundError
  | EngineAdapterSessionClosedError
  | EngineAdapterRequestError
  | EngineAdapterProcessError;

export type EngineServiceError =
  | EngineValidationError
  | EngineUnsupportedError
  | EngineSessionNotFoundError
  | EngineSessionDirectoryPersistenceError
  | EngineAdapterError
  | CheckpointServiceError;
