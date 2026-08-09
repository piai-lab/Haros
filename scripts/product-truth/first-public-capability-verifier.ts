import { createHash } from "node:crypto";
import * as FS from "node:fs";
import * as Path from "node:path";

const SOURCE = Path.resolve(
  import.meta.dirname,
  "../../.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v7.md",
);
const FENCE = /```omp-flow-b1-verifier-universe-v1\n([\s\S]*?)\n```/u;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface FirstPublicCase {
  readonly id: string;
  readonly owner: string;
  readonly family: "normal" | "fault" | "race" | "kill";
  readonly stateId: string;
  readonly operationOrBarrierId: string;
  readonly site: string;
  readonly ordinal: number | "single";
  readonly convergenceStateId: string | "none";
}

export interface FirstPublicManifest {
  readonly sourcePath: string;
  readonly ownerCount: number;
  readonly operationCount: number;
  readonly stateCount: number;
  readonly cases: readonly FirstPublicCase[];
}

interface OwnerDefinition {
  readonly owner: string;
  readonly operations: readonly { readonly id: string }[];
  readonly barriers: readonly { readonly id: string }[];
  readonly killAfter: readonly string[];
}

interface FixtureDefinition {
  readonly owner: string;
  readonly definitionSha256: string;
  readonly normalStateIds: readonly string[];
  readonly faultStateId: string;
  readonly states: readonly { readonly id: string; readonly resources?: Record<string, unknown> }[];
  readonly stateDefaults?: { readonly resources?: Record<string, unknown> };
  readonly iterationBindings: readonly {
    readonly operationId?: string;
    readonly operationIds?: readonly string[];
    readonly derive: string;
  }[];
  readonly [key: string]: unknown;
}

interface Catalog extends Record<string, unknown> {
  readonly owners: readonly OwnerDefinition[];
  readonly fixtureStateCatalog: readonly FixtureDefinition[];
  readonly raceCaseCatalog: readonly {
    readonly barrierId: string;
    readonly stateId: string;
    readonly ordinalOperationId: string;
  }[];
  readonly killCaseCatalog: readonly {
    readonly operationId: string;
    readonly stateId: string;
    readonly convergenceStateId: string;
  }[];
  readonly fixtureCatalogSha256: string;
  readonly caseIdentityCanonicalization: {
    readonly expandedRaceCaseCount: number;
    readonly expandedKillCaseCount: number;
    readonly raceKillCaseIdentitySha256: string;
  };
}

function canonical(value: Json): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key]!)}`)
    .join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function extractCatalog(): Catalog {
  const match = FENCE.exec(FS.readFileSync(SOURCE, "utf8"));
  if (!match) throw new Error("FIRST_PUBLIC_CATALOG_MISSING");
  const catalog = JSON.parse(match[1]!) as Catalog;
  if (!Array.isArray(catalog.owners) || !Array.isArray(catalog.fixtureStateCatalog))
    throw new Error("FIRST_PUBLIC_CATALOG_INVALID");
  return catalog;
}

function verifyCatalog(catalog: Catalog): void {
  const ownerNames = catalog.owners.map((owner) => owner.owner);
  const fixtureNames = catalog.fixtureStateCatalog.map((owner) => owner.owner);
  if (new Set(ownerNames).size !== ownerNames.length || canonical(ownerNames) !== canonical(fixtureNames))
    throw new Error("FIRST_PUBLIC_OWNER_BIJECTION_INVALID");
  for (const fixture of catalog.fixtureStateCatalog) {
    const { definitionSha256, ...definition } = fixture;
    if (sha256(canonical(definition as Json)) !== definitionSha256)
      throw new Error(`FIRST_PUBLIC_OWNER_DIGEST_INVALID:${fixture.owner}`);
  }
  const digestInput = catalog.fixtureStateCatalog
    .map((fixture) => `${fixture.owner}\t${fixture.definitionSha256}\n`)
    .join("");
  if (sha256(digestInput) !== catalog.fixtureCatalogSha256)
    throw new Error("FIRST_PUBLIC_FIXTURE_CATALOG_DIGEST_INVALID");
}

function resources(fixture: FixtureDefinition, stateId: string): Record<string, unknown> {
  const state = fixture.states.find((candidate) => candidate.id === stateId);
  if (!state) throw new Error(`FIRST_PUBLIC_STATE_MISSING:${stateId}`);
  return { ...(fixture.stateDefaults?.resources ?? {}), ...(state.resources ?? {}) };
}

function numberResource(value: Record<string, unknown>, key: string): number {
  const result = value[key];
  if (!Number.isSafeInteger(result) || Number(result) < 0)
    throw new Error(`FIRST_PUBLIC_RESOURCE_INVALID:${key}`);
  return Number(result);
}

function arrayResource(value: Record<string, unknown>, key: string): readonly unknown[] {
  const result = value[key];
  if (!Array.isArray(result)) throw new Error(`FIRST_PUBLIC_RESOURCE_INVALID:${key}`);
  return result;
}

function numberArrayResource(value: Record<string, unknown>, key: string): readonly number[] {
  const result = arrayResource(value, key);
  if (!result.every((item) => Number.isSafeInteger(item) && Number(item) >= 0))
    throw new Error(`FIRST_PUBLIC_RESOURCE_INVALID:${key}`);
  return result.map(Number);
}

function ordinalCount(fixture: FixtureDefinition, stateId: string, operationId: string): number {
  const binding = fixture.iterationBindings.find(
    (candidate) =>
      candidate.operationId === operationId || candidate.operationIds?.includes(operationId),
  );
  if (!binding) return 1;
  const value = resources(fixture, stateId);
  switch (binding.derive) {
    case "sourceDataChunkCount-plus-one-terminal-eof": return numberResource(value, "sourceDataChunkCount") + 1;
    case "sourceDataChunkCount": return numberResource(value, "sourceDataChunkCount");
    case "protectedAggregateQueryCount": return numberResource(value, "protectedAggregateQueryCount");
    case "orderedEntryKinds.length": return arrayResource(value, "orderedEntryKinds").length;
    case "sum-entryDataChunkCounts-plus-orderedEntryKinds.length-terminal-eofs":
      return numberArrayResource(value, "entryDataChunkCounts").reduce((sum, count) => sum + count, 0) + arrayResource(value, "orderedEntryKinds").length;
    case "sum-entryDataChunkCounts": return numberArrayResource(value, "entryDataChunkCounts").reduce((sum, count) => sum + count, 0);
    case "exactLegacyKeyCount": return numberResource(value, "exactLegacyKeyCount");
    case "exactKeyOrder.length": return arrayResource(value, "exactKeyOrder").length;
    case "orderedLockPathCount": return numberResource(value, "orderedLockPathCount");
    case "existingRecordKinds.length-when-the-selected-record-kind-reaches-the-operation-otherwise-zero": return arrayResource(value, "existingRecordKinds").length;
    case "ancestorCount": return numberResource(value, "ancestorCount");
    case "targetDataChunkCounts.length": return arrayResource(value, "targetDataChunkCounts").length;
    case "sum-targetDataChunkCounts-plus-targetDataChunkCounts.length-terminal-eofs":
      return numberArrayResource(value, "targetDataChunkCounts").reduce((sum, count) => sum + count, 0) + arrayResource(value, "targetDataChunkCounts").length;
    case "processProbeCount": return numberResource(value, "processProbeCount");
    case "databaseMemberCount": return numberResource(value, "databaseMemberCount");
    case "legacyFileCount": return numberResource(value, "legacyFileCount");
    case "packageTransitionCount": return numberResource(value, "packageTransitionCount");
    case "protectedExclusionChunkCounts.length": return arrayResource(value, "protectedExclusionChunkCounts").length;
    case "sum-protectedExclusionChunkCounts-plus-protectedExclusionChunkCounts.length-terminal-eofs":
      return numberArrayResource(value, "protectedExclusionChunkCounts").reduce((sum, count) => sum + count, 0) + arrayResource(value, "protectedExclusionChunkCounts").length;
    case "stateDefaults.resources.schemaStatementCount-only-for-product.clean-absence-otherwise-zero":
      return stateId === "product.clean-absence" ? numberResource(value, "schemaStatementCount") : 0;
    case "stateDefaults.resources.validationQueryCount-only-when-current-is-exact-g1-or-clean-create-committed-otherwise-zero":
      return stateId.endsWith("clean-absence") || stateId.endsWith("existing-exact") ? numberResource(value, "validationQueryCount") : 0;
    case "stateDefaults.resources.schemaStatementCount-only-for-service.clean-absence-otherwise-zero":
      return stateId === "service.clean-absence" ? numberResource(value, "schemaStatementCount") : 0;
    default: throw new Error(`FIRST_PUBLIC_DERIVATION_UNSUPPORTED:${binding.derive}`);
  }
}

function ordinalIdentities(
  fixture: FixtureDefinition,
  stateId: string,
  operationId: string,
): readonly (number | "single")[] {
  const bound = fixture.iterationBindings.some(
    (candidate) =>
      candidate.operationId === operationId || candidate.operationIds?.includes(operationId),
  );
  const count = ordinalCount(fixture, stateId, operationId);
  return bound ? Array.from({ length: count }, (_, ordinal) => ordinal) : ["single"];
}

function makeCase(
  owner: string,
  family: FirstPublicCase["family"],
  stateId: string,
  operationOrBarrierId: string,
  site: string,
  ordinal: number | "single",
  convergenceStateId: string | "none" = "none",
): FirstPublicCase {
  const id = [owner, family, stateId, operationOrBarrierId, site, ordinal, convergenceStateId].join("::");
  return { id, owner, family, stateId, operationOrBarrierId, site, ordinal, convergenceStateId };
}

export function generateFirstPublicManifest(): FirstPublicManifest {
  const catalog = extractCatalog();
  verifyCatalog(catalog);
  const fixtures = new Map(catalog.fixtureStateCatalog.map((fixture) => [fixture.owner, fixture]));
  const cases: FirstPublicCase[] = [];
  for (const owner of catalog.owners) {
    const fixture = fixtures.get(owner.owner)!;
    for (const stateId of fixture.normalStateIds)
      cases.push(makeCase(owner.owner, "normal", stateId, "none", "normal", "single"));
    for (const operation of owner.operations) {
      for (const site of ["before", "after"] as const) {
        for (const ordinal of ordinalIdentities(fixture, fixture.faultStateId, operation.id))
          cases.push(makeCase(owner.owner, "fault", fixture.faultStateId, operation.id, site, ordinal));
      }
    }
  }
  for (const race of catalog.raceCaseCatalog) {
    const owner = catalog.owners.find((candidate) => candidate.barriers.some((barrier) => barrier.id === race.barrierId));
    if (!owner) throw new Error(`FIRST_PUBLIC_RACE_OWNER_MISSING:${race.barrierId}`);
    const fixture = fixtures.get(owner.owner)!;
    for (const ordinal of ordinalIdentities(fixture, race.stateId, race.ordinalOperationId))
      cases.push(makeCase(owner.owner, "race", race.stateId, race.barrierId, "race", ordinal));
  }
  for (const kill of catalog.killCaseCatalog) {
    const owner = catalog.owners.find((candidate) => candidate.killAfter.includes(kill.operationId));
    if (!owner) throw new Error(`FIRST_PUBLIC_KILL_OWNER_MISSING:${kill.operationId}`);
    const fixture = fixtures.get(owner.owner)!;
    for (const ordinal of ordinalIdentities(fixture, kill.stateId, kill.operationId))
      cases.push(makeCase(owner.owner, "kill", kill.stateId, kill.operationId, "kill-after", ordinal, kill.convergenceStateId));
  }
  const ids = cases.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("FIRST_PUBLIC_CASE_DUPLICATE");
  const raceIds = cases.filter((item) => item.family === "race").map((item) => item.id).sort();
  const killIds = cases.filter((item) => item.family === "kill").map((item) => item.id).sort();
  const raceKillIds = [...raceIds, ...killIds];
  if (
    raceIds.length !== catalog.caseIdentityCanonicalization.expandedRaceCaseCount ||
    killIds.length !== catalog.caseIdentityCanonicalization.expandedKillCaseCount ||
    sha256(canonical(raceKillIds)) !== catalog.caseIdentityCanonicalization.raceKillCaseIdentitySha256
  ) throw new Error("FIRST_PUBLIC_RACE_KILL_IDENTITY_INVALID");
  return {
    sourcePath: SOURCE,
    ownerCount: catalog.owners.length,
    operationCount: catalog.owners.reduce((sum, owner) => sum + owner.operations.length, 0),
    stateCount: catalog.fixtureStateCatalog.reduce((sum, fixture) => sum + fixture.states.length, 0),
    cases: cases.sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function assertExecutedCaseBijection(
  manifest: FirstPublicManifest,
  executedCaseIds: readonly string[],
): void {
  const expected = manifest.cases.map((item) => item.id).sort();
  const actual = [...executedCaseIds].sort();
  if (new Set(actual).size !== actual.length || canonical(actual) !== canonical(expected))
    throw new Error("FIRST_PUBLIC_EXECUTION_BIJECTION_INVALID");
}
