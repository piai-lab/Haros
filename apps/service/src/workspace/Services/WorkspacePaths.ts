import { Effect, Schema, ServiceMap } from "effect";

export class WorkspaceRootNotExistsError extends Schema.TaggedErrorClass<WorkspaceRootNotExistsError>()(
  "WorkspaceRootNotExistsError",
  {
    workspaceRoot: Schema.String,
    normalizedWorkspaceRoot: Schema.String,
  },
) {
  override get message(): string {
    return `Workspace root does not exist: ${this.normalizedWorkspaceRoot}`;
  }
}

export class WorkspaceRootInvalidError extends Schema.TaggedErrorClass<WorkspaceRootInvalidError>()(
  "WorkspaceRootInvalidError",
  { workspaceRoot: Schema.String },
) {
  override get message(): string {
    return "Workspace root must be a non-empty absolute local path.";
  }
}

export class WorkspaceRootCreateFailedError extends Schema.TaggedErrorClass<WorkspaceRootCreateFailedError>()(
  "WorkspaceRootCreateFailedError",
  {
    workspaceRoot: Schema.String,
    normalizedWorkspaceRoot: Schema.String,
  },
) {
  override get message(): string {
    return `Failed to create workspace root: ${this.normalizedWorkspaceRoot}`;
  }
}

export class WorkspaceRootNotDirectoryError extends Schema.TaggedErrorClass<WorkspaceRootNotDirectoryError>()(
  "WorkspaceRootNotDirectoryError",
  {
    workspaceRoot: Schema.String,
    normalizedWorkspaceRoot: Schema.String,
  },
) {
  override get message(): string {
    return `Workspace root is not a directory: ${this.normalizedWorkspaceRoot}`;
  }
}

export class WorkspaceRootInspectFailedError extends Schema.TaggedErrorClass<WorkspaceRootInspectFailedError>()(
  "WorkspaceRootInspectFailedError",
  {
    workspaceRoot: Schema.String,
    normalizedWorkspaceRoot: Schema.String,
  },
) {
  override get message(): string {
    return `Failed to inspect workspace root: ${this.normalizedWorkspaceRoot}`;
  }
}

/**
 * The Service deadline elapsed before a create mutation was admitted. Because
 * no mkdir started, callers may safely report that this request did not create
 * the root. Once creation is admitted the Service waits for its real outcome
 * instead of returning this error.
 */
export class WorkspaceRootDeadlineExceededError extends Schema.TaggedErrorClass<WorkspaceRootDeadlineExceededError>()(
  "WorkspaceRootDeadlineExceededError",
  {
    workspaceRoot: Schema.String,
    normalizedWorkspaceRoot: Schema.String,
  },
) {
  override get message(): string {
    return "Workspace root inspection exceeded its Service deadline before creation admission; no directory creation was started.";
  }
}

export class WorkspacePathOutsideRootError extends Schema.TaggedErrorClass<WorkspacePathOutsideRootError>()(
  "WorkspacePathOutsideRootError",
  {
    workspaceRoot: Schema.String,
    relativePath: Schema.String,
  },
) {
  override get message(): string {
    return `Workspace file path must be relative to the project root: ${this.relativePath}`;
  }
}

export interface WorkspacePathsShape {
  readonly normalizeWorkspaceRoot: (
    workspaceRoot: string,
    options?: { readonly createIfMissing?: boolean },
  ) => Effect.Effect<
    string,
    | WorkspaceRootNotExistsError
    | WorkspaceRootInvalidError
    | WorkspaceRootCreateFailedError
    | WorkspaceRootNotDirectoryError
    | WorkspaceRootInspectFailedError
    | WorkspaceRootDeadlineExceededError
  >;
  readonly resolveRelativePathWithinRoot: (input: {
    readonly workspaceRoot: string;
    readonly relativePath: string;
  }) => Effect.Effect<
    { readonly absolutePath: string; readonly relativePath: string },
    WorkspacePathOutsideRootError
  >;
}

export class WorkspacePaths extends ServiceMap.Service<WorkspacePaths, WorkspacePathsShape>()(
  "omnimind/workspace/Services/WorkspacePaths",
) {}
