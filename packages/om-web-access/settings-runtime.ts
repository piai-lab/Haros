import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

import {
	type WebSearchConfigMutation,
	type WebSearchConfigMutationResult,
	type WebSearchConfigRecord,
	type WebSearchConfigService,
	type WebSearchConfigSnapshot,
} from "./config-service.ts";
import {
	classifySearchProviderFailure,
	getSearchProviderConfigurationProjection,
	getSearchProviderPresentation,
	getSearchProviderRouteConfigurationProjection,
	normalizeSearchProviderSelection,
	search,
	SearchRouteExhaustedError,
	type ResolvedSearchProvider,
	type SearchProviderPresentation,
	type SearchProviderSelection,
} from "./gemini-search.ts";
import { resolveWebAccessToolEnablement } from "./tool-enablement.ts";
import {
	createWebAccessInstanceContext,
	runWithWebAccessContext,
} from "./runtime-context.ts";
import { getGeminiWebAccountDiagnostic } from "./gemini-web.ts";

export type WebSearchWorkflow = "none" | "auto-summary" | "summary-review";

export interface WebSearchSettingsFieldDraft {
	readonly configKey: string;
	readonly value: string | null;
}

export interface WebSearchSettingsDraft {
	readonly provider: string | readonly string[];
	readonly workflow: WebSearchWorkflow;
	readonly autoShowSearchProcess: boolean;
	readonly fields: readonly WebSearchSettingsFieldDraft[];
}

export interface WebSearchSettingsProviderProjection {
	readonly id: ResolvedSearchProvider;
	readonly displayName: string;
	readonly prerequisite: "none" | "optional-key" | "key" | "endpoint" | "key-or-session" | "gemini";
	readonly costHint: "keyless-shared-quota" | "may-charge" | "provider-dependent";
	readonly participation: {
		readonly auto: boolean;
		readonly all: "included" | "excluded" | "api-only";
		readonly explicitOnly: boolean;
	};
	readonly configured: boolean;
	readonly configurationState: "not-required" | "session-dependent" | "missing" | "partial" | "complete";
	readonly missingRequiredConfigKeys: readonly string[];
	readonly structurallyPossible: boolean;
	readonly fields: ReadonlyArray<{
		readonly id: string;
		readonly configKey: string;
		readonly kind: "secret" | "url" | "text";
		readonly role: "api-key" | "endpoint" | "model" | "zone";
		readonly required: boolean;
		readonly environmentVariable: string | null;
		readonly qualifier: string | null;
		readonly value: string | null;
		readonly invalidStoredValue: boolean;
	}>;
	readonly advancedFileOnly: readonly string[];
	readonly settingsGroup: SearchProviderPresentation["settingsGroup"];
	readonly icon: SearchProviderPresentation["icon"];
}

export interface WebSearchSettingsProjection {
	readonly revision: string;
	readonly schemaVersion: number;
	readonly workflow: WebSearchWorkflow;
	readonly autoShowSearchProcess: boolean;
	readonly provider: SearchProviderSelection;
	readonly capabilityStatus: "possible" | "needs-configuration" | "file-disabled";
	readonly tools: Readonly<Record<"webSearch" | "sourceCheck" | "fetchContent" | "getSearchContent", {
		readonly enabled: boolean;
		readonly reason: "enabled" | "file-disabled";
	}>>;
	readonly providers: readonly WebSearchSettingsProviderProjection[];
}

export interface WebSearchProviderProbeResult {
	readonly state: "ready" | "degraded" | "unavailable" | "failed";
	readonly provider: ResolvedSearchProvider | "all" | null;
	readonly reason:
		| "request-succeeded"
		| "temporary-failure"
		| "route-exhausted"
		| "provider-failed"
		| "credential-rejected"
		| "quota-exhausted"
		| "missing-configuration"
		| "network-failure"
		| "request-cancelled";
	readonly requestId?: string;
	readonly durationMs: number;
}

function workflowFrom(value: unknown): WebSearchWorkflow {
	return value === "none" || value === "auto-summary" || value === "summary-review"
		? value
		: "auto-summary";
}

function stringValue(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

export function projectWebSearchSettings(
	snapshot: WebSearchConfigSnapshot,
): WebSearchSettingsProjection {
	const config = snapshot.config;
	const provider = normalizeSearchProviderSelection(config.provider ?? config.searchProvider);
	const toolEnablement = resolveWebAccessToolEnablement(config);
	const routeProjection = new Map(
		getSearchProviderPresentation().map(({ id }) => [
			id,
			getSearchProviderRouteConfigurationProjection(id, config),
		]),
	);
	const routeStructurallyPossible = Array.isArray(provider)
		? provider.some((id) => routeProjection.get(id)?.named === true)
		: provider === "auto"
			? [...routeProjection.values()].some(({ auto }) => auto)
			: provider === "all"
				? [...routeProjection.values()].some(({ all }) => all)
				: routeProjection.get(provider)?.named === true;
	return {
		revision: snapshot.revision,
		schemaVersion: snapshot.schemaVersion,
		workflow: workflowFrom(config.workflow),
		autoShowSearchProcess: config.autoOpenBrowser === true,
		provider,
		capabilityStatus: !toolEnablement.webSearch
			? "file-disabled"
			: routeStructurallyPossible
				? "possible"
				: "needs-configuration",
		tools: Object.fromEntries(
			Object.entries(toolEnablement).map(([key, enabled]) => [
				key,
				{ enabled, reason: enabled ? "enabled" : "file-disabled" },
			]),
		) as WebSearchSettingsProjection["tools"],
		providers: getSearchProviderPresentation().map((provider) => {
			const fields = provider.fields.map((field) => {
				const stored = config[field.configKey];
				return {
					...field,
					environmentVariable: field.environmentVariable ?? null,
					qualifier: field.qualifier ?? null,
					value: stringValue(stored),
					invalidStoredValue: stored !== undefined && typeof stored !== "string",
				};
			});
			const configuration = getSearchProviderConfigurationProjection(provider.id, config);
			return {
				...provider,
				fields,
				configured: configuration.configured,
				configurationState: configuration.state,
				missingRequiredConfigKeys: configuration.missingRequiredConfigKeys,
				structurallyPossible: configuration.structurallyPossible,
			};
		}),
	};
}

const knownConfigKeys = new Set([
	"provider",
	"workflow",
	"autoOpenBrowser",
	...getSearchProviderPresentation().flatMap(({ fields }) => fields.map(({ configKey }) => configKey)),
]);

function validatedDraftPatch(draft: WebSearchSettingsDraft): {
	readonly patch: WebSearchConfigRecord;
	readonly remove: readonly string[];
} {
	const provider = normalizeSearchProviderSelection(draft.provider);
	const patch: WebSearchConfigRecord = {
		provider,
		workflow: workflowFrom(draft.workflow),
		autoOpenBrowser: draft.autoShowSearchProcess === true,
	};
	const remove: string[] = [];
	const seen = new Set<string>();
	for (const field of draft.fields) {
		if (!knownConfigKeys.has(field.configKey) || field.configKey === "provider" || field.configKey === "workflow" || field.configKey === "autoOpenBrowser") {
			throw new Error(`Unknown Web search setting: ${field.configKey}`);
		}
		if (seen.has(field.configKey)) throw new Error(`Duplicate Web search setting: ${field.configKey}`);
		seen.add(field.configKey);
		if (field.value === null) remove.push(field.configKey);
		else patch[field.configKey] = field.value;
	}
	return { patch, remove };
}

export function mutateWebSearchSettings(
	service: WebSearchConfigService,
	input: {
		readonly expectedRevision: string;
		readonly draft: WebSearchSettingsDraft;
		readonly allowOverwriteConflict?: boolean;
	},
): WebSearchConfigMutationResult {
	const fields = validatedDraftPatch(input.draft);
	const mutation: WebSearchConfigMutation = {
		expectedRevision: input.expectedRevision,
		patch: fields.patch,
		remove: fields.remove,
		...(input.allowOverwriteConflict ? { allowOverwriteConflict: true } : {}),
	};
	return service.mutate(mutation);
}

function candidateConfig(
	service: WebSearchConfigService,
	draft: WebSearchSettingsDraft,
): WebSearchConfigRecord {
	const current = service.readSnapshot().config;
	const fields = validatedDraftPatch(draft);
	const next = { ...current, ...fields.patch };
	for (const key of fields.remove) delete next[key];
	return next;
}

function readOnlyCandidateService(
	base: WebSearchConfigService,
	config: WebSearchConfigRecord,
): WebSearchConfigService {
	const baseSnapshot = base.readSnapshot();
	const snapshot: WebSearchConfigSnapshot = { ...baseSnapshot, config };
	return {
		configPath: base.configPath,
		ensureDefault: () => snapshot,
		readSnapshot: () => snapshot,
		refresh: () => snapshot,
		mutate: () => {
			throw new Error("A request-scoped Provider test cannot save Web search settings.");
		},
		subscribeRevision: () => () => undefined,
	};
}

async function executeProbe(input: {
	readonly service: WebSearchConfigService;
	readonly provider?: ResolvedSearchProvider;
	readonly draft?: WebSearchSettingsDraft;
	readonly signal?: AbortSignal;
	readonly extensionContext?: ExtensionContext;
	readonly requestId?: string;
}): Promise<WebSearchProviderProbeResult> {
	const startedAt = Date.now();
	const configService = input.draft
		? readOnlyCandidateService(input.service, candidateConfig(input.service, input.draft))
		: input.service;
	const context = createWebAccessInstanceContext({ configService, profile: "omnimind" });
	try {
		const response = await runWithWebAccessContext(context, () =>
			search("OmniMind Web Access connectivity check", {
				...(input.provider ? { provider: input.provider } : {}),
				numResults: 1,
				signal: input.signal,
				extensionContext: input.extensionContext,
			}),
		);
		return {
			state: "ready",
			provider: response.provider,
			reason: "request-succeeded",
			durationMs: Date.now() - startedAt,
			...(input.requestId ? { requestId: input.requestId } : {}),
		};
	} catch (error) {
		if (input.provider) {
			const failure = classifySearchProviderFailure(input.provider, error);
			const reason = failure.kind === "quota"
				? "quota-exhausted"
				: failure.kind === "credential" || failure.kind === "auth"
					? "credential-rejected"
					: failure.kind === "config" || failure.kind === "invalid-request"
						? "missing-configuration"
						: failure.kind === "network" || failure.kind === "transient"
							? "network-failure"
							: failure.kind === "aborted"
								? "request-cancelled"
								: "provider-failed";
			return {
				state: "failed",
				provider: input.provider,
				reason,
				durationMs: Date.now() - startedAt,
				...(input.requestId ? { requestId: input.requestId } : {}),
			};
		}
		if (error instanceof SearchRouteExhaustedError) {
			const transient = error.failures.some(({ kind }) => kind === "transient" || kind === "network");
			return {
				state: transient ? "degraded" : "unavailable",
				provider: null,
				reason: transient ? "temporary-failure" : "route-exhausted",
				durationMs: Date.now() - startedAt,
				...(input.requestId ? { requestId: input.requestId } : {}),
			};
		}
		return {
			state: "degraded",
			provider: null,
			reason: "temporary-failure",
			durationMs: Date.now() - startedAt,
			...(input.requestId ? { requestId: input.requestId } : {}),
		};
	}
}

export function testWebSearchProvider(input: {
	readonly service: WebSearchConfigService;
	readonly provider: ResolvedSearchProvider;
	readonly draft: WebSearchSettingsDraft;
	readonly signal?: AbortSignal;
	readonly requestId?: string;
}): Promise<WebSearchProviderProbeResult> {
	return executeProbe(input);
}

export function recheckWebSearchRoute(input: {
	readonly service: WebSearchConfigService;
	readonly signal?: AbortSignal;
	readonly requestId?: string;
}): Promise<WebSearchProviderProbeResult> {
	input.service.refresh();
	return executeProbe(input);
}

export async function diagnoseGeminiWebAccount(input: {
	readonly service: WebSearchConfigService;
	readonly draft: WebSearchSettingsDraft;
}): Promise<{
	readonly state: "available" | "unavailable";
	readonly browser: string | null;
	readonly profile: string | null;
	readonly account: string | null;
}> {
	const configService = readOnlyCandidateService(
		input.service,
		candidateConfig(input.service, input.draft),
	);
	const context = createWebAccessInstanceContext({ configService, profile: "omnimind" });
	return runWithWebAccessContext(context, getGeminiWebAccountDiagnostic);
}
