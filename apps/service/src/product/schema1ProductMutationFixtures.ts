import type { PRODUCT_MUTATION_KINDS } from "./schema1ProductTranscode";

const NOW = "2026-08-06T00:00:00.000Z";
const mutationId = "mutation-fixture";
const workspaceId = "workspace-fixture";
const conversationId = "conversation-fixture";
const groupId = "group-fixture";
const entryId = "entry-fixture";
const markerId = "marker-fixture";

const workspace = {
  id: workspaceId,
  title: "Workspace",
  access: {
    kind: "chat",
    managedDirectory: null,
    primaryFolder: null,
    executionTarget: null,
    writeAuthority: "read-only-references",
  },
  revision: 1,
  visibleInSidebar: true,
  isPinned: false,
  runCommand: null,
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};
const group = {
  id: groupId,
  name: "Group",
  color: "blue",
  sortOrder: 0,
  revision: 1,
  conversationIds: [conversationId],
  createdAt: NOW,
  updatedAt: NOW,
};
const snapshot = {
  protocolVersion: 1,
  sequence: 1,
  readModel: {
    conversation: {
      id: conversationId,
      workspaceId,
      title: "Conversation",
      workspaceKind: "chat",
      revision: 1,
      archivedAt: null,
      isPinned: false,
      notes: "",
      boardState: "active",
      boardStateChangedAt: null,
      latestRunId: null,
      receiptState: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    workspace: { id: workspaceId, access: workspace.access, observedAt: NOW },
    entries: [],
    streamingEntryIds: [],
    runs: [],
    activities: [],
    recoveries: [],
    queue: [],
    entryPins: [],
    entryMarkers: [],
  },
};

const target = { protocolVersion: 1, mutationId, expectedRevision: 1 };
const workspaceTarget = { ...target, workspaceId };
const conversationTarget = { ...target, conversationId };
const entryTarget = { ...conversationTarget, entryId };
const markerTarget = { ...conversationTarget, markerId };

export type ProductMutationKind = (typeof PRODUCT_MUTATION_KINDS)[number];

export const schema1ProductMutationFixtures: Record<
  ProductMutationKind,
  { readonly request: unknown; readonly response: unknown }
> = {
  "workspace-title-update": {
    request: { ...workspaceTarget, title: "Renamed" },
    response: workspace,
  },
  "workspace-pinned-set": { request: { ...workspaceTarget, isPinned: true }, response: workspace },
  "workspace-run-command-update": {
    request: { ...workspaceTarget, runCommand: "bun test" },
    response: workspace,
  },
  "workspace-delete": {
    request: workspaceTarget,
    response: { protocolVersion: 1, workspaceId, revision: 2, sequence: 2 },
  },
  "group-update": {
    request: { ...target, groupId, name: "Renamed", color: "green" },
    response: group,
  },
  "groups-reorder": {
    request: {
      protocolVersion: 1,
      mutationId,
      expectedGroups: [{ groupId, revision: 1 }],
      orderedGroupIds: [groupId],
    },
    response: [group],
  },
  "group-delete": {
    request: { ...target, groupId },
    response: { protocolVersion: 1, groupId, revision: 2, sequence: 2 },
  },
  "conversation-groups-set": {
    request: {
      protocolVersion: 1,
      mutationId,
      expectedMemberships: [{ conversationId, groupIds: [] }],
      groupIds: [groupId],
    },
    response: { protocolVersion: 1, groups: [group], sequence: 2 },
  },
  "conversation-groups-add": {
    request: {
      protocolVersion: 1,
      mutationId,
      expectedMemberships: [{ conversationId, groupIds: [] }],
      groupIds: [groupId],
    },
    response: { protocolVersion: 1, groups: [group], sequence: 2 },
  },
  "conversation-title-update": {
    request: { ...conversationTarget, title: "Renamed" },
    response: snapshot,
  },
  "conversation-archive": { request: conversationTarget, response: snapshot },
  "conversation-restore": { request: conversationTarget, response: snapshot },
  "conversation-pinned-set": {
    request: { ...conversationTarget, isPinned: true },
    response: snapshot,
  },
  "conversation-notes-update": {
    request: { ...conversationTarget, notes: "Note" },
    response: snapshot,
  },
  "conversation-board-state-set": {
    request: { ...conversationTarget, boardState: "done" },
    response: snapshot,
  },
  "entry-pin-add": { request: entryTarget, response: snapshot },
  "entry-pin-remove": { request: entryTarget, response: snapshot },
  "entry-pin-done-set": { request: { ...entryTarget, done: true }, response: snapshot },
  "entry-pin-label-set": { request: { ...entryTarget, label: "Pinned" }, response: snapshot },
  "entry-marker-add": {
    request: {
      ...entryTarget,
      markerId,
      startOffset: 0,
      endOffset: 4,
      selectedText: "text",
      selectedTextDigest: `sha256:${"0".repeat(64)}`,
      style: "highlight",
      color: "yellow",
    },
    response: snapshot,
  },
  "entry-marker-remove": { request: markerTarget, response: snapshot },
  "entry-marker-done-set": { request: { ...markerTarget, done: true }, response: snapshot },
  "entry-marker-label-set": { request: { ...markerTarget, label: "Marked" }, response: snapshot },
  "conversation-delete": {
    request: conversationTarget,
    response: { protocolVersion: 1, conversationId, revision: 2, sequence: 2 },
  },
};
