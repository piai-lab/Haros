// Shared byte boundary for local UTF-8 text edited through the Web UI. Callers
// must also reject the C0 controls below: otherwise JSON escaping can expand a
// byte into six bytes and exceed the existing 2 MiB WebSocket admission limit.
export const EDITABLE_TEXT_FILE_MAX_BYTES = 1_000_000;

// OmniMind exposes two independently editable prompt segments. A stable 8 KiB
// bound per segment keeps their combined worst-case byte contribution within
// half of the smallest currently supported 32k-token model context even under
// the conservative one-token-per-byte estimate, leaving the other half for the
// native builder, tools, project context, skills, and conversation. It also
// leaves ample headroom below the existing 2 MiB WebSocket ceiling. This is a
// conservative cross-tokenizer engineering boundary, not a token-count claim.
export const OMNIMIND_AGENT_PROMPT_MAX_BYTES = 8 * 1024;

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

// TextEncoder and Buffer replace isolated UTF-16 surrogate code units with the
// replacement character. Reject them at the Prompt boundary so accepted text
// round-trips through UTF-8 persistence without silent content changes.
export function hasUnpairedUtf16Surrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

export function isEditableTextContent(value: string): boolean {
  return (
    !hasDisallowedEditableTextControl(value) &&
    editableTextByteLength(value) <= EDITABLE_TEXT_FILE_MAX_BYTES
  );
}

export function isOmniMindAgentPromptContent(value: string): boolean {
  return (
    !hasDisallowedEditableTextControl(value) &&
    !hasUnpairedUtf16Surrogate(value) &&
    editableTextByteLength(value) <= OMNIMIND_AGENT_PROMPT_MAX_BYTES
  );
}
