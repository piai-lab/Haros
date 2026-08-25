// Canonical Product User Input safety guards shared by request and terminal schemas.

export const CANONICAL_USER_INPUT_MAX_UTF8_BYTES = 1024 * 1024;
export const CANONICAL_USER_INPUT_MAX_NODES = 10_000;

export function canonicalUserInputUtf8Bytes(value: unknown): number {
  const json = JSON.stringify(value);
  return json === undefined ? 0 : new TextEncoder().encode(json).byteLength;
}

export function canonicalUserInputPayloadFits(value: unknown): boolean {
  return canonicalUserInputUtf8Bytes(value) <= CANONICAL_USER_INPUT_MAX_UTF8_BYTES;
}
