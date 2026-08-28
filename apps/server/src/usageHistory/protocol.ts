// FILE: usageHistory/protocol.ts
// Purpose: Bounded one-request/one-response protocol for the archive reader child process.

import type { UsageHistoryProvider } from "@harnessos/contracts";

export const USAGE_HISTORY_PARSER_VERSION = 2;
export const USAGE_HISTORY_DISCOVERY_BATCH_FILES = 128;
export const USAGE_HISTORY_PARSE_BATCH_FILES = 4;
export const USAGE_HISTORY_PARSE_BATCH_BYTES = 8 * 1024 * 1024;
export const USAGE_HISTORY_PARSE_FILE_BYTES = 4 * 1024 * 1024;
export const USAGE_HISTORY_PARSE_MAX_EVENTS = 2_000;
export const USAGE_HISTORY_MAX_LINE_BYTES = 1024 * 1024;
export const USAGE_HISTORY_READ_CHUNK_BYTES = 64 * 1024;

export interface UsageHistoryDiscoveredFile {
  readonly relativePath: string;
  readonly deviceId: string;
  readonly inodeId: string;
  readonly sizeBytes: number;
  readonly mtimeMs: number;
}

export interface UsageHistoryDiscoverRequest {
  readonly type: "discover";
  readonly engine: UsageHistoryProvider;
  readonly rootPath: string;
  readonly cursor: string | null;
  readonly limit: number;
}

export interface UsageHistoryDiscoverResponse {
  readonly type: "discover-result";
  readonly rootAvailable: boolean;
  readonly files: ReadonlyArray<UsageHistoryDiscoveredFile>;
  readonly nextCursor: string | null;
  readonly complete: boolean;
  readonly issueCodes: ReadonlyArray<string>;
}

export interface UsageHistoryParserState {
  readonly sessionKey: string | null;
  readonly workspaceKey: string | null;
  readonly workspaceLabel: string | null;
  readonly model: string | null;
  readonly discardingOversizedLine: boolean;
  readonly cumulativeInputTokens: number;
  readonly cumulativeOutputTokens: number;
  readonly cumulativeCacheReadTokens: number;
  readonly cumulativeCacheWriteTokens: number;
}

export interface UsageHistoryParseFile {
  readonly fileId: number;
  readonly relativePath: string;
  readonly deviceId: string;
  readonly inodeId: string;
  readonly sizeBytes: number;
  readonly mtimeMs: number;
  readonly indexedOffset: number;
  readonly parserState: UsageHistoryParserState;
}

export interface UsageHistoryParseRequest {
  readonly type: "parse";
  readonly engine: UsageHistoryProvider;
  readonly rootPath: string;
  readonly files: ReadonlyArray<UsageHistoryParseFile>;
  readonly workspaceHashSalt: string;
  readonly unknownModel: string;
  readonly unknownWorkspace: string;
  readonly maxBatchBytes: number;
  readonly maxFileBytes: number;
  readonly maxEvents: number;
  readonly deadlineMs: number;
}

export interface UsageHistoryParsedEvent {
  readonly eventKey: string;
  readonly occurredAt: string;
  readonly sessionKey: string;
  readonly model: string;
  readonly workspaceKey: string;
  readonly workspaceLabel: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

export interface UsageHistoryParsedFile {
  readonly fileId: number;
  readonly nextOffset: number;
  readonly bytesRead: number;
  readonly complete: boolean;
  readonly detailCode: string | null;
  readonly parserState: UsageHistoryParserState;
  readonly events: ReadonlyArray<UsageHistoryParsedEvent>;
}

export interface UsageHistoryParseResponse {
  readonly type: "parse-result";
  readonly files: ReadonlyArray<UsageHistoryParsedFile>;
  readonly bytesRead: number;
  readonly eventLimitReached: boolean;
}

export interface UsageHistoryWorkerFailure {
  readonly type: "failure";
  readonly code: string;
}

export type UsageHistoryWorkerRequest = UsageHistoryDiscoverRequest | UsageHistoryParseRequest;
export type UsageHistoryWorkerResponse =
  | UsageHistoryDiscoverResponse
  | UsageHistoryParseResponse
  | UsageHistoryWorkerFailure;
