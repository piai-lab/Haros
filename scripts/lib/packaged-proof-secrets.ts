// FILE: packaged-proof-secrets.ts
// Purpose: Keeps packaged proof diagnostics credential-blind.
// Layer: Release verification

export function redactPackagedProofSecrets(value: string): string {
  return value.replace(/([?&](?:token|auth|key)=)[^&#\s)]+/giu, "$1<redacted>");
}
