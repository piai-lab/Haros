// FILE: serverHttpProxy.ts
// Purpose: Keeps the Server's global fetch dispatcher aligned with its explicit proxy env.
// Exports: installServerEnvProxyDispatcher.

import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

const PROXY_ENV_KEYS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"] as const;

function hasConfiguredHttpProxy(env: NodeJS.ProcessEnv): boolean {
  return PROXY_ENV_KEYS.some((key) => Boolean(env[key]?.trim()));
}

/**
 * Loading npm undici initializes its own direct global dispatcher and can replace Node's
 * startup env-proxy dispatcher. Re-assert the same explicit env authority after static
 * Server dependencies have loaded so Pi OAuth and engine fetches share one transport.
 */
export function installServerEnvProxyDispatcher(
  env: NodeJS.ProcessEnv = process.env,
  install: () => void = () => setGlobalDispatcher(new EnvHttpProxyAgent()),
): boolean {
  if (!hasConfiguredHttpProxy(env)) return false;
  install();
  return true;
}
