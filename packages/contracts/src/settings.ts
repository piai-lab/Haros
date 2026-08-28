import { Schema } from "effect";
import { TrimmedString } from "./baseSchemas";
import { DEFAULT_GIT_TEXT_GENERATION_MODEL } from "./model";
import { EngineSelection, EngineKind, ThreadEnvironmentMode } from "./orchestration";
import { isOmniMindAgentPromptContent, HARNESSOS_AGENT_PROMPT_MAX_BYTES } from "./editableText";
import { BuiltInToolGroupOverrides } from "./agentTools";

const StringSetting = TrimmedString.check(Schema.isMaxLength(4096));
const CustomModels = Schema.Array(Schema.String.check(Schema.isMaxLength(256))).pipe(
  Schema.withDecodingDefault(() => []),
);

const EngineSettingsBase = {
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "")),
  customModels: CustomModels,
};

export const OmniMindServerEngineSettings = Schema.Struct({
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  defaultPrompt: Schema.NullOr(
    Schema.String.check(
      Schema.isMaxLength(HARNESSOS_AGENT_PROMPT_MAX_BYTES),
      Schema.makeFilter(isOmniMindAgentPromptContent),
    ),
  ).pipe(Schema.withDecodingDefault(() => null)),
});
export type OmniMindServerEngineSettings = typeof OmniMindServerEngineSettings.Type;

export const CodexServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "codex")),
  homePath: StringSetting.pipe(Schema.withDecodingDefault(() => "")),
});
export type CodexServerEngineSettings = typeof CodexServerEngineSettings.Type;

export const ClaudeServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "claude")),
  launchArgs: Schema.String.check(Schema.isMaxLength(4096)).pipe(
    Schema.withDecodingDefault(() => ""),
  ),
});
export type ClaudeServerEngineSettings = typeof ClaudeServerEngineSettings.Type;

export const AntigravityServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "agy")),
});
export type AntigravityServerEngineSettings = typeof AntigravityServerEngineSettings.Type;

export const GrokServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "grok")),
});
export type GrokServerEngineSettings = typeof GrokServerEngineSettings.Type;

export const DroidServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "droid")),
});
export type DroidServerEngineSettings = typeof DroidServerEngineSettings.Type;

export const CursorServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "cursor-agent")),
  apiEndpoint: StringSetting.pipe(Schema.withDecodingDefault(() => "")),
});
export type CursorServerEngineSettings = typeof CursorServerEngineSettings.Type;

export const OpenCodeServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "opencode")),
  serverUrl: StringSetting.pipe(Schema.withDecodingDefault(() => "")),
  serverPasswordConfigured: Schema.Boolean.pipe(Schema.withDecodingDefault(() => false)),
  experimentalWebSockets: Schema.Boolean.pipe(Schema.withDecodingDefault(() => false)),
});
export type OpenCodeServerEngineSettings = typeof OpenCodeServerEngineSettings.Type;

export const KiloServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "kilo")),
  serverUrl: StringSetting.pipe(Schema.withDecodingDefault(() => "")),
  serverPasswordConfigured: Schema.Boolean.pipe(Schema.withDecodingDefault(() => false)),
});
export type KiloServerEngineSettings = typeof KiloServerEngineSettings.Type;

export const PiServerEngineSettings = Schema.Struct({
  ...EngineSettingsBase,
  binaryPath: StringSetting.pipe(Schema.withDecodingDefault(() => "pi")),
  agentDir: StringSetting.pipe(Schema.withDecodingDefault(() => "")),
});
export type PiServerEngineSettings = typeof PiServerEngineSettings.Type;

const DisabledSkillNames = Schema.Array(Schema.String.check(Schema.isMaxLength(256))).pipe(
  Schema.withDecodingDefault(() => []),
);

// User-level skill toggles. Skills are keyed by lowercased name because the
// unified catalog dedupes engine copies of the same skill by name.
export const SkillsServerSettings = Schema.Struct({
  disabled: DisabledSkillNames,
});
export type SkillsServerSettings = typeof SkillsServerSettings.Type;

export const AgentToolsServerSettings = Schema.Struct({
  /** Tools offered to model agents; this is not the Agent product surface. */
  builtInGroupOverrides: BuiltInToolGroupOverrides.pipe(Schema.withDecodingDefault(() => ({}))),
});
export type AgentToolsServerSettings = typeof AgentToolsServerSettings.Type;

export const ServerSettings = Schema.Struct({
  defaultEngine: EngineKind.pipe(Schema.withDecodingDefault(() => "oa")),
  enableAssistantStreaming: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  enableEngineUpdateChecks: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  defaultThreadEnvMode: ThreadEnvironmentMode.pipe(Schema.withDecodingDefault(() => "local")),
  addProjectBaseDirectory: StringSetting.pipe(Schema.withDecodingDefault(() => "")),
  textGenerationEngineSelection: EngineSelection.pipe(
    Schema.withDecodingDefault(() => ({
      engine: "codex" as const,
      model: DEFAULT_GIT_TEXT_GENERATION_MODEL,
    })),
  ),
  engines: Schema.Struct({
    oa: OmniMindServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    codex: CodexServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    claude: ClaudeServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    cursor: CursorServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    antigravity: AntigravityServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    grok: GrokServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    droid: DroidServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    kilo: KiloServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    opencode: OpenCodeServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    pi: PiServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
  }).pipe(Schema.withDecodingDefault(() => ({}))),
  skills: SkillsServerSettings.pipe(Schema.withDecodingDefault(() => ({}))),
  agentTools: AgentToolsServerSettings.pipe(Schema.withDecodingDefault(() => ({}))),
});
export type ServerSettings = typeof ServerSettings.Type;

export const DEFAULT_SERVER_SETTINGS: ServerSettings = Schema.decodeSync(ServerSettings)({});

const OmniMindServerEngineSettingsView = Schema.Struct({
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
});

// Public settings deliberately omit the customized default prompt. Its only
// projection and mutation authority is the dedicated OmniMind prompt contract.
export const ServerSettingsView = Schema.Struct({
  defaultEngine: EngineKind.pipe(Schema.withDecodingDefault(() => "oa")),
  enableAssistantStreaming: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  enableEngineUpdateChecks: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  defaultThreadEnvMode: ThreadEnvironmentMode.pipe(Schema.withDecodingDefault(() => "local")),
  addProjectBaseDirectory: StringSetting.pipe(Schema.withDecodingDefault(() => "")),
  textGenerationEngineSelection: EngineSelection.pipe(
    Schema.withDecodingDefault(() => ({
      engine: "codex" as const,
      model: DEFAULT_GIT_TEXT_GENERATION_MODEL,
    })),
  ),
  engines: Schema.Struct({
    oa: OmniMindServerEngineSettingsView.pipe(Schema.withDecodingDefault(() => ({}))),
    codex: CodexServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    claude: ClaudeServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    cursor: CursorServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    antigravity: AntigravityServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    grok: GrokServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    droid: DroidServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    kilo: KiloServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    opencode: OpenCodeServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    pi: PiServerEngineSettings.pipe(Schema.withDecodingDefault(() => ({}))),
  }).pipe(Schema.withDecodingDefault(() => ({}))),
  skills: SkillsServerSettings.pipe(Schema.withDecodingDefault(() => ({}))),
  agentTools: AgentToolsServerSettings.pipe(Schema.withDecodingDefault(() => ({}))),
});
export type ServerSettingsView = typeof ServerSettingsView.Type;

export const DEFAULT_SERVER_SETTINGS_VIEW: ServerSettingsView = Schema.decodeSync(
  ServerSettingsView,
)({});

const EngineSelectionPatch = Schema.Struct({
  engine: Schema.optionalKey(EngineKind),
  model: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  options: Schema.optionalKey(Schema.Unknown),
});

const EngineSettingsBasePatch = {
  enabled: Schema.optionalKey(Schema.Boolean),
  binaryPath: Schema.optionalKey(StringSetting),
  customModels: Schema.optionalKey(CustomModels),
};

export const ServerSettingsPatch = Schema.Struct({
  defaultEngine: Schema.optionalKey(EngineKind),
  enableAssistantStreaming: Schema.optionalKey(Schema.Boolean),
  enableEngineUpdateChecks: Schema.optionalKey(Schema.Boolean),
  defaultThreadEnvMode: Schema.optionalKey(ThreadEnvironmentMode),
  addProjectBaseDirectory: Schema.optionalKey(StringSetting),
  textGenerationEngineSelection: Schema.optionalKey(EngineSelectionPatch),
  engines: Schema.optionalKey(
    Schema.Struct({
      oa: Schema.optionalKey(
        Schema.Struct({
          enabled: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      codex: Schema.optionalKey(
        Schema.Struct({
          ...EngineSettingsBasePatch,
          homePath: Schema.optionalKey(StringSetting),
        }),
      ),
      claude: Schema.optionalKey(
        Schema.Struct({
          ...EngineSettingsBasePatch,
          launchArgs: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(4096))),
        }),
      ),
      cursor: Schema.optionalKey(
        Schema.Struct({
          ...EngineSettingsBasePatch,
          apiEndpoint: Schema.optionalKey(StringSetting),
        }),
      ),
      antigravity: Schema.optionalKey(Schema.Struct(EngineSettingsBasePatch)),
      grok: Schema.optionalKey(Schema.Struct(EngineSettingsBasePatch)),
      droid: Schema.optionalKey(Schema.Struct(EngineSettingsBasePatch)),
      kilo: Schema.optionalKey(
        Schema.Struct({
          ...EngineSettingsBasePatch,
          serverUrl: Schema.optionalKey(StringSetting),
          serverPassword: Schema.optional(Schema.Never),
        }),
      ),
      opencode: Schema.optionalKey(
        Schema.Struct({
          ...EngineSettingsBasePatch,
          serverUrl: Schema.optionalKey(StringSetting),
          serverPassword: Schema.optional(Schema.Never),
          experimentalWebSockets: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      pi: Schema.optionalKey(
        Schema.Struct({
          ...EngineSettingsBasePatch,
          binaryPath: Schema.optionalKey(StringSetting),
          agentDir: Schema.optionalKey(StringSetting),
        }),
      ),
    }),
  ),
  skills: Schema.optionalKey(
    Schema.Struct({
      disabled: Schema.optionalKey(Schema.Array(Schema.String.check(Schema.isMaxLength(256)))),
    }),
  ),
  agentTools: Schema.optionalKey(
    Schema.Struct({
      builtInGroupOverrides: Schema.optionalKey(BuiltInToolGroupOverrides),
    }),
  ),
});
export type ServerSettingsPatch = typeof ServerSettingsPatch.Type;

export class ServerSettingsError extends Schema.TaggedErrorClass<ServerSettingsError>()(
  "ServerSettingsError",
  {
    settingsPath: Schema.String,
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Server settings error at ${this.settingsPath}: ${this.detail}`;
  }
}
