import { Schema } from "effect";
import { TrimmedNonEmptyString } from "./baseSchemas";

const FILESYSTEM_PATH_MAX_LENGTH = 512;

export const FilesystemBrowseInput = Schema.Struct({
  partialPath: TrimmedNonEmptyString.check(Schema.isMaxLength(FILESYSTEM_PATH_MAX_LENGTH)),
  cwd: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(FILESYSTEM_PATH_MAX_LENGTH))),
});
export type FilesystemBrowseInput = typeof FilesystemBrowseInput.Type;

export const FilesystemBrowseEntry = Schema.Struct({
  name: TrimmedNonEmptyString,
  fullPath: TrimmedNonEmptyString,
});
export type FilesystemBrowseEntry = typeof FilesystemBrowseEntry.Type;

export const FilesystemBrowseResult = Schema.Struct({
  parentPath: TrimmedNonEmptyString,
  entries: Schema.Array(FilesystemBrowseEntry),
});
export type FilesystemBrowseResult = typeof FilesystemBrowseResult.Type;
export const WorkspaceEnsureRootInput = Schema.Struct({
  path: TrimmedNonEmptyString.check(Schema.isMaxLength(8_192)),
  createIfMissing: Schema.Boolean,
});
export type WorkspaceEnsureRootInput = typeof WorkspaceEnsureRootInput.Type;

export const WorkspaceEnsureRootResult = Schema.Struct({
  canonicalRoot: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(8_192)),
});
export type WorkspaceEnsureRootResult = typeof WorkspaceEnsureRootResult.Type;
