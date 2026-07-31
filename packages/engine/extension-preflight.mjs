import { readFile } from "node:fs/promises";
import path from "node:path";
import { verifyGeneration } from "./artifact-generation.mjs";

const MANIFEST_NAME = "extension.json";
const HOST_BEHAVIOR_CODES = new Map([
  ["provider-control", "PROVIDER_CONTROL_REJECTED"],
  ["session-control", "SESSION_CONTROL_REJECTED"],
  ["builtin-interception", "BUILTIN_INTERCEPTION_REJECTED"],
  ["raw-ui", "RAW_UI_REJECTED"],
]);

function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function safeEntry(entry) {
  if (typeof entry !== "string" || entry.length === 0 || path.isAbsolute(entry)) return false;
  const normalized = path.posix.normalize(entry.replaceAll("\\", "/"));
  return normalized === entry.replaceAll("\\", "/") && !normalized.startsWith("../");
}

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, details });
}

export async function preflightExtension({
  generation,
  allowedPermissions = [],
  allowedCapabilities = [],
  apiVersion = 1,
}) {
  const findings = [];
  let manifest;

  try {
    await verifyGeneration(generation);
  } catch (error) {
    addFinding(findings, error.code ?? "GENERATION_INVALID", error.message);
  }

  try {
    manifest = JSON.parse(
      await readFile(path.join(generation.path, MANIFEST_NAME), "utf8"),
    );
  } catch (error) {
    addFinding(findings, "MANIFEST_INVALID", "extension manifest is not valid JSON", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (!manifest) {
    return {
      generationId: generation.generationId,
      digest: generation.digest,
      lineage: generation.lineage,
      verdict: "rejected",
      findings,
    };
  }

  if (manifest.formatVersion !== 1) {
    addFinding(findings, "FORMAT_UNSUPPORTED", "extension format version is unsupported");
  }
  if (manifest.apiVersion !== apiVersion) {
    addFinding(findings, "API_VERSION_UNSUPPORTED", "extension API version is unsupported");
  }
  if (typeof manifest.id !== "string" || manifest.id.length === 0) {
    addFinding(findings, "IDENTITY_INVALID", "extension id is missing");
  }
  if (
    !safeEntry(manifest.entry) ||
    path.extname(manifest.entry ?? "") !== ".mjs" ||
    path.posix.dirname(manifest.entry.replaceAll("\\", "/")) !== "."
  ) {
    addFinding(findings, "ENTRY_INVALID", "extension entry must be a public root module");
  }
  if (manifest.headless !== true) {
    addFinding(findings, "HEADLESS_UNSUPPORTED", "extension must support headless loading");
  }
  if (manifest.stateAuthority !== "none") {
    addFinding(
      findings,
      "SECOND_STATE_AUTHORITY_REJECTED",
      "extension must not own product state authority",
    );
  }

  if (!stringArray(manifest.lifecycleScripts)) {
    addFinding(findings, "LIFECYCLE_DECLARATION_INVALID", "lifecycle scripts must be an array");
  } else if (manifest.lifecycleScripts.length > 0) {
    addFinding(findings, "INSTALL_MUTATION_REJECTED", "lifecycle mutation is not allowed");
  }

  if (!stringArray(manifest.nativeDependencies)) {
    addFinding(findings, "NATIVE_DEPENDENCY_DECLARATION_INVALID", "native dependencies must be an array");
  } else if (manifest.nativeDependencies.length > 0) {
    addFinding(findings, "NATIVE_DEPENDENCY_REJECTED", "native dependencies require a separate decision");
  }

  const permissions = stringArray(manifest.permissions) ? manifest.permissions : [];
  if (!stringArray(manifest.permissions)) {
    addFinding(findings, "PERMISSION_DECLARATION_INVALID", "permissions must be an array");
  }
  const allowedPermissionSet = new Set(allowedPermissions);
  const permissionExpansion = permissions.filter((permission) => !allowedPermissionSet.has(permission));
  if (permissionExpansion.length > 0) {
    addFinding(findings, "PERMISSION_EXPANSION_REJECTED", "permissions exceed the trust envelope", {
      permissions: permissionExpansion,
    });
  }

  const capabilities = stringArray(manifest.capabilities) ? manifest.capabilities : [];
  if (!stringArray(manifest.capabilities)) {
    addFinding(findings, "CAPABILITY_DECLARATION_INVALID", "capabilities must be an array");
  }
  const allowedCapabilitySet = new Set(allowedCapabilities);
  const capabilityExpansion = capabilities.filter(
    (capability) => !allowedCapabilitySet.has(capability),
  );
  if (capabilityExpansion.length > 0) {
    addFinding(findings, "CAPABILITY_EXPANSION_REJECTED", "capabilities exceed the trust envelope", {
      capabilities: capabilityExpansion,
    });
  }

  if (!stringArray(manifest.hostBehaviors)) {
    addFinding(findings, "HOST_BEHAVIOR_DECLARATION_INVALID", "host behaviors must be an array");
  } else {
    for (const behavior of manifest.hostBehaviors) {
      const code = HOST_BEHAVIOR_CODES.get(behavior);
      if (code) addFinding(findings, code, `host behavior is outside the bridge: ${behavior}`);
    }
  }

  const report = {
    generationId: generation.generationId,
    digest: generation.digest,
    lineage: generation.lineage,
    artifactId: typeof manifest.id === "string" ? manifest.id : null,
    entry: safeEntry(manifest.entry) ? manifest.entry : null,
    permissions,
    capabilities,
    verdict: findings.length === 0 ? "supported" : "rejected",
    findings,
  };

  return report;
}
