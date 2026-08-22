import { AsyncLocalStorage } from "node:async_hooks";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getWebSearchConfigService, type WebSearchConfigService } from "./config-service.ts";

export type WebAccessRuntimeProfile = "omnimind" | "upstream";

export interface WebAccessInstanceContext {
	readonly configService: WebSearchConfigService;
	readonly profile: WebAccessRuntimeProfile;
	readonly maps: Map<string, Map<unknown, unknown>>;
	readonly values: Map<string, unknown>;
}

const instanceStorage = new AsyncLocalStorage<WebAccessInstanceContext>();

function legacyAgentDir(): string {
	if (process.env.PI_CODING_AGENT_DIR) return process.env.PI_CODING_AGENT_DIR;
	if (process.env.XDG_CONFIG_HOME) return join(process.env.XDG_CONFIG_HOME, "pi");
	return join(homedir(), ".pi");
}

export function currentWebAccessContext(): WebAccessInstanceContext | undefined {
	return instanceStorage.getStore();
}

export function currentWebSearchConfigService(): WebSearchConfigService {
	const active = currentWebAccessContext();
	if (active) return active.configService;
	// Upstream tests and direct module consumers can change their Pi directory
	// between calls. Product instances never take this path: their canonical
	// service is injected once when the Session extension is composed.
	return getWebSearchConfigService(legacyAgentDir());
}

export function createWebAccessInstanceContext(input: {
	readonly configService: WebSearchConfigService;
	readonly profile: WebAccessRuntimeProfile;
}): WebAccessInstanceContext {
	return {
		...input,
		maps: new Map(),
		values: new Map(),
	};
}

export function runWithWebAccessContext<T>(context: WebAccessInstanceContext, run: () => T): T {
	return instanceStorage.run(context, run);
}

/** Bind non-Pi EventEmitter callbacks to the Extension instance that created them. */
export function bindToCurrentWebAccessContext<T extends (...args: never[]) => unknown>(
	callback: T,
): T {
	const context = currentWebAccessContext();
	if (!context) return callback;
	return ((...args: Parameters<T>) =>
		runWithWebAccessContext(context, () => callback(...args))) as T;
}

export function clearCurrentWebAccessInstance(): void {
	const context = currentWebAccessContext();
	if (!context) return;
	for (const map of context.maps.values()) map.clear();
	context.maps.clear();
	context.values.clear();
}

function currentMap<K, V>(key: string, legacy: Map<K, V>): Map<K, V> {
	const context = currentWebAccessContext();
	if (!context) return legacy;
	let map = context.maps.get(key);
	if (!map) {
		map = new Map();
		context.maps.set(key, map);
	}
	return map as Map<K, V>;
}

export function scopedMap<K, V>(key: string): Map<K, V> {
	const legacy = new Map<K, V>();
	return new Proxy(legacy, {
		get(_target, property) {
			const map = currentMap<K, V>(key, legacy);
			const value = Reflect.get(map, property, map) as unknown;
			return typeof value === "function" ? value.bind(map) : value;
		},
		set(_target, property, value) {
			return Reflect.set(currentMap<K, V>(key, legacy), property, value);
		},
	});
}

export function scopedValue<T>(key: string, initial: () => T): { value: T } {
	let legacy = initial();
	return {
		get value() {
			const context = currentWebAccessContext();
			if (!context) return legacy;
			if (!context.values.has(key)) context.values.set(key, initial());
			return context.values.get(key) as T;
		},
		set value(value: T) {
			const context = currentWebAccessContext();
			if (!context) {
				legacy = value;
				return;
			}
			context.values.set(key, value);
		},
	};
}

function bindCallback<T extends (...args: never[]) => unknown>(
	context: WebAccessInstanceContext,
	callback: T,
): T {
	return runWithWebAccessContext(context, () => bindToCurrentWebAccessContext(callback));
}

function bindCallbackFields<T extends Record<string, unknown>>(
	context: WebAccessInstanceContext,
	value: T,
): T {
	return Object.fromEntries(
		Object.entries(value).map(([key, field]) => [
			key,
			typeof field === "function" ? bindCallback(context, field as never) : field,
		]),
	) as T;
}

/**
 * Pi owns registration. This adapter only preserves the exact Extension instance
 * across Pi-owned callbacks and promise continuations.
 */
export function bindExtensionApiToWebAccessContext(
	pi: ExtensionAPI,
	context: WebAccessInstanceContext,
): ExtensionAPI {
	return new Proxy(pi, {
		get(target, property, receiver) {
			if (property === "registerTool") {
				return (definition: Record<string, unknown>) =>
				target.registerTool(bindCallbackFields(context, definition) as never);
			}
			if (property === "registerCommand") {
				return (name: string, definition: Record<string, unknown>) =>
				target.registerCommand(name, bindCallbackFields(context, definition) as never);
			}
			if (property === "registerShortcut") {
				return (shortcut: never, definition: Record<string, unknown>) =>
				target.registerShortcut(shortcut, bindCallbackFields(context, definition) as never);
			}
			if (property === "on") {
				return (event: never, handler: (...args: never[]) => unknown) =>
				target.on(event, bindCallback(context, handler) as never);
			}
			const value = Reflect.get(target, property, receiver) as unknown;
			return typeof value === "function" ? value.bind(target) : value;
		},
	});
}
