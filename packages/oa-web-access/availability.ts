import type { ExtensionAPI, ToolInfo } from "@earendil-works/pi-coding-agent";

import type { WebSearchConfigService } from "./config-service.ts";
import { SearchRouteExhaustedError } from "./gemini-search.ts";

export type WebSearchAvailabilityStatus =
	| "possible"
	| "ready"
	| "degraded"
	| "unavailable";

const SEARCH_TOOL_NAMES = ["web_search", "source_check"] as const;

/** Session-scoped projection from real route evidence into Pi's own active set. */
export class WebSearchSessionAvailability {
	#status: WebSearchAvailabilityStatus = "possible";
	#removedOwnedNames = new Set<string>();
	#unsubscribeRevision: (() => void) | undefined;
	readonly #pi: Pick<ExtensionAPI, "getActiveTools" | "getAllTools" | "setActiveTools">;
	readonly #configService: WebSearchConfigService;
	readonly #isOwnedTool: (tool: ToolInfo | undefined) => boolean;

	constructor(
		pi: Pick<ExtensionAPI, "getActiveTools" | "getAllTools" | "setActiveTools">,
		configService: WebSearchConfigService,
		isOwnedTool: (tool: ToolInfo | undefined) => boolean,
	) {
		this.#pi = pi;
		this.#configService = configService;
		this.#isOwnedTool = isOwnedTool;
	}

	get status(): WebSearchAvailabilityStatus {
		return this.#status;
	}

	start(): void {
		this.#unsubscribeRevision ??= this.#configService.subscribeRevision(() => {
			this.#status = "possible";
			this.#restoreOwnedTools();
		});
	}

	noteSearchSuccess(): void {
		this.#status = "ready";
		this.#restoreOwnedTools();
	}

	noteSearchFailure(error: unknown): void {
		if (!(error instanceof SearchRouteExhaustedError)) return;
		const hasUnreliableFailure = error.failures.some(
			({ kind }) => kind === "transient" || kind === "network",
		);
		if (hasUnreliableFailure) {
			this.#status = "degraded";
			return;
		}
		this.#status = "unavailable";
		this.#removeOwnedSearchTools();
	}

	shutdown(): void {
		this.#unsubscribeRevision?.();
		this.#unsubscribeRevision = undefined;
		this.#removedOwnedNames.clear();
	}

	#owned(name: string): boolean {
		return this.#isOwnedTool(this.#pi.getAllTools().find((tool) => tool.name === name));
	}

	#removeOwnedSearchTools(): void {
		const active = this.#pi.getActiveTools();
		const remove = new Set<string>();
		for (const name of SEARCH_TOOL_NAMES) {
			if (active.includes(name) && this.#owned(name)) {
				remove.add(name);
				this.#removedOwnedNames.add(name);
			}
		}
		if (remove.size > 0) {
			this.#pi.setActiveTools(active.filter((name) => !remove.has(name)));
		}
	}

	#restoreOwnedTools(): void {
		if (this.#removedOwnedNames.size === 0) return;
		const active = this.#pi.getActiveTools();
		const next = [...active];
		for (const name of [...this.#removedOwnedNames]) {
			if (!this.#owned(name)) continue;
			if (!next.includes(name)) next.push(name);
			this.#removedOwnedNames.delete(name);
		}
		if (next.length !== active.length) this.#pi.setActiveTools(next);
	}
}
