// Shared byte boundary for local UTF-8 text edited through the Web UI. Callers
// must also reject the C0 controls below: otherwise JSON escaping can expand a
// byte into six bytes and exceed the existing 2 MiB WebSocket admission limit.
export const EDITABLE_TEXT_FILE_MAX_BYTES = 1_000_000;

export function editableTextByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function hasDisallowedEditableTextControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) return true;
  }
  return false;
}

export function isEditableTextContent(value: string): boolean {
  return (
    !hasDisallowedEditableTextControl(value) &&
    editableTextByteLength(value) <= EDITABLE_TEXT_FILE_MAX_BYTES
  );
}
