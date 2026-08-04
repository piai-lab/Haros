import { assert, describe, it } from "@effect/vitest";

import {
  appendCodexConfigSection,
  configHasTomlTableHeader,
  extractManagedCodexConfigSection,
  mergeShellEnvPolicyExclude,
  OMNIMIND_MANAGED_CODEX_CONFIG_BEGIN,
  OMNIMIND_MANAGED_CODEX_CONFIG_END,
} from "../codexProcessEnv.ts";
import {
  buildAntigravityMcpPluginConfig,
  buildAcpOmniMindMcpServers,
  buildClaudeMcpServers,
  buildCodexMcpConfigToml,
  buildOpenCodeMcpServer,
  callAgentGatewayMcpTool,
  listAgentGatewayMcpTools,
  OMNIMIND_AGENT_GATEWAY_TOKEN_ENV,
} from "./mcpInjection.ts";

const connection = {
  url: "http://127.0.0.1:3773/mcp",
  bearerToken: "sagw_abc.def",
};

const stdioProxy = {
  command: "/usr/local/bin/node",
  args: ["/state/agent-gateway-mcp-proxy.mjs"],
};

describe("agent gateway MCP injection", () => {
  it("builds a secret-free Antigravity stdio plugin config", () => {
    assert.deepEqual(buildAntigravityMcpPluginConfig(stdioProxy), {
      mcpServers: {
        omnimind: {
          command: stdioProxy.command,
          args: stdioProxy.args,
          env: {
            OMNIMIND_AGENT_GATEWAY_URL: "$OMNIMIND_AGENT_GATEWAY_URL",
            OMNIMIND_AGENT_GATEWAY_BOOTSTRAP_TOKEN: "$OMNIMIND_AGENT_GATEWAY_BOOTSTRAP_TOKEN",
            ELECTRON_RUN_AS_NODE: "1",
          },
          disabled: false,
          disabledTools: [],
        },
      },
    });
  });

  it("builds a codex config block that references the token env var, not the token", () => {
    const block = buildCodexMcpConfigToml(connection.url);
    assert.include(block, "[mcp_servers.omnimind]");
    assert.include(block, `url = "${connection.url}"`);
    assert.include(block, `bearer_token_env_var = "${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}"`);
    assert.notInclude(block, connection.bearerToken);
  });

  it("appends the codex section once and keeps existing config intact", () => {
    const base = '[model]\nname = "gpt-5.5"\n';
    const section = buildCodexMcpConfigToml(connection.url);
    const appended = appendCodexConfigSection(base, section);
    assert.include(appended, '[model]\nname = "gpt-5.5"');
    assert.include(appended, "[mcp_servers.omnimind]");

    const reappended = appendCodexConfigSection(appended, section);
    assert.equal(reappended.split("[mcp_servers.omnimind]").length, 2);
  });

  it("merges the token exclusion into a user-defined shell environment policy", () => {
    const withExclude = [
      "[shell_environment_policy]",
      'exclude = ["AWS_*"]',
      "",
      "[model]",
      'name = "gpt-5.5"',
    ].join("\n");
    const merged = mergeShellEnvPolicyExclude(withExclude, OMNIMIND_AGENT_GATEWAY_TOKEN_ENV);
    assert.include(merged, `exclude = ["${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}", "AWS_*"]`);

    // Idempotent: the var is not added twice.
    assert.equal(mergeShellEnvPolicyExclude(merged, OMNIMIND_AGENT_GATEWAY_TOKEN_ENV), merged);

    // A policy table without an exclude key gains one.
    const withoutExclude = ["[shell_environment_policy]", 'inherit = "core"'].join("\n");
    const gained = mergeShellEnvPolicyExclude(withoutExclude, OMNIMIND_AGENT_GATEWAY_TOKEN_ENV);
    assert.include(gained, `exclude = ["${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}"]`);
    assert.include(gained, 'inherit = "core"');

    // No policy table: unchanged (the managed section appends its own).
    assert.equal(
      mergeShellEnvPolicyExclude('[model]\nname = "gpt-5.5"', OMNIMIND_AGENT_GATEWAY_TOKEN_ENV),
      '[model]\nname = "gpt-5.5"',
    );
  });

  it("ignores commented and unrelated token references when merging shell exclusions", () => {
    const commentedExample = [
      "[shell_environment_policy]",
      `# exclude = ["${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}"]`,
      'exclude = ["AWS_*"]',
    ].join("\n");
    const mergedCommentedExample = mergeShellEnvPolicyExclude(
      commentedExample,
      OMNIMIND_AGENT_GATEWAY_TOKEN_ENV,
    );
    assert.include(
      mergedCommentedExample,
      `exclude = ["${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}", "AWS_*"]`,
    );

    const unrelatedString = [
      "[shell_environment_policy]",
      `note = "keep ${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV} private"`,
      'exclude = ["AWS_*"]',
    ].join("\n");
    const mergedUnrelatedString = mergeShellEnvPolicyExclude(
      unrelatedString,
      OMNIMIND_AGENT_GATEWAY_TOKEN_ENV,
    );
    assert.include(
      mergedUnrelatedString,
      `exclude = ["${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}", "AWS_*"]`,
    );
  });

  it("recognizes only active exact entries in multiline shell exclusion arrays", () => {
    const existing = [
      "[shell_environment_policy]",
      "exclude = [",
      '  "AWS_*",',
      `  "${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}",`,
      "]",
    ].join("\n");
    assert.equal(mergeShellEnvPolicyExclude(existing, OMNIMIND_AGENT_GATEWAY_TOKEN_ENV), existing);

    const tokenOnlyInComment = [
      "[shell_environment_policy]",
      "exclude = [",
      `  # "${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}",`,
      '  "AWS_*",',
      "]",
    ].join("\n");
    const merged = mergeShellEnvPolicyExclude(tokenOnlyInComment, OMNIMIND_AGENT_GATEWAY_TOKEN_ENV);
    assert.include(merged, `exclude = ["${OMNIMIND_AGENT_GATEWAY_TOKEN_ENV}",`);
  });

  it("detects real TOML table headers, ignoring comments and strings", () => {
    assert.isTrue(
      configHasTomlTableHeader('[mcp_servers.omnimind]\nurl = "x"', "[mcp_servers.omnimind]"),
    );
    assert.isTrue(
      configHasTomlTableHeader("  [mcp_servers.omnimind]  # managed", "[mcp_servers.omnimind]"),
    );
    assert.isTrue(
      configHasTomlTableHeader("  [ mcp_servers.omnimind ]  # managed", "[mcp_servers.omnimind]"),
    );
    assert.isTrue(configHasTomlTableHeader("  [ mcp_servers . omnimind ]", "[mcp_servers.omnimind]"));
    assert.isTrue(configHasTomlTableHeader('[mcp_servers."omnimind"]', "[mcp_servers.omnimind]"));
    assert.isTrue(configHasTomlTableHeader("['mcp_servers'.'omnimind']", "[mcp_servers.omnimind]"));
    assert.isTrue(configHasTomlTableHeader('[mcp_servers."syn\\u0061ra"]', "[mcp_servers.omnimind]"));
    assert.isTrue(
      configHasTomlTableHeader('["shell_environment_policy"]', "[shell_environment_policy]"),
    );
    assert.isFalse(configHasTomlTableHeader('["mcp_servers.omnimind"]', "[mcp_servers.omnimind]"));
    assert.isFalse(configHasTomlTableHeader('[mcp_servers."syn\\qara"]', "[mcp_servers.omnimind]"));
    // A commented-out example block must not count as the table being present.
    assert.isFalse(configHasTomlTableHeader("# [mcp_servers.omnimind]", "[mcp_servers.omnimind]"));
    assert.isFalse(
      configHasTomlTableHeader('note = "see [mcp_servers.omnimind] docs"', "[mcp_servers.omnimind]"),
    );
  });

  it("round-trips the managed section through the overlay markers", () => {
    const section = buildCodexMcpConfigToml(connection.url);
    const overlayConfig = [
      '[model]\nname = "gpt-5.5"',
      "",
      OMNIMIND_MANAGED_CODEX_CONFIG_BEGIN,
      section,
      OMNIMIND_MANAGED_CODEX_CONFIG_END,
      "",
    ].join("\n");
    // A rewrite without appendConfigToml recovers the block so concurrent env
    // preps (version checks, text generation) don't strip the session's MCP entry.
    assert.equal(extractManagedCodexConfigSection(overlayConfig), section);
    assert.isUndefined(extractManagedCodexConfigSection('[model]\nname = "gpt-5.5"\n'));
  });

  it("builds a claude http server entry with the bearer header", () => {
    const servers = buildClaudeMcpServers(connection);
    assert.deepEqual(servers, {
      omnimind: {
        type: "http",
        url: connection.url,
        headers: { Authorization: `Bearer ${connection.bearerToken}` },
      },
    });
  });

  it("builds an authenticated OpenCode remote MCP config with OAuth disabled", () => {
    assert.deepEqual(buildOpenCodeMcpServer(connection), {
      type: "remote",
      url: connection.url,
      enabled: true,
      headers: { Authorization: `Bearer ${connection.bearerToken}` },
      oauth: false,
    });
  });

  it("loads and invokes the canonical gateway catalog for native-tool providers", async () => {
    const requests: Array<{ readonly authorization: string | null; readonly body: unknown }> = [];
    const fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      const body: unknown = JSON.parse(String(init?.body));
      requests.push({
        authorization: new Headers(init?.headers).get("Authorization"),
        body,
      });
      const request = body as { readonly id: string; readonly method: string };
      return Response.json({
        jsonrpc: "2.0",
        id: request.id,
        result:
          request.method === "tools/list"
            ? {
                tools: [
                  {
                    name: "omnimind_list_threads",
                    description: "List OmniMind threads.",
                    inputSchema: { type: "object", properties: {} },
                  },
                ],
              }
            : { content: [{ type: "text", text: "ok" }] },
      });
    };

    assert.deepEqual(await listAgentGatewayMcpTools({ connection, fetch }), [
      {
        name: "omnimind_list_threads",
        description: "List OmniMind threads.",
        inputSchema: { type: "object", properties: {} },
      },
    ]);
    assert.deepEqual(
      await callAgentGatewayMcpTool({
        connection,
        name: "omnimind_list_threads",
        arguments: { limit: 2 },
        fetch,
      }),
      { content: [{ type: "text", text: "ok" }] },
    );
    assert.deepEqual(
      requests.map((request) => request.authorization),
      [`Bearer ${connection.bearerToken}`, `Bearer ${connection.bearerToken}`],
    );
    assert.deepEqual((requests[1]?.body as { readonly params: unknown }).params, {
      name: "omnimind_list_threads",
      arguments: { limit: 2 },
    });
  });

  it("uses the ACP http transport when the agent advertises support", () => {
    const servers = buildAcpOmniMindMcpServers({
      connection,
      initializeResult: { agentCapabilities: { mcpCapabilities: { http: true } } },
      stdioProxy,
    });
    assert.deepEqual(servers, [
      {
        type: "http",
        name: "omnimind",
        url: connection.url,
        headers: [{ name: "Authorization", value: `Bearer ${connection.bearerToken}` }],
      },
    ]);
  });

  it("falls back to the stdio proxy when http is not advertised", () => {
    const servers = buildAcpOmniMindMcpServers({
      connection,
      initializeResult: {},
      stdioProxy,
    });
    assert.deepEqual(servers, [
      {
        name: "omnimind",
        command: stdioProxy.command,
        args: stdioProxy.args,
        env: [
          { name: "OMNIMIND_AGENT_GATEWAY_URL", value: connection.url },
          { name: OMNIMIND_AGENT_GATEWAY_TOKEN_ENV, value: connection.bearerToken },
        ],
      },
    ]);
  });
});
