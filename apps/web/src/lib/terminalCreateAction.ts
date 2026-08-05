import { collectTerminalIdsFromLayout } from "../terminalPaneLayout";
import type { ThreadTerminalGroup } from "../types";

export interface ResolveTerminalCreateActionInput {
  terminalOpen: boolean;
  activeTerminalId: string;
  activeTerminalGroupId: string;
  terminalGroups: ThreadTerminalGroup[];
}

export type TerminalCreateAction =
  | { kind: "create-group" }
  | { kind: "create-tab"; targetTerminalId: string };

function resolveActiveTerminalGroup(
  input: ResolveTerminalCreateActionInput,
): ThreadTerminalGroup | null {
  return (
    input.terminalGroups.find((group) => group.id === input.activeTerminalGroupId) ??
    input.terminalGroups.find((group) =>
      collectTerminalIdsFromLayout(group.layout).includes(input.activeTerminalId),
    ) ??
    input.terminalGroups[0] ??
    null
  );
}

export function resolveTerminalCreateAction(
  input: ResolveTerminalCreateActionInput,
): TerminalCreateAction {
  if (!input.terminalOpen) {
    return { kind: "create-group" };
  }

  const activeGroup = resolveActiveTerminalGroup(input);
  const activeGroupTerminalIds = activeGroup
    ? collectTerminalIdsFromLayout(activeGroup.layout)
    : [];
  const normalizedActiveTerminalId = input.activeTerminalId.trim();

  if (activeGroup && activeGroupTerminalIds.includes(activeGroup.activeTerminalId)) {
    return {
      kind: "create-tab",
      targetTerminalId: activeGroup.activeTerminalId,
    };
  }

  if (activeGroupTerminalIds.includes(normalizedActiveTerminalId)) {
    return {
      kind: "create-tab",
      targetTerminalId: normalizedActiveTerminalId,
    };
  }

  if (activeGroupTerminalIds[0]) {
    return {
      kind: "create-tab",
      targetTerminalId: activeGroupTerminalIds[0],
    };
  }

  if (normalizedActiveTerminalId.length > 0) {
    return {
      kind: "create-tab",
      targetTerminalId: normalizedActiveTerminalId,
    };
  }

  return { kind: "create-group" };
}
