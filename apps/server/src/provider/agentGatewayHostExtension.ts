import type {
  InlineExtension,
  LoadExtensionsResult,
  ToolDefinition,
  ToolInfo,
} from "@earendil-works/pi-coding-agent";

import {
  type AgentGatewayMcpFetch,
  type AgentGatewayMcpToolDescriptor,
} from "../agentGateway/mcpInjection.ts";
import type { AgentGatewayMcpConnection } from "../agentGateway/Services/AgentGatewayCredentials.ts";
import {
  assertCanonicalAgentGatewayDescriptors,
  makeAgentGatewayPiToolDefinition,
} from "./agentGatewayPiProjection.ts";

export const AGENT_GATEWAY_HOST_EXTENSION_NAME = "omnimind-agent-gateway-host";
export const AGENT_GATEWAY_HOST_EXTENSION_PATH = `<inline:${AGENT_GATEWAY_HOST_EXTENSION_NAME}>`;
export const AGENT_GATEWAY_HOST_LOADER_NAME = "search_tools";

const DEFAULT_MATCH_LIMIT = 3;
const MAX_MATCH_LIMIT = 10;

export type AgentGatewayHostDiagnostic =
  | { readonly kind: "loader-collision"; readonly name: string }
  | { readonly kind: "tool-collision"; readonly name: string };

export interface AgentGatewayHostExtensionHandle {
  readonly extension: InlineExtension;
  readonly loaderName: string;
  readonly candidateToolNames: ReadonlyArray<string>;
}

export class AgentGatewayHostCapabilityUnavailableError extends Error {
  readonly unavailableNames: ReadonlyArray<string>;

  constructor(unavailableNames: ReadonlyArray<string>) {
    super(`Required OmniMind Host tools are unavailable: ${unavailableNames.join(", ")}`);
    this.name = "AgentGatewayHostCapabilityUnavailableError";
    this.unavailableNames = unavailableNames;
  }
}

export function isAgentGatewayHostTool(tool: ToolInfo | undefined): boolean {
  return (
    tool?.sourceInfo.path === AGENT_GATEWAY_HOST_EXTENSION_PATH &&
    tool.sourceInfo.source === "inline" &&
    tool.sourceInfo.scope === "temporary" &&
    tool.sourceInfo.origin === "top-level"
  );
}

function hasHostRegisteredSource(
  tool: { readonly sourceInfo: ToolInfo["sourceInfo"] } | undefined,
): boolean {
  return (
    tool?.sourceInfo.path === AGENT_GATEWAY_HOST_EXTENSION_PATH &&
    tool.sourceInfo.source === "inline" &&
    tool.sourceInfo.scope === "temporary" &&
    tool.sourceInfo.origin === "top-level"
  );
}

export function inspectAgentGatewayHostExtensionRegistration(input: {
  readonly extensions: LoadExtensionsResult;
  readonly candidateToolNames: ReadonlyArray<string>;
}): {
  readonly available: boolean;
  readonly ownedToolNames: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
} {
  const winner = (name: string) =>
    input.extensions.extensions
      .map((extension) => extension.tools.get(name))
      .find((tool) => tool !== undefined);
  const loaderOwned = hasHostRegisteredSource(winner(AGENT_GATEWAY_HOST_LOADER_NAME));
  const ownedToolNames = input.candidateToolNames.filter((name) =>
    hasHostRegisteredSource(winner(name)),
  );
  const collisionDiagnostics = input.extensions.errors
    .filter(
      ({ path, error }) =>
        path === AGENT_GATEWAY_HOST_EXTENSION_PATH ||
        error.includes(AGENT_GATEWAY_HOST_LOADER_NAME) ||
        input.candidateToolNames.some((name) => error.includes(name)),
    )
    .map(({ error }) => error);
  return {
    available: loaderOwned && ownedToolNames.length > 0,
    ownedToolNames,
    diagnostics:
      !loaderOwned && collisionDiagnostics.length === 0
        ? ["Pi did not select the bundled AgentGateway Host loader."]
        : collisionDiagnostics,
  };
}

/** Ensure one exact prompt-required closure without touching any non-owned tool. */
export function ensureAgentGatewayHostToolsActive(input: {
  readonly session: {
    readonly getAllTools: () => ToolInfo[];
    readonly getActiveToolNames: () => string[];
    readonly setActiveToolsByName: (names: string[]) => void;
  };
  readonly requiredNames: ReadonlyArray<string>;
  readonly currentlyExposedNames: ReadonlySet<string>;
}): ReadonlyArray<string> {
  const allTools = input.session.getAllTools();
  const unavailable = input.requiredNames.filter((name) => {
    const tool = allTools.find((candidate) => candidate.name === name);
    return !isAgentGatewayHostTool(tool) || !input.currentlyExposedNames.has(name);
  });
  if (unavailable.length > 0) {
    throw new AgentGatewayHostCapabilityUnavailableError(unavailable);
  }
  const active = input.session.getActiveToolNames();
  const activeNames = new Set(active);
  const added = input.requiredNames.filter((name) => !activeNames.has(name));
  if (added.length > 0) {
    input.session.setActiveToolsByName([...new Set([...active, ...added])]);
  }
  return added;
}

/** Disable only this failed projection; a foreign winner and every other owner stay untouched. */
export function deactivateUnavailableAgentGatewayHostProjection(input: {
  readonly session: {
    readonly getAllTools: () => ToolInfo[];
    readonly getActiveToolNames: () => string[];
    readonly setActiveToolsByName: (names: string[]) => void;
  };
  readonly candidateToolNames: ReadonlyArray<string>;
}): ReadonlyArray<string> {
  const candidateNames = new Set([...input.candidateToolNames, AGENT_GATEWAY_HOST_LOADER_NAME]);
  const ownedNames = new Set(
    input.session
      .getAllTools()
      .filter((tool) => candidateNames.has(tool.name) && isAgentGatewayHostTool(tool))
      .map(({ name }) => name),
  );
  if (ownedNames.size > 0) {
    input.session.setActiveToolsByName(
      input.session.getActiveToolNames().filter((name) => !ownedNames.has(name)),
    );
  }
  return [...ownedNames];
}

function assertCanonicalDescriptors(
  descriptors: ReadonlyArray<AgentGatewayMcpToolDescriptor>,
): void {
  assertCanonicalAgentGatewayDescriptors(descriptors);
  for (const descriptor of descriptors) {
    if (descriptor.name === AGENT_GATEWAY_HOST_LOADER_NAME) {
      throw new Error(`Duplicate AgentGateway Host tool name: ${descriptor.name}`);
    }
  }
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchTerms(query: unknown): ReadonlyArray<string> {
  if (typeof query !== "string") return [];
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

function boundedLimit(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.max(1, Math.min(MAX_MATCH_LIMIT, value))
    : DEFAULT_MATCH_LIMIT;
}

function matchDescriptors(input: {
  readonly descriptors: ReadonlyArray<AgentGatewayMcpToolDescriptor>;
  readonly terms: ReadonlyArray<string>;
  readonly eligibleNames: ReadonlySet<string>;
  readonly limit: number;
}): ReadonlyArray<string> {
  if (input.terms.length === 0) return [];
  return input.descriptors
    .flatMap((descriptor, index) => {
      if (!input.eligibleNames.has(descriptor.name)) return [];
      const haystack = normalizeSearchText(
        `${descriptor.name} ${descriptor.description} ${descriptor.group ?? ""} ${descriptor.provenance ?? ""}`,
      );
      const score = input.terms.reduce(
        (total, term) => total + (haystack.includes(term) ? 1 : 0),
        0,
      );
      return score === 0 ? [] : [{ name: descriptor.name, score, index }];
    })
    .toSorted((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, input.limit)
    .map(({ name }) => name);
}

/**
 * Build one unconnected, session-scoped Host projection. Pi owns registry and
 * active-set truth; this Extension only touches names whose sourceInfo proves
 * they were registered by this exact inline source.
 */
export function makeAgentGatewayHostExtension(input: {
  readonly descriptors: ReadonlyArray<AgentGatewayMcpToolDescriptor>;
  readonly connection: AgentGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly fetch?: AgentGatewayMcpFetch;
  readonly loadCurrentlyExposedToolNames?: (
    signal: AbortSignal | undefined,
  ) => Promise<ReadonlySet<string>>;
  readonly onDiagnostic?: (diagnostic: AgentGatewayHostDiagnostic) => void;
}): AgentGatewayHostExtensionHandle | null {
  if (input.descriptors.length === 0) return null;
  assertCanonicalDescriptors(input.descriptors);
  const candidateToolNames = input.descriptors.map(({ name }) => name);

  return {
    loaderName: AGENT_GATEWAY_HOST_LOADER_NAME,
    candidateToolNames,
    extension: {
      name: AGENT_GATEWAY_HOST_EXTENSION_NAME,
      hidden: true,
      factory: (pi) => {
        for (const descriptor of input.descriptors) {
          pi.registerTool(
            makeAgentGatewayPiToolDefinition({
              descriptor,
              connection: input.connection,
              defineTool: input.defineTool,
              ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
            }),
          );
        }

        pi.registerTool(
          input.defineTool({
            name: AGENT_GATEWAY_HOST_LOADER_NAME,
            label: "Load Host tools",
            description:
              "Find and activate an OmniMind Host capability that is not currently available.",
            promptSnippet: "Load an additional OmniMind Host capability when needed",
            promptGuidelines: [
              "Use the active Host loader when the task needs an unavailable OmniMind Host capability; do not guess inactive tool names.",
            ],
            executionMode: "sequential",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  minLength: 1,
                  description: "Capability or task to find.",
                },
                limit: { type: "integer", minimum: 1, maximum: MAX_MATCH_LIMIT },
              },
              required: ["query"],
              additionalProperties: false,
            } as ToolDefinition["parameters"],
            execute: async (_toolCallId, params, signal) => {
              const allTools = pi.getAllTools();
              const ownedNames = new Set(
                allTools
                  .filter(
                    (tool) =>
                      candidateToolNames.includes(tool.name) && isAgentGatewayHostTool(tool),
                  )
                  .map(({ name }) => name),
              );
              const liveNames = input.loadCurrentlyExposedToolNames
                ? await input.loadCurrentlyExposedToolNames(signal)
                : new Set(candidateToolNames);
              const active = pi.getActiveTools();
              const activeNames = new Set(active);
              const eligibleNames = new Set(
                candidateToolNames.filter(
                  (name) => ownedNames.has(name) && liveNames.has(name) && !activeNames.has(name),
                ),
              );
              const matches = matchDescriptors({
                descriptors: input.descriptors,
                terms: searchTerms((params as Record<string, unknown>).query),
                eligibleNames,
                limit: boundedLimit((params as Record<string, unknown>).limit),
              });
              if (matches.length > 0) {
                pi.setActiveTools([...new Set([...active, ...matches])]);
              }
              return {
                content: [
                  {
                    type: "text",
                    text:
                      matches.length > 0
                        ? `Loaded ${matches.length} matching Host tool(s).`
                        : "No inactive Host tools matched this capability.",
                  },
                ],
                details: { matches, added: matches },
              };
            },
          }),
        );

        pi.on("session_start", () => {
          const allTools = pi.getAllTools();
          const loader = allTools.find((tool) => tool.name === AGENT_GATEWAY_HOST_LOADER_NAME);
          if (!isAgentGatewayHostTool(loader)) {
            input.onDiagnostic?.({
              kind: "loader-collision",
              name: AGENT_GATEWAY_HOST_LOADER_NAME,
            });
            return;
          }

          const ownedNames = new Set<string>();
          for (const name of candidateToolNames) {
            const tool = allTools.find((candidate) => candidate.name === name);
            if (isAgentGatewayHostTool(tool)) {
              ownedNames.add(name);
            } else {
              input.onDiagnostic?.({ kind: "tool-collision", name });
            }
          }
          const active = pi.getActiveTools().filter((name) => !ownedNames.has(name));
          pi.setActiveTools([...new Set([...active, AGENT_GATEWAY_HOST_LOADER_NAME])]);
        });
      },
    },
  };
}
