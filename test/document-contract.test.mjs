import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateDocumentContract } from "../scripts/document-contract.mjs";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const DOCUMENT_CONTRACT_PATHS = [
  "AGENTS.md",
  "README.md",
  "architecture/README.md",
  "architecture/workbench.md",
  "architecture/product-state.md",
  "architecture/execution.md",
  "execution-brief.md",
  "missions/independent-omnimind-v1.md",
  "research/README.md",
  "vendor/ui/apps/web/src/routes/_chat.plugins.tsx",
  "vendor/ui/apps/web/src/routeTree.gen.ts",
  "vendor/ui/apps/web/src/components/PluginLibrary.tsx",
];

async function createFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "omnimind-document-contract-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const relativePath of DOCUMENT_CONTRACT_PATHS) {
    const destination = path.join(root, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(
      destination,
      await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8"),
    );
  }

  return root;
}

async function replaceText(root, relativePath, before, after, { all = false } = {}) {
  const filePath = path.join(root, relativePath);
  const content = await readFile(filePath, "utf8");
  assert.ok(content.includes(before), `${relativePath} must contain fixture text: ${before}`);
  await writeFile(
    filePath,
    all ? content.replaceAll(before, after) : content.replace(before, after),
  );
}

async function appendText(root, relativePath, text) {
  const filePath = path.join(root, relativePath);
  const content = await readFile(filePath, "utf8");
  await writeFile(filePath, `${content}\n\n${text}\n`);
}

async function replaceSection(root, heading, nextHeading, replacement) {
  const filePath = path.join(root, "architecture/workbench.md");
  const content = await readFile(filePath, "utf8");
  const startMarker = `### ${heading}`;
  const endMarker = `### ${nextHeading}`;
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing fixture section: ${heading}`);
  assert.notEqual(end, -1, `missing fixture section boundary: ${nextHeading}`);
  await writeFile(filePath, `${content.slice(0, start)}${replacement}\n\n${content.slice(end)}`);
}

function assertFinding(findings, rule, relativePath) {
  assert.ok(
    findings.some((finding) => finding.rule === rule && finding.path === relativePath),
    `expected ${rule} for ${relativePath}; received ${JSON.stringify(findings, null, 2)}`,
  );
}

test("the repository satisfies the bounded document contract", async () => {
  assert.deepEqual(await validateDocumentContract({ root: REPOSITORY_ROOT }), []);
});

test("validation reads only the fixed bounded inputs and does not change them", async () => {
  const before = new Map();
  for (const relativePath of DOCUMENT_CONTRACT_PATHS) {
    before.set(relativePath, await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8"));
  }

  const reads = [];
  const findings = await validateDocumentContract({
    root: REPOSITORY_ROOT,
    read: async (filePath, encoding) => {
      reads.push(path.relative(REPOSITORY_ROOT, filePath));
      return readFile(filePath, encoding);
    },
  });

  assert.deepEqual(findings, []);
  assert.deepEqual(reads, DOCUMENT_CONTRACT_PATHS);
  for (const [relativePath, content] of before) {
    assert.equal(await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8"), content);
  }
});

test("a missing canonical owner emits one stable path-specific finding", async (t) => {
  const root = await createFixture(t);
  await unlink(path.join(root, "architecture/execution.md"));

  assert.deepEqual(await validateDocumentContract({ root }), [
    {
      rule: "document.required",
      path: "architecture/execution.md",
      message: "required contract input is missing",
    },
  ]);
});

test("a broken local owner route is reported against the routing document", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "README.md",
    "[`architecture/`](architecture/README.md)",
    "[`architecture/`](architecture/index.md)",
  );

  const findings = await validateDocumentContract({ root });
  assertFinding(findings, "owner.root", "README.md");
  assertFinding(findings, "route.local-link", "README.md");
});

const COVERAGE_CASES = [
  {
    name: "owner graph",
    rule: "owner.root",
    path: "README.md",
    before: "每类耐久事实只有一个 owner",
    after: "耐久事实可以由多个文件共同定义",
  },
  {
    name: "mandatory read route",
    rule: "route.mandatory",
    path: "execution-brief.md",
    before: "本 brief → active Campaign（仅状态）",
    after: "本 brief → optional status note",
  },
  {
    name: "Agent and Chat product entry",
    rule: "ui.product-entry",
    path: "architecture/workbench.md",
    before: "顺序永远是 Agent 在左、Chat 在右",
    after: "顺序可由当前页面自由调整",
  },
  {
    name: "shared work surface",
    rule: "ui.shared-work",
    path: "architecture/workbench.md",
    before: "`Question` 是稳定的结构化 UI 对象",
    after: "提问显示为普通文本",
  },
  {
    name: "Workbench domains",
    rule: "ui.workbench",
    path: "architecture/workbench.md",
    before: "Pull Requests",
    after: "code review placeholder",
    all: true,
  },
  {
    name: "onboarding and recovery",
    rule: "ui.onboarding",
    path: "architecture/workbench.md",
    before: "认证取消或过期",
    after: "认证问题",
  },
  {
    name: "provenance",
    rule: "ui.provenance",
    path: "architecture/workbench.md",
    before: "unknown/unverified",
    after: "missing",
    all: true,
  },
  {
    name: "Models settings",
    rule: "ui.models",
    path: "architecture/workbench.md",
    before: "runtime-backed capability",
    after: "locally listed capability",
  },
  {
    name: "Agents settings",
    rule: "ui.agents",
    path: "architecture/workbench.md",
    before: "协议不匹配",
    after: "一般连接错误",
  },
  {
    name: "Packages settings",
    rule: "ui.packages",
    path: "architecture/workbench.md",
    before: "Catalog/Curated/Verified",
    after: "Discovery labels",
    all: true,
  },
  {
    name: "permission truth",
    rule: "ui.permission",
    path: "architecture/workbench.md",
    before: "host-enforced",
    after: "host policy",
    all: true,
  },
  {
    name: "external Engine no fallback",
    rule: "ui.external-engine",
    path: "architecture/workbench.md",
    before: "不得改由 Pi 或其他来源派发 Run",
    after: "派发目标未定义",
  },
  {
    name: "Plugin and Skill lineage",
    rule: "ui.plugin-skill-lineage",
    path: "architecture/workbench.md",
    before: "browse/search",
    after: "discovery labels",
  },
  {
    name: "Queue ownership and no replay",
    rule: "queue.ownership",
    path: "architecture/product-state.md",
    before: "不得经原 Engine 或其他 Engine 自动重放",
    after: "允许实现自行决定是否重放",
  },
  {
    name: "UI quality",
    rule: "quality.ui",
    path: "architecture/workbench.md",
    before: "bounded DOM",
    after: "ordinary DOM",
    all: true,
  },
  {
    name: "adoption and deletion gate",
    rule: "adoption.deletion-gate",
    path: "architecture/workbench.md",
    before: "direct transplant",
    after: "informal port",
    all: true,
  },
];

for (const coverageCase of COVERAGE_CASES) {
  test(`rejects loss of ${coverageCase.name}`, async (t) => {
    const root = await createFixture(t);
    await replaceText(
      root,
      coverageCase.path,
      coverageCase.before,
      coverageCase.after,
      { all: coverageCase.all },
    );

    assertFinding(
      await validateDocumentContract({ root }),
      coverageCase.rule,
      coverageCase.path,
    );
  });
}

const SETTINGS_LABEL_ONLY_CASES = [
  {
    name: "Models",
    nextHeading: "Agents",
    rule: "ui.models",
    message: "Models settings contract is incomplete or contradictory",
    replacement: `### Models labels

runtime-backed · connection 的 authenticated · expired · unavailable · misconfigured · Model 的 available · temporarily unavailable · unsupported · Thinking level 的 supported · unknown · 下一次发送请求的选择 · 当前 Run receipt · 静态 catalog · Runtime 事实 · 不得覆盖 · connect · re-authenticate · disconnect · next-Run · diagnostics`,
  },
  {
    name: "Agents",
    nextHeading: "Packages",
    rule: "ui.agents",
    message: "Agents settings contract is incomplete or contradictory",
    replacement: `### Agents labels

bundled native Agent · external Agents · source · version · status · protocol · Model/Session 限制 · capability · permission · enforcement source · diagnostics · available · unavailable · unsupported · degraded · unknown · Thinking · Question · queue/steer/follow-up/cancel · Package integration · files/write · Terminal · namespaced UI · evidence/reason · 进程缺失 · 连接离线 · 协议不匹配 · 版本不匹配 · 重新连接 · 更新 · 改选 · 诊断入口`,
  },
  {
    name: "Packages",
    nextHeading: "权限策略与执行真实性",
    rule: "ui.packages",
    message: "Packages settings contract is incomplete or contradictory",
    replacement: `### Packages labels

Catalog/Curated/Verified discovery evidence · source · rights · publisher · exact artifact · digest · verification · trust · Native · Bridged UI · PTY · Unsupported · compatibility · Pi · Node · platform · install · stage · approve · activation · lease · update · retry · rollback · LKG · fault · private state · loading lifecycle.

process isolation 不是 sandbox。`,
  },
  {
    name: "permission truth",
    nextHeading: "External Engine 能力与无静默 fallback",
    rule: "ui.permission",
    message: "permission policy and enforcement-source contract is incomplete or contradictory",
    replacement: `### Permission labels

permission policy · User policy · Approval required · Auto · Full access · Enforcement source · host-enforced · engine-enforced · mixed · unverified · call path · deny · deny-side-effect evidence · renderer · protocol · process isolation · denied action · approval cancellation · dispatch 前失败 · post-dispatch uncertainty.

unverified 不表示 sandbox containment。`,
  },
];

for (const settingsCase of SETTINGS_LABEL_ONLY_CASES) {
  test(`rejects isolated ${settingsCase.name} labels without approved consequences`, async (t) => {
    const root = await createFixture(t);
    await replaceSection(
      root,
      settingsCase.name === "permission truth" ? "权限策略与执行真实性" : settingsCase.name,
      settingsCase.nextHeading,
      settingsCase.replacement,
    );

    assert.deepEqual(await validateDocumentContract({ root }), [
      {
        rule: settingsCase.rule,
        path: "architecture/workbench.md",
        message: settingsCase.message,
      },
    ]);
  });
}

const COMPLETE_SENTINEL_LABEL_BAG_CASES = [
  {
    name: "Models",
    nextHeading: "Agents",
    rule: "ui.models",
    message: "Models settings contract is incomplete or contradictory",
    replacement: `### Models complete sentinel bag

Models 使用 runtime-backed · 连接 · 重新认证 · 断开 · 下一次发送 · 诊断 · connection 的 authenticated · expired · unavailable · misconfigured · Model 的 available · temporarily unavailable · unsupported · Thinking level 的 supported · unknown · 下一次发送请求的选择 · 当前 Run receipt · 冻结 · Runtime 事实 · 静态 catalog · 不得 · 覆盖 · next-Run 规则 · 不确认 · Toast/Timeline · 不热换当前 Run · 不丢输入`,
  },
  {
    name: "Agents",
    nextHeading: "Packages",
    rule: "ui.agents",
    message: "Agents settings contract is incomplete or contradictory",
    replacement: `### Agents complete sentinel bag

bundled native Agent · external Agents · 不宣称能力齐平 · source · version · status · protocol · Model/Session 限制 · capability · permission · enforcement source · diagnostics · 正面和负面事实 · Thinking · 结构化 Question · queue/steer/follow-up/cancel · Package integration · files/write · Terminal · namespaced UI · available · unavailable · unsupported · degraded · unknown · evidence/reason · 进程缺失 · 连接离线 · 协议不匹配 · 版本不匹配 · 不同故障 · 重新连接 · 更新 · 改选 · 诊断入口`,
  },
  {
    name: "Packages",
    nextHeading: "权限策略与执行真实性",
    rule: "ui.packages",
    message: "Packages settings contract is incomplete or contradictory",
    replacement: `### Packages complete sentinel bag

Catalog/Curated/Verified · discovery · evidence · source · rights · publisher · exact artifact digest · verification generation · trust · Native/Bridged UI/PTY/Unsupported compatibility · Pi/Node/platform/UI 要求 · install script · native dependency · network/file/command permission · private-state review · install/stage · approve · 安全边界 activate · activation · active lease · update · retry · rollback to LKG · Unsupported Package · activation 前 · 具体原因拒绝 · 失败 · current/LKG generation · leased generation · 绝不热替换 · fault · 新 lease · 恢复和 LKG 状态 · process isolation 不是 sandbox · private state · loading lifecycle · native runtime/Package · 不创建竞争 loader`,
  },
  {
    name: "permission truth",
    nextHeading: "External Engine 能力与无静默 fallback",
    rule: "ui.permission",
    message: "permission policy and enforcement-source contract is incomplete or contradictory",
    replacement: `### Permission complete sentinel bag

permission policy · 用户策略 · 实际强制来源 · 两个字段 · Approval required · 操作先询问 · Auto · 自动策略 · Full access · 广泛操作 · 不代表 sandbox · host-enforced · 拒绝副作用测试 · 实际阻止 · engine-enforced · Engine contract · Host 没有相同强制 · mixed · 两侧分别强制 · 职责边界 · unverified · 不得 containment · actual call path · call path · deny-side-effect evidence · deny · 不来自 renderer · 协议名称 · 进程已隔离 · denied action · approval cancellation · dispatch 前失败 · post-dispatch uncertainty · 准确的可见结果`,
  },
];

for (const settingsCase of COMPLETE_SENTINEL_LABEL_BAG_CASES) {
  test(`rejects complete single-block ${settingsCase.name} sentinel labels`, async (t) => {
    const root = await createFixture(t);
    await replaceSection(
      root,
      settingsCase.name === "permission truth" ? "权限策略与执行真实性" : settingsCase.name,
      settingsCase.nextHeading,
      settingsCase.replacement,
    );

    assert.deepEqual(await validateDocumentContract({ root }), [
      {
        rule: settingsCase.rule,
        path: "architecture/workbench.md",
        message: settingsCase.message,
      },
    ]);
  });
}

for (const anchorPath of [
  "vendor/ui/apps/web/src/routes/_chat.plugins.tsx",
  "vendor/ui/apps/web/src/routeTree.gen.ts",
  "vendor/ui/apps/web/src/components/PluginLibrary.tsx",
]) {
  test(`reports a missing protected anchor at ${anchorPath}`, async (t) => {
    const root = await createFixture(t);
    await unlink(path.join(root, anchorPath));

    assert.deepEqual(await validateDocumentContract({ root }), [
      {
        rule: "ui.plugin-skill-anchor",
        path: anchorPath,
        message: "protected plugin and skill source anchor is missing or no longer recognizable",
      },
    ]);
  });
}

const TOKEN_ONLY_ANCHOR_CASES = [
  {
    path: "vendor/ui/apps/web/src/routes/_chat.plugins.tsx",
    content: "// PluginLibrary createFileRoute /_chat/plugins\n",
  },
  {
    path: "vendor/ui/apps/web/src/routeTree.gen.ts",
    content: "export const routeTokens = '/plugins /_chat/plugins';\n",
  },
  {
    path: "vendor/ui/apps/web/src/components/PluginLibrary.tsx",
    content:
      "export const labels = 'plugins skills Search isLoading marketplaceLoadErrors discoveryCwd';\n",
  },
];

for (const anchorCase of TOKEN_ONLY_ANCHOR_CASES) {
  test(`rejects token-only dead source at ${anchorCase.path}`, async (t) => {
    const root = await createFixture(t);
    await writeFile(path.join(root, anchorCase.path), anchorCase.content);

    assert.deepEqual(await validateDocumentContract({ root }), [
      {
        rule: "ui.plugin-skill-anchor",
        path: anchorCase.path,
        message: "protected plugin and skill source anchor is missing or no longer recognizable",
      },
    ]);
  });
}

const QUOTED_INERT_ANCHOR_CASES = [
  {
    path: "vendor/ui/apps/web/src/routes/_chat.plugins.tsx",
    content:
      `export const inert = 'import { createFileRoute } from "@tanstack/react-router"; import { PluginLibrary } from "@/components/PluginLibrary"; export const Route = createFileRoute("/_chat/plugins")({ component: PluginLibrary });';\n`,
  },
  {
    path: "vendor/ui/apps/web/src/routeTree.gen.ts",
    content:
      `export const inert = 'import { Route as ChatPluginsRouteImport } from "./routes/_chat.plugins"; const ChatPluginsRoute = ChatPluginsRouteImport.update({ id: "/plugins", path: "/plugins", getParentRoute: () => ChatRoute }); "/_chat/plugins": { id: "/_chat/plugins", path: "/plugins", preLoaderRoute: typeof ChatPluginsRouteImport }';\n`,
  },
  {
    path: "vendor/ui/apps/web/src/components/PluginLibrary.tsx",
    content:
      `export const inert = 'export function PluginLibrary() { const [selectedTab, setSelectedTab] = useState<DiscoveryTab>("plugins"); providerPluginsQueryOptions({ enabled: selectedTab === "plugins" }); providerSkillsQueryOptions({ enabled: selectedTab === "skills", discoveryCwd !== null }); rankProviderDiscoveryItems(buildPluginSearchFields); rankProviderDiscoveryItems(buildSkillSearchFields); <InstalledStatus installed={isInstalledProviderPlugin(item)} />; <InstalledStatus installed={skill.enabled} />; <TabButton label="Plugins" /><TabButton label="Skills" />; pluginsQuery.isLoading filteredPluginEntries.length === 0; skillsQuery.isLoading filteredSkills.length === 0; marketplaceLoadErrors InlineWarning; !discoveryCwd && selectedTab === "skills" Skills need a workspace path; }';\n`,
  },
];

for (const anchorCase of QUOTED_INERT_ANCHOR_CASES) {
  test(`rejects complete executable-shaped quoted text at ${anchorCase.path}`, async (t) => {
    const root = await createFixture(t);
    await writeFile(path.join(root, anchorCase.path), anchorCase.content);

    assert.deepEqual(await validateDocumentContract({ root }), [
      {
        rule: "ui.plugin-skill-anchor",
        path: anchorCase.path,
        message: "protected plugin and skill source anchor is missing or no longer recognizable",
      },
    ]);
  });
}

test("source anchors without the product mapping do not pass", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "architecture/workbench.md",
    "donor /plugins discovery\n  -> Settings › Packages discovery/trust/compatibility/activation\n  -> Package detail for contained Skills/Extensions and source evidence\n  -> Settings › Agents for Engine discovery capability truth\n  -> Composer for enabled Skill use where the selected Engine supports it",
    "donor /plugins discovery\n  -> destination pending",
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "ui.plugin-skill-mapping",
    "architecture/workbench.md",
  );
});

test("headings, labels, and protected anchor names alone cannot satisfy the UI contract", async (t) => {
  const root = await createFixture(t);
  await writeFile(
    path.join(root, "architecture/workbench.md"),
    `# Workbench labels

Agent | Chat · Projects · Groups · Models · Agents · Packages · Queue · Timeline

${[
  "vendor/ui/apps/web/src/routes/_chat.plugins.tsx",
  "vendor/ui/apps/web/src/routeTree.gen.ts",
  "vendor/ui/apps/web/src/components/PluginLibrary.tsx",
].join("\n")}
`,
  );

  const findings = await validateDocumentContract({ root });
  for (const rule of [
    "ui.product-entry",
    "ui.shared-work",
    "ui.workbench",
    "ui.onboarding",
    "ui.provenance",
    "ui.models",
    "ui.agents",
    "ui.packages",
    "ui.permission",
    "ui.external-engine",
    "ui.plugin-skill-lineage",
    "ui.plugin-skill-mapping",
    "quality.ui",
    "adoption.deletion-gate",
  ]) {
    assertFinding(findings, rule, "architecture/workbench.md");
  }
});

const CONTRADICTION_CASES = [
  ["ui.product-entry", "Chat 必须拥有 Primary Folder。"],
  ["ui.onboarding", "所有 Package 都安全。"],
  ["ui.provenance", "可以从 display name 猜测来源。"],
  ["ui.models", "static catalog 覆盖 runtime。"],
  ["ui.agents", "external Agents 能力齐平 native Agent。"],
  ["ui.packages", "Catalog 等于 trust。"],
  ["ui.permission", "unverified 表示已验证 containment。"],
  ["ui.external-engine", "不可用时自动 fallback 到 Pi。"],
  ["ui.plugin-skill-lineage", "永久 unavailable 可以删除整个发现域。"],
  ["adoption.deletion-gate", "unavailable 可以删除整个母体域。"],
];

for (const [rule, contradiction] of CONTRADICTION_CASES) {
  test(`rejects an explicit ${rule} contradiction even when affirmative text remains`, async (t) => {
    const root = await createFixture(t);
    await appendText(root, "architecture/workbench.md", contradiction);
    assertFinding(await validateDocumentContract({ root }), rule, "architecture/workbench.md");
  });
}

test("rejects explicit Queue replay even when the affirmative contract remains", async (t) => {
  const root = await createFixture(t);
  await appendText(
    root,
    "architecture/product-state.md",
    "delivery_unknown 可以自动重放。",
  );
  assertFinding(
    await validateDocumentContract({ root }),
    "queue.ownership",
    "architecture/product-state.md",
  );
});

test("harmless frontmatter, heading, and section-order editorial changes pass", async (t) => {
  const root = await createFixture(t);
  const filePath = path.join(root, "architecture/workbench.md");
  const content = await readFile(filePath, "utf8");
  const renamedHeadings = content.replace(/^#{1,6} .+$/gm, "## Editorial section");
  const sections = renamedHeadings.split(/(?=^## Editorial section$)/m);
  const reordered = [sections[0], ...sections.slice(1).reverse()].join("");
  await writeFile(filePath, `---\neditorial: true\n---\n\n${reordered}`);

  assert.deepEqual(await validateDocumentContract({ root }), []);
});
