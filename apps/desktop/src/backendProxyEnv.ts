// FILE: backendProxyEnv.ts
// Purpose: Projects Electron's resolved desktop proxy into the bundled Node backend.
// Exports: resolveBackendProxyEnvironment.

const LOOPBACK_NO_PROXY_ENTRIES = ["localhost", "127.0.0.1", "::1"] as const;

function firstProxyDirective(proxyRules: string): string | null {
  const first = proxyRules.split(";", 1)[0]?.trim().replace(/\s+/g, " ");
  return first && first.length > 0 ? first : null;
}

export function proxyDirectiveToUrl(proxyRules: string): string | null {
  const directive = firstProxyDirective(proxyRules);
  if (!directive || directive.toUpperCase() === "DIRECT") return null;

  const separator = directive.indexOf(" ");
  if (separator <= 0) return null;
  const kind = directive.slice(0, separator).toUpperCase();
  const authority = directive.slice(separator + 1).trim();
  const scheme = kind === "PROXY" || kind === "HTTP" ? "http" : kind === "HTTPS" ? "https" : null;
  if (!scheme || !authority) return null;

  try {
    const url = new URL(`${scheme}://${authority}`);
    if (url.username || url.password || !url.hostname || !url.port || url.pathname !== "/") {
      return null;
    }
    return url.toString().replace(/\/$/u, "");
  } catch {
    return null;
  }
}

function mergeLoopbackNoProxy(env: NodeJS.ProcessEnv): string {
  const entries = [env.NO_PROXY, env.no_proxy]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const normalized = new Set(entries.map((entry) => entry.toLowerCase()));
  for (const entry of LOOPBACK_NO_PROXY_ENTRIES) {
    if (!normalized.has(entry)) entries.push(entry);
  }
  return entries.join(",");
}

/**
 * Node 24 only honors proxy environment variables when its env-proxy support is enabled.
 * Explicit user proxy variables remain authoritative. Otherwise, use the exact HTTPS proxy
 * Electron resolved through the operating system for the OAuth origin.
 */
export async function resolveBackendProxyEnvironment(
  env: NodeJS.ProcessEnv,
  resolveProxy: (url: string) => Promise<string>,
): Promise<NodeJS.ProcessEnv> {
  const explicitProxy =
    env.HTTPS_PROXY ?? env.https_proxy ?? env.ALL_PROXY ?? env.all_proxy ?? null;
  const systemProxy = explicitProxy
    ? null
    : proxyDirectiveToUrl(await resolveProxy("https://auth.openai.com/"));
  if (!explicitProxy && !systemProxy) return {};

  const noProxy = mergeLoopbackNoProxy(env);
  return {
    ...(systemProxy ? { HTTPS_PROXY: systemProxy } : {}),
    ...(env.NODE_USE_ENV_PROXY === undefined ? { NODE_USE_ENV_PROXY: "1" } : {}),
    NO_PROXY: noProxy,
    no_proxy: noProxy,
  };
}
