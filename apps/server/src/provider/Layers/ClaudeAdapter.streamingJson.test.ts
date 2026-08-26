import { afterEach, describe, expect, it, vi } from "vitest";

import { tryParseCompleteJsonRecord } from "./ClaudeAdapter";

afterEach(() => vi.restoreAllMocks());

describe("Claude streamed tool JSON", () => {
  it("does not call JSON.parse until an object can be complete", () => {
    const parse = vi.spyOn(JSON, "parse");
    expect(tryParseCompleteJsonRecord('{"path":"src')).toBeUndefined();
    expect(parse).not.toHaveBeenCalled();

    expect(tryParseCompleteJsonRecord('{"path":"src"}')).toEqual({
      value: { path: "src" },
      serialized: '{"path":"src"}',
    });
    expect(parse).toHaveBeenCalledOnce();
  });

  it("rejects complete arrays and malformed object-looking values", () => {
    expect(tryParseCompleteJsonRecord('[{"path":"src"}]')).toBeUndefined();
    expect(tryParseCompleteJsonRecord("{bad}")).toBeUndefined();
  });
});
