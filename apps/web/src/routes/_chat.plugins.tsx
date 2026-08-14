// FILE: _chat.plugins.tsx
// Purpose: Registers the plugin and skill browser under the shared chat shell.
// Layer: Route
// Exports: Route

import { ThreadId } from "@omnimind/contracts";
import { createFileRoute } from "@tanstack/react-router";
import { PluginLibrary } from "~/components/PluginLibrary";

function parsePluginLibrarySearch(raw: Record<string, unknown>): { threadId?: string } {
  const threadId = typeof raw.threadId === "string" ? raw.threadId : null;
  return threadId !== null &&
    threadId.length > 0 &&
    threadId === threadId.trim() &&
    threadId.length <= 512
    ? { threadId }
    : {};
}

function PluginLibraryRoute() {
  const search = Route.useSearch();
  return (
    <PluginLibrary sourceThreadId={search.threadId ? ThreadId.makeUnsafe(search.threadId) : null} />
  );
}

export const Route = createFileRoute("/_chat/plugins")({
  validateSearch: parsePluginLibrarySearch,
  component: PluginLibraryRoute,
});
