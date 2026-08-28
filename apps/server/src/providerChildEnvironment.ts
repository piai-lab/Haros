// FILE: providerChildEnvironment.ts
// Purpose: Builds engine child environments without OmniMind control-plane authority.
// Layer: Server engine process security

export type EngineChildKind =
  | "acp"
  | "antigravity"
  | "claude"
  | "codex"
  | "cursor"
  | "droid"
  | "grok"
  | "kilo"
  | "opencode"
  | "pi";

const ENGINE_CREDENTIAL_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
  "GROK_CODE_XAI_API_KEY",
  "FACTORY_API_KEY",
  "CURSOR_API_KEY",
  "DOCKER_AUTH_CONFIG",
]);

export function registerEngineCredentialKey(key: string): void {
  const normalized = key.trim().toUpperCase();
  if (/^[A-Z0-9_.-]+$/u.test(normalized)) {
    ENGINE_CREDENTIAL_KEYS.add(normalized);
  }
}

export function isEngineCredentialKey(key: string): boolean {
  return ENGINE_CREDENTIAL_KEYS.has(key.trim().toUpperCase());
}

const ENGINE_CREDENTIAL_GRANTS: Record<EngineChildKind, "all" | ReadonlySet<string>> = {
  antigravity: new Set(["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS"]),
  claude: new Set([
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
    "GOOGLE_APPLICATION_CREDENTIALS",
  ]),
  cursor: new Set(["CURSOR_API_KEY"]),
  droid: new Set(["FACTORY_API_KEY"]),
  grok: new Set(["XAI_API_KEY", "GROK_CODE_XAI_API_KEY"]),
  // These profiles deliberately support arbitrary upstream model engines.
  acp: "all",
  codex: "all",
  kilo: "all",
  opencode: "all",
  pi: "all",
};

const INHERITED_NATIVE_CAPABILITY_KEYS = new Set([
  "BUN_OPTIONS",
  "ELECTRON_RUN_AS_NODE",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_REPL_SANDBOX_ALLOWED_UNIX_SOCKETS",
]);

const isTestHarnessKey = (key: string, env: NodeJS.ProcessEnv): boolean =>
  Boolean(env.VITEST) && (key.startsWith("HARNESSOS_FAKE_") || key.startsWith("HARNESSOS_ACP_"));

export function buildProviderChildEnvironment(input: {
  readonly engine: EngineChildKind;
  readonly baseEnv?: NodeJS.ProcessEnv;
  readonly inheritedOmniMindKeys?: ReadonlyArray<string>;
  readonly inheritedNativeCapabilityKeys?: ReadonlyArray<string>;
  readonly overrides?: NodeJS.ProcessEnv;
}): NodeJS.ProcessEnv {
  const baseEnv = {
    ...(input.baseEnv ?? process.env),
    ...input.overrides,
  };
  const allowedOmniMindKeys = new Set(input.inheritedOmniMindKeys ?? []);
  const allowedNativeCapabilities = new Set(input.inheritedNativeCapabilityKeys ?? []);
  const credentialGrants = ENGINE_CREDENTIAL_GRANTS[input.engine];
  const childEnv: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(baseEnv)) {
    if (
      key.startsWith("HARNESSOS_") &&
      !allowedOmniMindKeys.has(key) &&
      !isTestHarnessKey(key, baseEnv)
    ) {
      continue;
    }
    if (INHERITED_NATIVE_CAPABILITY_KEYS.has(key) && !allowedNativeCapabilities.has(key)) {
      continue;
    }
    if (
      isEngineCredentialKey(key) &&
      credentialGrants !== "all" &&
      !credentialGrants.has(key.toUpperCase())
    ) {
      continue;
    }
    childEnv[key] = value;
  }

  return childEnv;
}
