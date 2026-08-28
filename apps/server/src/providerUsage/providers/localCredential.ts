// FILE: providerUsage/providers/localCredential.ts
// Purpose: Usage fetchers for engines that expose a local login but no
// individual live quota API (Droid and Kilo). Connected accounts still appear
// in Settings → Usage; unsigned ones stay needs-auth.

import nodePath from "node:path";

import type { EngineKind } from "@harnessos/contracts";

import { getDroidApiKeyEnv } from "../../provider/acp/DroidAcpSupport";
import { resolveOpenCodeCompatibleAuthPaths } from "../../provider/openCodeAuthPaths";
import { credentialFingerprint, readJsonFile } from "../credentials";
import { asRecord, buildSnapshot, needsAuthSnapshot } from "../parse";
import type { EngineUsageContext, EngineUsageFetcher } from "../types";

async function jsonObjectHasKeys(path: string): Promise<boolean> {
  const parsed = asRecord(await readJsonFile(path));
  return parsed !== null && Object.keys(parsed).length > 0;
}

async function resolveDroidSignedIn(ctx: EngineUsageContext): Promise<string | null> {
  const apiKey = getDroidApiKeyEnv(ctx.env);
  if (apiKey) return `api:${credentialFingerprint(apiKey)}`;
  const factoryHome = nodePath.join(ctx.homeDir, ".factory");
  for (const fileName of ["auth.json", "session.json", "credentials.json"]) {
    const filePath = nodePath.join(factoryHome, fileName);
    if (await jsonObjectHasKeys(filePath)) {
      return `file:${fileName}`;
    }
  }
  return null;
}

async function resolveOpenCodeCompatibleSignedIn(
  ctx: EngineUsageContext,
  dataDirectoryName: string,
): Promise<string | null> {
  for (const authPath of resolveOpenCodeCompatibleAuthPaths({
    homeDir: ctx.homeDir,
    env: ctx.env,
    platform: ctx.platform,
    dataDirectoryName,
  })) {
    if (await jsonObjectHasKeys(authPath)) return `file:${authPath}`;
  }
  return null;
}

function localCredentialFetcher(input: {
  engine: EngineKind;
  source: string;
  detail: string;
  resolveSignedIn: (ctx: EngineUsageContext) => Promise<string | null>;
}): EngineUsageFetcher {
  return {
    engine: input.engine,
    async cacheKey(ctx) {
      return (await input.resolveSignedIn(ctx)) ?? `${ctx.homeDir}:none`;
    },
    async fetch(ctx) {
      const signedIn = await input.resolveSignedIn(ctx);
      if (!signedIn) {
        return needsAuthSnapshot(input.engine, ctx.nowMs, input.source);
      }
      return buildSnapshot({
        engine: input.engine,
        nowMs: ctx.nowMs,
        status: "ok",
        source: input.source,
        usageLines: [{ label: "Limits", value: input.detail }],
      });
    },
  };
}

export const droidUsageFetcher = localCredentialFetcher({
  engine: "droid",
  source: "droid-local",
  detail:
    "Droid is signed in locally. Individual rate limits stay in the Droid `/limits` command; Factory has no public personal quota API.",
  resolveSignedIn: resolveDroidSignedIn,
});

export const kiloUsageFetcher = localCredentialFetcher({
  engine: "kilo",
  source: "kilo-local",
  detail:
    "Kilo is signed in locally. It does not expose a live personal quota API, so remaining limits stay in the Kilo CLI.",
  resolveSignedIn: (ctx) => resolveOpenCodeCompatibleSignedIn(ctx, "kilo"),
});
