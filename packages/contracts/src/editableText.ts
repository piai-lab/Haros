// Shared byte boundary for local UTF-8 text edited through the Web UI.
// A single lazily projected document stays below the 2 MiB WebSocket frame
// ceiling with room for RPC metadata and JSON escaping.
export const EDITABLE_TEXT_FILE_MAX_BYTES = 1_000_000;
