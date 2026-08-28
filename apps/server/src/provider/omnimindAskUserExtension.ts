import type {
  InlineExtension,
  LoadExtensionsResult,
  ToolDefinition,
  ToolInfo,
} from "@earendil-works/pi-coding-agent";
import {
  ASK_USER_TOOL_NAME,
  buildAskUserTool,
  type AskUserProductInteractionPort,
} from "@harnessos/om-ask";

export const OMNIMIND_ASK_USER_EXTENSION_NAME = "omnimind-agent-ask-user";
export const OMNIMIND_ASK_USER_EXTENSION_PATH = `<inline:${OMNIMIND_ASK_USER_EXTENSION_NAME}>`;

function hasProductSource(tool: ToolInfo | undefined): boolean {
  return (
    tool?.sourceInfo.path === OMNIMIND_ASK_USER_EXTENSION_PATH &&
    tool.sourceInfo.source === "inline" &&
    tool.sourceInfo.scope === "temporary" &&
    tool.sourceInfo.origin === "top-level"
  );
}

export function inspectOmniMindAskUserRegistration(input: {
  readonly extensions: LoadExtensionsResult;
  readonly tools: ReadonlyArray<ToolInfo>;
  readonly activeToolNames: ReadonlyArray<string>;
}): {
  readonly available: boolean;
  readonly registered: boolean;
  readonly collision: boolean;
  readonly diagnostics: string[];
} {
  const winner = input.tools.find((tool) => tool.name === ASK_USER_TOOL_NAME);
  const registrations = input.extensions.extensions.flatMap((extension) =>
    extension.tools.has(ASK_USER_TOOL_NAME) ? [extension.sourceInfo] : [],
  );
  const registered =
    registrations.length === 1 &&
    registrations[0]?.path === OMNIMIND_ASK_USER_EXTENSION_PATH &&
    hasProductSource(winner);
  const diagnostics = input.extensions.errors
    .filter(
      ({ path, error }) =>
        path === OMNIMIND_ASK_USER_EXTENSION_PATH || error.includes(ASK_USER_TOOL_NAME),
    )
    .map(({ error }) => error);
  const available = registered && input.activeToolNames.includes(ASK_USER_TOOL_NAME);
  return {
    available,
    registered,
    collision: registrations.length > 1,
    diagnostics:
      !registered && diagnostics.length === 0
        ? [
            registrations.length > 1
              ? "Pi discovered more than one ask_user Extension registration."
              : "Pi did not select the sole bundled OmniMind ask_user Extension tool.",
          ]
        : diagnostics,
  };
}

export function makeOmniMindAskUserExtension(input: {
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly interaction: AskUserProductInteractionPort;
}): InlineExtension {
  return {
    name: OMNIMIND_ASK_USER_EXTENSION_NAME,
    hidden: true,
    factory: (pi) => {
      const tool = buildAskUserTool({
        defineTool: (definition) => definition,
        interaction: input.interaction,
      });
      pi.registerTool(input.defineTool(tool as unknown as ToolDefinition));
    },
  };
}
