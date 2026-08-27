import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const indexUrl = new URL("../index.ts", import.meta.url).href;

function runChild(script, env) {
  const childEnv = { ...process.env };
  for (const key of [
    "PI_CODING_AGENT_DIR",
    "OPENAI_API_KEY",
    "EXA_API_KEY",
    "BRAVE_API_KEY",
    "TAVILY_API_KEY",
  ])
    delete childEnv[key];
  Object.assign(childEnv, env);
  return spawnSync(process.execPath, ["--input-type=module"], {
    input: script,
    encoding: "utf8",
    env: childEnv,
    maxBuffer: 2 * 1024 * 1024,
    timeout: 10_000,
  });
}

function extensionScript(provider, fetchImplementation) {
  return `
		let active = 0;
		let peak = 0;
		let distinctPeak = 0;
		${fetchImplementation}
		const { default: initializeExtension } = await import(${JSON.stringify(indexUrl)});
		const tools = [];
		initializeExtension({
			registerTool(tool) { tools.push(tool); },
			registerCommand() {}, registerShortcut() {}, on() {}, appendEntry() {}, sendMessage() {},
			exec() { return { code: 0 }; },
		});
		const tool = tools.find(({ name }) => name === "web_search");
		const result = await tool.execute("call", {
			queries: ["query 0", "query 1", "query 2", "query 3", "query 4"],
			provider: ${JSON.stringify(provider)},
			workflow: "none",
		});
		console.log(JSON.stringify({ peak, distinctPeak, text: result.content[0].text }));
	`;
}

test("named and broad routes use bounded query concurrency and preserve input order", async () => {
  const namedHome = await mkdtemp(join(tmpdir(), "web-search-query-named-"));
  const named = runChild(
    extensionScript(
      "openai",
      `
		globalThis.fetch = async (_url, init) => {
			active += 1; peak = Math.max(peak, active);
			const query = JSON.parse(init.body).input[0].content[0].text;
			const index = Number(query.at(-1));
			await new Promise((resolve) => setTimeout(resolve, (5 - index) * 8));
			active -= 1;
			return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: "answer " + index }] }] }), { status: 200 });
		};
	`,
    ),
    {
      HOME: namedHome,
      USERPROFILE: namedHome,
      PI_CODING_AGENT_DIR: namedHome,
      OPENAI_API_KEY: "synthetic",
    },
  );
  assert.equal(named.status, 0, named.stderr || named.error?.message);
  const namedOutput = JSON.parse(named.stdout.trim());
  assert.equal(namedOutput.peak, 3);
  for (let index = 0; index < 4; index++) {
    assert.ok(
      namedOutput.text.indexOf(`## Query: \"query ${index}\"`) <
        namedOutput.text.indexOf(`## Query: \"query ${index + 1}\"`),
    );
  }

  const broadHome = await mkdtemp(join(tmpdir(), "web-search-query-broad-"));
  await writeFile(join(broadHome, "web-search.json"), JSON.stringify({ provider: "broad" }) + "\n");
  const broad = runChild(
    extensionScript(
      "broad",
      `
		globalThis.fetch = async (url) => {
			if (!String(url).startsWith("https://mcp.exa.ai/mcp")) throw new Error("Unexpected fetch " + url);
			active += 1; peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 25));
			active -= 1;
			return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: "Title: Exa\\nURL: https://example.com/exa\\nText: answer\\n---" }] } }), { status: 200 });
		};
	`,
    ),
    { HOME: broadHome, USERPROFILE: broadHome, PI_CODING_AGENT_DIR: broadHome },
  );
  assert.equal(broad.status, 0, broad.stderr || broad.error?.message);
  assert.equal(JSON.parse(broad.stdout.trim()).peak, 2);
});

test("all-provider route serializes queries while preserving provider-internal fanout", async () => {
  const home = await mkdtemp(join(tmpdir(), "web-search-query-all-"));
  const child = runChild(
    extensionScript(
      "all",
      `
		globalThis.fetch = async (url) => {
			if (!String(url).startsWith("https://mcp.exa.ai/mcp")) throw new Error("Unexpected fetch " + url);
			active += 1; peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 20));
			active -= 1;
			return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: "Title: Exa\\nURL: https://example.com/exa\\nText: answer\\n---" }] } }), { status: 200 });
		};
	`,
    ),
    { HOME: home, USERPROFILE: home, PI_CODING_AGENT_DIR: home },
  );
  assert.equal(child.status, 0, child.stderr || child.error?.message);
  assert.equal(JSON.parse(child.stdout.trim()).peak, 1);
});

test("explicit provider arrays adapt query concurrency to bound total fanout", async () => {
  const fetchImplementation = `
		globalThis.fetch = async (url, init) => {
			active += 1; peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 20));
			active -= 1;
			const target = String(url);
			if (target.includes("api.openai.com")) {
				return new Response(JSON.stringify({ output: [
					{ type: "web_search_call", action: { sources: [] } },
					{ type: "message", content: [{ type: "output_text", text: "OpenAI answer" }] },
				] }), { status: 200 });
			}
			if (target.startsWith("https://mcp.exa.ai/mcp")) {
				return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: "Title: Exa\\nURL: https://example.com/exa\\nText: answer\\n---" }] } }), { status: 200 });
			}
			if (target.includes("api.search.brave.com")) {
				return new Response(JSON.stringify({ web: { results: [{ title: "Brave", url: "https://example.com/brave", description: "answer" }] } }), { status: 200 });
			}
			if (target.includes("api.tavily.com")) {
				return new Response(JSON.stringify({ answer: "Tavily answer", results: [{ title: "Tavily", url: "https://example.com/tavily", content: "answer" }] }), { status: 200 });
			}
			throw new Error("Unexpected fetch " + target);
		};
	`;
  const environment = {
    OPENAI_API_KEY: "synthetic",
    BRAVE_API_KEY: "synthetic",
    TAVILY_API_KEY: "synthetic",
  };

  const twoHome = await mkdtemp(join(tmpdir(), "web-search-query-array-two-"));
  const two = runChild(
    extensionScript(["openai", "exa"], fetchImplementation),
    { ...environment, HOME: twoHome, USERPROFILE: twoHome, PI_CODING_AGENT_DIR: twoHome },
  );
  assert.equal(two.status, 0, two.stderr || two.error?.message);
  assert.equal(JSON.parse(two.stdout.trim()).peak, 4);

  const fourHome = await mkdtemp(join(tmpdir(), "web-search-query-array-four-"));
  const four = runChild(
    extensionScript(["openai", "exa", "brave", "tavily"], fetchImplementation),
    { ...environment, HOME: fourHome, USERPROFILE: fourHome, PI_CODING_AGENT_DIR: fourHome },
  );
  assert.equal(four.status, 0, four.stderr || four.error?.message);
  assert.equal(JSON.parse(four.stdout.trim()).peak, 4);
});
