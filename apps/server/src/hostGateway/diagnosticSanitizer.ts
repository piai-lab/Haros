import { redactSensitiveProcessArgs } from "../processArgumentRedaction.ts";
import { isEngineCredentialKey } from "../engine/engineChildEnvironment.ts";

const EXACT_SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "credential",
  "credentials",
  "password",
  "passphrase",
  "privatekey",
  "proxyauthorization",
  "setcookie",
]);
const SENSITIVE_TERMINAL_TOKENS = new Set([
  "authorization",
  "cookie",
  "credential",
  "credentials",
  "passphrase",
  "password",
  "secret",
  "token",
]);
const MAX_STRING_CHARS = 4_000;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 5;

function keyTokens(key: string): ReadonlyArray<string> {
  return (
    key
      .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2")
      .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
      .toLowerCase()
      .match(/[a-z0-9]+/gu) ?? []
  );
}

function isSensitiveKey(key: string): boolean {
  if (isEngineCredentialKey(key)) return true;
  const normalized = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
  if (EXACT_SENSITIVE_KEYS.has(normalized)) return true;
  const tokens = keyTokens(key);
  const terminal = tokens.at(-1);
  return (
    terminal !== undefined &&
    (SENSITIVE_TERMINAL_TOKENS.has(terminal) ||
      (terminal === "key" &&
        tokens.slice(0, -1).some((token) => ["api", "private", "proxy", "secret"].includes(token))))
  );
}

function isSensitiveEnvironmentTuple(value: ReadonlyArray<unknown>): boolean {
  return value.length === 2 && typeof value[0] === "string" && isSensitiveKey(value[0]);
}

function redactSensitiveDiagnosticString(value: string): string {
  return redactSensitiveProcessArgs(value)
    .replace(
      /\b((?:authorization|proxy-authorization)\s*:\s*)(?:(?:basic|bearer)\s+)?[^\s,;]+/giu,
      "$1[redacted]",
    )
    .replace(
      /([?&](?:access[-_]?token|api[-_]?key|auth|authorization|cookie|credential|password|secret|token)=)[^&#\s]*/giu,
      "$1[redacted]",
    )
    .replace(
      /\b((?:access[-_]?token|api[-_]?key|auth|authorization|cookie|credential|password|secret|token)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;&]+)/giu,
      "$1[redacted]",
    )
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/giu, "$1[redacted]@");
}

export function sanitizeDiagnosticValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    const redacted = redactSensitiveDiagnosticString(value);
    return redacted.length <= MAX_STRING_CHARS
      ? redacted
      : `${redacted.slice(0, MAX_STRING_CHARS)}… [truncated ${redacted.length - MAX_STRING_CHARS} chars]`;
  }
  if (depth >= MAX_DEPTH) return "[depth limit]";
  if (Array.isArray(value)) {
    if (isSensitiveEnvironmentTuple(value)) {
      return [value[0], "[redacted]"];
    }
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => sanitizeDiagnosticValue(entry, depth + 1));
  }
  if (typeof value !== "object") return String(value);
  const record = value as Record<string, unknown>;
  const namedValueIsSensitive = typeof record.name === "string" && isSensitiveKey(record.name);
  return Object.fromEntries(
    Object.entries(record)
      .slice(0, MAX_OBJECT_KEYS)
      .map(([key, entry]) => [
        key,
        isSensitiveKey(key) || (namedValueIsSensitive && key === "value")
          ? "[redacted]"
          : sanitizeDiagnosticValue(entry, depth + 1),
      ]),
  );
}
