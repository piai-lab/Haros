import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appendSourceDirectory,
  collectSearchSources,
  formatArtifactHint,
} from "../search-result.ts";

test("canonical result projection keeps all sources in stable first-seen order", () => {
  const results = [
    {
      query: "first",
      answer: "First answer",
      results: [
        { title: "Shared", url: "https://example.com/shared", snippet: "First snippet" },
        { title: "One", url: "https://example.com/one", snippet: "One snippet" },
      ],
      error: null,
    },
    {
      query: "second",
      answer: "Second answer",
      results: [
        { title: "Shared duplicate", url: "https://example.com/shared", snippet: "Duplicate" },
        ...Array.from({ length: 18 }, (_, index) => ({
          title: `Source ${index + 2}`,
          url: `https://example.com/${index + 2}`,
          snippet: "",
        })),
      ],
      error: null,
    },
  ];
  const sources = collectSearchSources(results);
  assert.equal(sources.length, 20);
  assert.equal(sources[0].title, "Shared");
  assert.equal(sources[1].url, "https://example.com/one");

  const output = appendSourceDirectory("Semantic summary.", results);
  assert.match(output, /Semantic summary/);
  assert.equal((output.match(/https:\/\/example\.com\/shared/g) ?? []).length, 1);
  assert.match(output, /https:\/\/example\.com\/19/);
  assert.doesNotMatch(output, /\.\.\. and \d+ more/);
  assert.match(formatArtifactHint("artifact-id", 4, "get_search_content"), /Query indexes: 0-3/);
});
