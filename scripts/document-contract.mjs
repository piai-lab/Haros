import path from "node:path";
import { readFile } from "node:fs/promises";

const DOCUMENT_PATHS = [
  "AGENTS.md",
  "README.md",
  "architecture/README.md",
  "architecture/workbench.md",
  "architecture/public-surface.md",
  "architecture/product-state.md",
  "architecture/execution.md",
  "execution-brief.md",
  "missions/independent-omnimind-v1.md",
  "research/README.md",
  "research/source-update-intake.md",
];

const PLUGIN_ANCHOR_PATHS = [
  "apps/web/src/routes/_chat.plugins.tsx",
  "apps/web/src/routeTree.gen.ts",
  "apps/web/src/components/PluginLibrary.tsx",
];

const P = {
  agents: "AGENTS.md",
  root: "README.md",
  architecture: "architecture/README.md",
  workbench: "architecture/workbench.md",
  publicSurface: "architecture/public-surface.md",
  productState: "architecture/product-state.md",
  execution: "architecture/execution.md",
  brief: "execution-brief.md",
  campaign: "missions/independent-omnimind-v1.md",
  research: "research/README.md",
  sourceUpdateIntake: "research/source-update-intake.md",
  pluginRoute: "apps/web/src/routes/_chat.plugins.tsx",
  routeTree: "apps/web/src/routeTree.gen.ts",
  pluginLibrary: "apps/web/src/components/PluginLibrary.tsx",
};

const RULE_MESSAGES = {
  "owner.routing-safety": "routing and repository safety ownership is incomplete or contradictory",
  "owner.root": "root product constitution ownership is incomplete or contradictory",
  "owner.architecture-index": "architecture owner index is incomplete or contradictory",
  "owner.research": "research evidence ownership is incomplete or contradictory",
  "owner.source-update-intake":
    "adopted-source update review and approval boundary is incomplete or contradictory",
  "owner.execution-brief": "execution ordering ownership is incomplete or contradictory",
  "owner.campaign": "Campaign acceptance ownership is incomplete or contradictory",
  "owner.product-state": "product-state object ownership is incomplete or contradictory",
  "owner.execution": "execution topology ownership is incomplete or contradictory",
  "owner.public-surface": "public-surface ownership is incomplete or contradictory",
  "route.mandatory": "mandatory reading route is incomplete or out of order",
  "route.local-link": "required local owner route is missing or changed",
  "ui.product-entry":
    "product entry and workspace hierarchy contract is incomplete or contradictory",
  "ui.shared-work": "shared work surface contract is incomplete or contradictory",
  "ui.workbench": "Workbench domain coverage is incomplete or contradictory",
  "ui.onboarding": "onboarding and failure recovery contract is incomplete or contradictory",
  "ui.provenance":
    "source, rights, and diagnostic provenance contract is incomplete or contradictory",
  "ui.models": "Models settings contract is incomplete or contradictory",
  "ui.agents": "Agents settings contract is incomplete or contradictory",
  "ui.packages": "Packages settings contract is incomplete or contradictory",
  "ui.permission":
    "permission policy and enforcement-source contract is incomplete or contradictory",
  "ui.external-engine":
    "external Engine capability and no-fallback contract is incomplete or contradictory",
  "ui.public-surface":
    "public-surface registry and fail-closed product contract is incomplete or contradictory",
  "ui.plugin-skill-lineage":
    "protected plugin and skill lineage contract is incomplete or contradictory",
  "ui.plugin-skill-anchor":
    "protected plugin and skill source anchor is missing or no longer recognizable",
  "ui.plugin-skill-mapping": "plugin and skill product-destination mapping is incomplete",
  "queue.ownership": "Queue ownership and no-replay contract is incomplete or contradictory",
  "quality.ui": "UI quality and bounded-rendering contract is incomplete or contradictory",
  "adoption.deletion-gate": "source adoption and deletion gate is incomplete or contradictory",
};

function normalize(value) {
  return value.replaceAll("\r\n", "\n");
}

const PROTECTED_SOURCE_LITERALS = new Set([
  "./routes/_chat.plugins",
  "/_chat/plugins",
  "/plugins",
  "plugins",
  "skills",
  "Plugins",
  "Skills",
]);

function executableSource(value) {
  let result = "";

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];

    if (character === "/" && next === "/") {
      index += 2;
      while (index < value.length && value[index] !== "\n") index += 1;
      result += "\n";
      continue;
    }

    if (character === "/" && next === "*") {
      index += 2;
      while (index < value.length && !(value[index] === "*" && value[index + 1] === "/")) {
        if (value[index] === "\n") result += "\n";
        index += 1;
      }
      index += 1;
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      let literal = "";
      for (index += 1; index < value.length; index += 1) {
        if (value[index] === "\\") {
          if (index + 1 < value.length) {
            literal += value[index + 1];
            index += 1;
          }
          continue;
        }
        if (value[index] === quote) break;
        literal += value[index];
      }
      result += JSON.stringify(
        PROTECTED_SOURCE_LITERALS.has(literal) ? literal : "__SOURCE_LITERAL__",
      );
      continue;
    }

    result += character;
  }

  return result;
}

function hasExecutableTextStatement(value, statement) {
  const source = statement
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(`(?:^|>\\s*|[.;]\\s+)${source}(?=\\s*(?:$|<))`, "i").test(value);
}

function contains(text, term) {
  return term instanceof RegExp ? term.test(text) : text.includes(term);
}

function hasAll(text, terms) {
  return terms.every((term) => contains(text, term));
}

function hasAny(text, terms) {
  return terms.some((term) => contains(text, term));
}

function hasClause(text, groups) {
  const blocks = text.split(/\n\s*\n/);
  return blocks.some((block) => groups.every((alternatives) => hasAny(block, alternatives)));
}

function clausesSpanDistinctBlocks(text, clauses, minimumDistinctBlocks) {
  const blocks = text.split(/\n\s*\n/);
  const matchingBlocks = clauses.map((groups) =>
    blocks
      .map((block, index) =>
        groups.every((alternatives) => hasAny(block, alternatives)) ? index : -1,
      )
      .filter((index) => index !== -1),
  );
  if (matchingBlocks.some((matches) => matches.length === 0)) return false;

  const clauseByBlock = new Map();
  function assignDistinctBlock(clauseIndex, visitedBlocks) {
    for (const blockIndex of matchingBlocks[clauseIndex]) {
      if (visitedBlocks.has(blockIndex)) continue;
      visitedBlocks.add(blockIndex);
      const assignedClause = clauseByBlock.get(blockIndex);
      if (assignedClause === undefined || assignDistinctBlock(assignedClause, visitedBlocks)) {
        clauseByBlock.set(blockIndex, clauseIndex);
        return true;
      }
    }
    return false;
  }

  let distinctBlocks = 0;
  for (let clauseIndex = 0; clauseIndex < clauses.length; clauseIndex += 1) {
    if (assignDistinctBlock(clauseIndex, new Set())) distinctBlocks += 1;
  }
  return distinctBlocks >= minimumDistinctBlocks;
}

function hasOrderedTerms(text, terms) {
  let offset = 0;
  for (const term of terms) {
    const index = text.indexOf(term, offset);
    if (index === -1) return false;
    offset = index + term.length;
  }
  return true;
}

function hasMarkdownTarget(text, target) {
  return text.includes(`](${target})`) || text.includes(`]: ${target}`);
}

function contradicts(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function matchesAll(text, patterns) {
  return patterns.every((pattern) => pattern.test(text));
}

function addFinding(findings, rule, findingPath, message = RULE_MESSAGES[rule]) {
  findings.push({ rule, path: findingPath, message });
}

function check(findings, available, rule, findingPath, valid) {
  if (available.has(findingPath) && !valid) addFinding(findings, rule, findingPath);
}

function textOf(documents, documentPath) {
  return documents.get(documentPath) ?? "";
}

function validateOwners(findings, documents, available) {
  const agents = textOf(documents, P.agents);
  const root = textOf(documents, P.root);
  const architecture = textOf(documents, P.architecture);
  const productState = textOf(documents, P.productState);
  const publicSurface = textOf(documents, P.publicSurface);
  const execution = textOf(documents, P.execution);
  const brief = textOf(documents, P.brief);
  const campaign = textOf(documents, P.campaign);
  const research = textOf(documents, P.research);
  const sourceUpdateIntake = textOf(documents, P.sourceUpdateIntake);

  check(
    findings,
    available,
    "owner.routing-safety",
    P.agents,
    hasAll(agents, [
      "读取路由",
      "歧义",
      "仓库操作安全",
      "README.md",
      "architecture/README.md",
      "execution-brief.md",
      "missions/independent-omnimind-v1.md",
    ]) &&
      hasAny(agents, ["先修 owner", "先修权威文档", "停止实现"]) &&
      !contradicts(agents, [
        /AGENTS\.md\s*(?:拥有|定义)\s*(?:产品宪法|完整 UI|进程拓扑)/,
        /本文件\s*(?:拥有|定义)\s*(?:产品宪法|完整 UI|进程拓扑)/,
      ]),
  );

  check(
    findings,
    available,
    "owner.root",
    P.root,
    hasAll(root, [
      "宪法级后果",
      "adoption",
      "architecture/README.md",
      "research/README.md",
      "execution-brief.md",
      "missions/independent-omnimind-v1.md",
      "每类耐久事实只有一个 owner",
    ]) &&
      !contradicts(root, [
        /README\s*(?:拥有|定义)\s*(?:完整进程拓扑|全部 UI 物理契约)/,
        /README\s*是\s*(?:Campaign 状态|施工顺序)/,
      ]),
  );

  check(
    findings,
    available,
    "owner.architecture-index",
    P.architecture,
    hasAll(architecture, [
      "workbench.md",
      "product-state.md",
      "execution.md",
      "public-surface.md",
      "所有用户可见行为",
      "七个 durable product objects",
      "完整进程 topology",
    ]) && hasAny(architecture, ["长期约束实现", "稳定职责"]),
  );

  check(
    findings,
    available,
    "owner.public-surface",
    P.publicSurface,
    hasAll(publicSurface, [
      "唯一架构 owner",
      "https://omnimind.wisdomeyes.cn",
      "只被保留，尚未激活",
      "Public site origin",
      "Feedback endpoint",
      "Release/update authority",
      "当前不是 public API",
    ]) &&
      hasClause(publicSurface, [["三者"], ["独立激活", "独立"], ["撤销"], ["失败"]]) &&
      !contradicts(publicSurface, [
        /保留[^。\n]*(?:等于|意味着|证明)[^。\n]*(?:Feedback API|website|网站|Docs|Changelog)[^。\n]*(?:已上线|已激活)/i,
        /Feedback endpoint[^。\n]*(?:从|继承)[^。\n]*public origin[^。\n]*(?:推导|授权)/i,
      ]),
  );

  check(
    findings,
    available,
    "owner.research",
    P.research,
    hasAll(research, [
      "证据",
      "source-review.md",
      "source-update-intake.md",
      "decision-record.md",
    ]) &&
      hasAny(research, ["不拥有产品 doctrine", "不拥有稳定 contract", "可推翻"]) &&
      !contradicts(research, [
        /research\s*(?:拥有|定义)\s*(?:产品 doctrine|稳定 contract|施工顺序)/i,
      ]),
  );

  check(
    findings,
    available,
    "owner.source-update-intake",
    P.sourceUpdateIntake,
    hasAll(sourceUpdateIntake, [
      "maintainer initiated only",
      "Gate A",
      "Gate B",
      "read-only review and discussion",
      "explicit implementation approval",
      "descendant",
      "merge base",
      "Understanding and retaining an insight does not create an",
      "implementation obligation",
      "ongoing ownership and divergence cost",
      "selective intake",
      "risk escalator",
    ]) &&
      hasClause(sourceUpdateIntake, [
        ["Do not schedule it"],
        ["automatically fetch"],
        ["merely because a newer upstream revision exists"],
      ]) &&
      !contradicts(sourceUpdateIntake, [
        /Source update review (?:runs|starts|is) automatically/i,
        /Implementation begins before the maintainer/i,
      ]),
  );

  check(
    findings,
    available,
    "owner.execution-brief",
    P.brief,
    hasAll(brief, [
      "施工顺序",
      "Stage 0–3 已",
      "一个真实 headless Pi Package",
      "何时停止",
      "需要什么 proof",
    ]) &&
      hasClause(brief, [["只回答"], ["施工"], ["停止"], ["proof"]]) &&
      !contradicts(brief, [
        /本文件\s*(?:拥有|定义)\s*(?:完整进程拓扑|产品对象全集|完整 UI 契约)/,
        /当前唯一下一动作[\s\S]{0,300}先完成并独立复核 Stage 0/,
      ]),
  );

  check(
    findings,
    available,
    "owner.campaign",
    P.campaign,
    hasAll(campaign, ["Claim", "Proof type", "Status", "Evidence", "SHA"]) &&
      hasClause(campaign, [["只拥有 Campaign claim 状态"], ["不定义产品"], ["施工计划"]]) &&
      !contradicts(campaign, [/本文件\s*(?:拥有|定义)\s*(?:产品 doctrine|稳定 contract|施工顺序)/]),
  );

  const productObjects = [
    "Workspace",
    "Conversation",
    "Entry",
    "Run",
    "EngineBinding",
    "ResourceRef",
    "OperationReceipt",
  ];
  const declaredObjects =
    productState.match(
      /^- `(?:Workspace|Conversation|Entry|Run|EngineBinding|ResourceRef|OperationReceipt)`：/gm,
    ) ?? [];
  check(
    findings,
    available,
    "owner.product-state",
    P.productState,
    hasAll(productState, productObjects) &&
      declaredObjects.length === productObjects.length &&
      hasClause(productState, [
        ["Package generation"],
        ["不是", "不增加"],
        ["独立", "第八个"],
        ["lease", "LKG"],
      ]) &&
      hasAny(productState, ["不增加第八个 durable product object", "不增加第八个"]),
  );

  check(
    findings,
    available,
    "owner.execution",
    P.execution,
    hasAll(execution, [
      "Desktop Host",
      "Product Service",
      "Native Host",
      "External Engine",
      "进程 topology",
      "target responsibility layout",
    ]) && hasAny(execution, ["不要求提前制造空目录", "不得为了匹配 topology 创建占位 package"]),
  );
}

function validateRoutes(findings, documents, available) {
  const mandatoryRoutes = [
    [
      P.agents,
      [
        "README.md",
        "architecture/README.md",
        "execution-brief.md",
        "missions/independent-omnimind-v1.md",
      ],
    ],
    [P.brief, ["README →", "architecture index", "本 brief", "active Campaign"]],
    [P.campaign, ["README.md", "architecture/README.md", "execution-brief.md"]],
    [P.agents, ["research/source-update-intake.md"]],
  ];

  for (const [documentPath, terms] of mandatoryRoutes) {
    check(
      findings,
      available,
      "route.mandatory",
      documentPath,
      hasOrderedTerms(textOf(documents, documentPath), terms),
    );
  }

  const requiredLinks = [
    [
      P.root,
      [
        "architecture/README.md",
        "architecture/public-surface.md",
        "research/README.md",
        "execution-brief.md",
        "missions/independent-omnimind-v1.md",
      ],
    ],
    [P.architecture, ["workbench.md", "public-surface.md", "product-state.md", "execution.md"]],
    [
      P.brief,
      [
        "README.md",
        "architecture/workbench.md",
        "architecture/public-surface.md",
        "architecture/product-state.md",
        "architecture/execution.md",
        "research/source-review.md",
      ],
    ],
    [P.campaign, ["../execution-brief.md", "../research/source-review.md"]],
    [P.research, ["source-review.md", "source-update-intake.md", "decision-record.md"]],
  ];

  for (const [documentPath, targets] of requiredLinks) {
    check(
      findings,
      available,
      "route.local-link",
      documentPath,
      targets.every((target) => hasMarkdownTarget(textOf(documents, documentPath), target)),
    );
  }
}

function validateUiContract(findings, documents, available) {
  const workbench = textOf(documents, P.workbench);
  const publicSurface = textOf(documents, P.publicSurface);

  const registryHeaders = [
    "Surface",
    "Canonical route",
    "Product entry",
    "Direction",
    "Data",
    "Activation gate",
    "Unavailable behavior",
    "Authority/owner",
  ];
  const registrySurfaces = [
    "Home",
    "Docs",
    "Changelog",
    "Download",
    "Privacy",
    "Support",
    "Feedback",
    "Share/social",
    "Update discovery",
    "Future deep link",
  ];
  const registryRows = publicSurface
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  const registryHeaderValid =
    registryRows[0]?.length === registryHeaders.length &&
    registryRows[0].every((header, index) => header === registryHeaders[index]);
  const surfaceRows = registryRows.filter((row) => registrySurfaces.includes(row[0]));
  const publicOwnerValid =
    hasAll(publicSurface, [
      "**Future reserved candidate:** `POST /api/v1/feedback`",
      "当前不是 public API",
      "production-approved",
      "不从 public origin 推导",
      "调用 `fetch` 前失败",
      "保留 draft",
      "不后台重试",
      "allowlist diagnostics",
      "不得加入",
    ]) &&
    registryHeaderValid &&
    surfaceRows.length === registrySurfaces.length &&
    registrySurfaces.every((surface) =>
      surfaceRows.some((row) => row[0] === surface && row.length === registryHeaders.length),
    ) &&
    hasClause(publicSurface, [["Feedback"], ["production"], ["disabled"], ["不发请求"]]) &&
    hasClause(publicSurface, [
      ["prompt"],
      ["message"],
      ["code"],
      ["file content/path"],
      ["credential"],
      ["terminal"],
      ["log"],
    ]) &&
    !contradicts(publicSurface, [
      /保留[^。\n]*(?:等于|意味着|证明)[^。\n]*Feedback API[^。\n]*(?:已上线|已激活)/i,
      /(?:失败|无配置)[^。\n]*(?:可以|允许|会|应当|必须)[^。\n]*(?:清空|丢弃)[^。\n]*draft/i,
      /(?:可以|允许|会|应当|必须)[^。\n]*(?:自动|后台)[^。\n]*重试/i,
    ]);
  const workbenchPublicValid =
    hasAll(workbench, [
      "public-surface.md",
      "Docs",
      "Changelog",
      "disabled",
      "unavailable",
      "猜测 URL",
      "Feedback",
      "不得发起网络请求",
      "保留",
      "draft",
      "不显示 success",
      "不后台重试",
      "prompt",
      "message",
      "code",
      "file/path",
      "credential",
      "environment",
      "terminal",
      "log",
    ]) &&
    hasClause(workbench, [
      ["Feedback"],
      ["未激活", "无独立获批 endpoint"],
      ["disabled"],
      ["发送内容"],
      ["不发送"],
    ]) &&
    !contradicts(workbench, [
      /(?:Docs|Changelog)[^。\n]*(?:fallback|猜测)[^。\n]*URL/i,
      /Feedback[^。\n]*(?:无独立获批 endpoint|未激活)[^。\n]*(?:仍可|允许)[^。\n]*(?:提交|发起网络请求)/i,
    ]);

  check(findings, available, "ui.public-surface", P.publicSurface, publicOwnerValid);
  check(findings, available, "ui.public-surface", P.workbench, workbenchPublicValid);

  check(
    findings,
    available,
    "ui.product-entry",
    P.workbench,
    hasClause(workbench, [
      ["Agent | Chat"],
      ["Agent 在左", "Agent 左"],
      ["Chat 在右", "Chat 右"],
    ]) &&
      hasClause(workbench, [["Projects"], ["Groups"], ["上", "先于"]]) &&
      hasClause(workbench, [
        ["Chat"],
        ["无 Primary Folder", "没有 Primary Folder"],
        ["Send to Agent"],
      ]) &&
      hasClause(workbench, [["Agent"], ["Primary Folder"], ["写入", "write"]]) &&
      !contradicts(workbench, [
        /Chat[^\n]{0,80}(?:必须|应当|可以)?\s*(?:拥有|具有)\s*Primary Folder/i,
        /Groups\s*(?:拥有|定义)\s*(?:Folder|Engine|Run)/i,
      ]),
  );

  check(
    findings,
    available,
    "ui.shared-work",
    P.workbench,
    hasAll(workbench, [
      "Conversation renderer",
      "Composer",
      "Engine、Model、Thinking/Reasoning",
      "Timeline",
      "Activity",
      "Queue",
      "Output",
      "child Conversation",
    ]) &&
      hasClause(workbench, [["Question"], ["结构化 UI 对象"], ["等待用户状态"], ["Run"]]) &&
      hasClause(workbench, [["child Conversation/Run"], ["parent/origin"], ["steer"], ["stop"]]),
  );

  check(
    findings,
    available,
    "ui.workbench",
    P.workbench,
    hasAll(workbench, [
      "文件树",
      "搜索",
      "reveal",
      "Tabs",
      "Split",
      "Viewer",
      "Diff",
      "Changes",
      "Terminal",
      "Output",
      "Git",
      "Pull Requests",
      "Kanban",
      "Automations",
      "Browser",
      "Source Control",
      "Side Chat",
      "Subagents",
      "真实 PTY",
      "stale diff",
      "Remote 延迟",
    ]) && hasAny(workbench, ["失败局部", "失败保持局部", "局部失败"]),
  );

  check(
    findings,
    available,
    "ui.onboarding",
    P.workbench,
    hasClause(workbench, [
      ["OmniMind Agent"],
      ["bundled-native"],
      ["日常品牌口号"],
      ["About"],
      ["Licenses"],
    ]) &&
      hasClause(workbench, [["Provider"], ["Model"], ["local path", "本地路径"]]) &&
      hasClause(workbench, [["权限策略"], ["enforcement source", "实际 enforcement"]]) &&
      hasAll(workbench, [
        "认证取消或过期",
        "离线",
        "Runtime 缺失",
        "没有兼容 Model",
        "版本不匹配",
      ]) &&
      hasClause(workbench, [["保留"], ["步骤", "输入"], ["重试", "设置入口"]]) &&
      !contradicts(workbench, [
        /所有\s*Package\s*(?:都|均)?\s*(?:安全|受信任)/i,
        /所有\s*Engine\s*(?:都|均)?\s*(?:相同|等价|能力齐平)/i,
      ]),
  );

  check(
    findings,
    available,
    "ui.provenance",
    P.workbench,
    hasAll(workbench, [
      "Engine selector",
      "真实 Engine",
      "source",
      "rights",
      "exact artifact",
      "Agent detail",
      "protocol",
      "capability evidence",
      "About",
      "Licenses",
      "diagnostics",
      "unknown/unverified",
    ]) &&
      hasClause(workbench, [
        ["Package detail"],
        ["source"],
        ["rights"],
        ["exact artifact"],
        ["Pi runtime"],
      ]) &&
      !contradicts(workbench, [
        /(?:允许|可以|应当).{0,80}(?:从\s*)?(?:display name|显示名称).{0,40}(?:猜测|推断)(?:source|来源)?/i,
        /unknown\/unverified.*(?:可以|应当).*(?:隐藏|改写|猜测)/i,
      ]),
  );

  check(
    findings,
    available,
    "ui.models",
    P.workbench,
    hasAll(workbench, [
      "runtime-backed",
      "connection 的 authenticated",
      "Model 的 available",
      "Thinking",
      "下一次发送请求的选择",
      "当前 Run receipt",
      "静态 catalog",
    ]) &&
      hasClause(workbench, [
        ["Models 使用 runtime-backed"],
        ["连接"],
        ["重新认证"],
        ["断开"],
        ["下一次发送"],
        ["诊断"],
      ]) &&
      hasClause(workbench, [
        ["connection 的 authenticated"],
        ["expired"],
        ["unavailable"],
        ["misconfigured"],
      ]) &&
      hasClause(workbench, [
        ["Model 的 available"],
        ["temporarily unavailable"],
        ["unsupported"],
      ]) &&
      hasClause(workbench, [["Thinking level 的 supported"], ["unsupported"], ["unknown"]]) &&
      hasClause(workbench, [["下一次发送请求的选择"], ["当前 Run receipt"], ["冻结"]]) &&
      hasClause(workbench, [["Runtime 事实"], ["静态 catalog"], ["不得", "不能"], ["覆盖"]]) &&
      hasClause(workbench, [
        ["next-Run 规则"],
        ["不确认"],
        ["Toast/Timeline"],
        ["不热换当前 Run"],
        ["不丢输入"],
      ]) &&
      clausesSpanDistinctBlocks(
        workbench,
        [
          [["Models 使用 runtime-backed"], ["重新认证"], ["下一次发送"], ["诊断"]],
          [
            ["connection 的 authenticated"],
            ["expired"],
            ["Model 的 available"],
            ["Thinking level 的 supported"],
            ["当前 Run receipt"],
          ],
          [["Runtime 事实"], ["静态 catalog"], ["next-Run 规则"], ["不热换当前 Run"], ["不丢输入"]],
        ],
        3,
      ) &&
      !contradicts(workbench, [/(?:static|静态) catalog.*(?:优先于|覆盖|override).*runtime/i]),
  );

  check(
    findings,
    available,
    "ui.agents",
    P.workbench,
    hasAll(workbench, [
      "bundled native Agent",
      "external Agents",
      "source",
      "version",
      "protocol",
      "限制",
      "capability",
      "permission",
      "diagnostics",
      "available",
      "unavailable",
      "unsupported",
      "degraded",
      "unknown",
      "进程缺失",
      "协议不匹配",
      "版本不匹配",
    ]) &&
      hasClause(workbench, [["bundled native Agent"], ["external Agents"], ["不宣称能力齐平"]]) &&
      hasClause(workbench, [
        ["source"],
        ["version"],
        ["status"],
        ["protocol"],
        ["Model/Session 限制"],
        ["capability"],
        ["enforcement source"],
        ["diagnostics"],
      ]) &&
      hasClause(workbench, [
        ["正面和负面事实"],
        ["Thinking"],
        ["结构化 Question"],
        ["queue/steer/follow-up/cancel"],
        ["files/write"],
        ["Terminal"],
        ["namespaced UI"],
      ]) &&
      hasClause(workbench, [
        ["available"],
        ["unavailable"],
        ["unsupported"],
        ["degraded"],
        ["unknown"],
        ["evidence/reason"],
      ]) &&
      hasClause(workbench, [
        ["进程缺失"],
        ["连接离线"],
        ["协议不匹配"],
        ["版本不匹配"],
        ["不同故障"],
        ["重新连接"],
        ["更新"],
        ["改选"],
        ["诊断入口"],
      ]) &&
      clausesSpanDistinctBlocks(
        workbench,
        [
          [
            ["bundled native Agent"],
            ["external Agents"],
            ["不宣称能力齐平"],
            ["source"],
            ["protocol"],
          ],
          [["正面和负面事实"], ["available"], ["unavailable"], ["degraded"], ["evidence/reason"]],
          [["进程缺失"], ["协议不匹配"], ["版本不匹配"], ["不同故障"], ["重新连接"], ["诊断入口"]],
        ],
        2,
      ) &&
      !contradicts(workbench, [/external.*(?:等同|等价|能力齐平).*native/i]),
  );

  check(
    findings,
    available,
    "ui.packages",
    P.workbench,
    hasAll(workbench, [
      "Catalog",
      "Curated",
      "Verified",
      "exact artifact",
      "trust",
      "install",
      "activation",
      "lease",
      "update",
      "LKG",
      "fault",
      "sandbox",
    ]) &&
      hasClause(workbench, [["Catalog/Curated/Verified"], ["discovery"], ["evidence"]]) &&
      hasClause(workbench, [
        ["source"],
        ["rights"],
        ["publisher"],
        ["exact artifact digest"],
        ["verification generation"],
      ]) &&
      hasClause(workbench, [
        ["Native/Bridged UI/PTY/Unsupported compatibility"],
        ["Pi/Node/platform/UI 要求"],
      ]) &&
      hasClause(workbench, [
        ["install script"],
        ["native dependency"],
        ["network/file/command permission"],
        ["private-state review"],
      ]) &&
      hasClause(workbench, [
        ["install/stage"],
        ["approve"],
        ["安全边界 activate"],
        ["active lease"],
        ["update"],
        ["retry"],
        ["rollback to LKG"],
      ]) &&
      hasClause(workbench, [["Unsupported Package"], ["activation 前"], ["具体原因拒绝"]]) &&
      hasClause(workbench, [
        ["失败"],
        ["current/LKG generation"],
        ["leased generation"],
        ["绝不热替换"],
        ["fault"],
        ["新 lease"],
        ["恢复和 LKG 状态"],
      ]) &&
      hasClause(workbench, [["进程隔离", "process isolation"], ["不", "不是"], ["sandbox"]]) &&
      hasClause(workbench, [
        ["private state"],
        ["loading lifecycle"],
        ["native runtime/Package"],
        ["不创建竞争 loader"],
      ]) &&
      clausesSpanDistinctBlocks(
        workbench,
        [
          [
            ["Catalog/Curated/Verified"],
            ["exact artifact digest"],
            ["Native/Bridged UI/PTY/Unsupported compatibility"],
            ["install/stage"],
            ["rollback to LKG"],
          ],
          [
            ["Unsupported Package"],
            ["activation 前"],
            ["current/LKG generation"],
            ["leased generation"],
            ["绝不热替换"],
            ["fault"],
            ["恢复和 LKG 状态"],
          ],
          [
            ["private state"],
            ["loading lifecycle"],
            ["native runtime/Package"],
            ["不创建竞争 loader"],
          ],
        ],
        3,
      ) &&
      !contradicts(workbench, [
        /Catalog\s*(?:等于|就是|证明)\s*trust/i,
        /进程隔离\s*(?:等于|就是|构成)\s*(?:安全 )?sandbox/i,
      ]),
  );

  check(
    findings,
    available,
    "ui.permission",
    P.workbench,
    hasAll(workbench, [
      "permission policy",
      "host-enforced",
      "engine-enforced",
      "mixed",
      "unverified",
      "call path",
      "deny",
    ]) &&
      hasClause(workbench, [["用户策略"], ["实际强制来源"], ["两个字段"]]) &&
      hasClause(workbench, [["Approval required"], ["操作先询问"]]) &&
      hasClause(workbench, [["Auto"], ["自动策略"]]) &&
      hasClause(workbench, [["Full access"], ["广泛操作"], ["不代表 sandbox"]]) &&
      hasClause(workbench, [["host-enforced"], ["拒绝副作用测试"], ["实际阻止"]]) &&
      hasClause(workbench, [["engine-enforced"], ["Engine contract"], ["Host 没有相同强制"]]) &&
      hasClause(workbench, [["mixed"], ["两侧分别强制"], ["职责边界"]]) &&
      hasClause(workbench, [["unverified"], ["不得", "不"], ["sandbox", "containment"]]) &&
      hasClause(workbench, [
        ["actual call path", "实际 call path"],
        ["deny-side-effect evidence"],
        ["不来自 renderer"],
        ["协议名称"],
        ["进程已隔离"],
      ]) &&
      hasClause(workbench, [
        ["denied action"],
        ["approval cancellation"],
        ["dispatch 前失败"],
        ["post-dispatch uncertainty"],
        ["准确的可见结果"],
      ]) &&
      clausesSpanDistinctBlocks(
        workbench,
        [
          [["用户策略"], ["实际强制来源"], ["两个字段"]],
          [
            ["Approval required"],
            ["操作先询问"],
            ["Auto"],
            ["自动策略"],
            ["Full access"],
            ["不代表 sandbox"],
          ],
          [
            ["host-enforced"],
            ["实际阻止"],
            ["engine-enforced"],
            ["Host 没有相同强制"],
            ["mixed"],
            ["职责边界"],
            ["unverified"],
          ],
          [
            ["actual call path", "实际 call path"],
            ["deny-side-effect evidence"],
            ["denied action"],
            ["approval cancellation"],
            ["post-dispatch uncertainty"],
          ],
        ],
        4,
      ) &&
      !contradicts(workbench, [
        /unverified\s*(?:等于|表示|证明)\s*(?:已验证|containment)/i,
        /进程隔离\s*(?:等于|就是|构成)\s*(?:安全 )?sandbox/i,
      ]),
  );

  check(
    findings,
    available,
    "ui.external-engine",
    P.workbench,
    hasAll(workbench, [
      "capability",
      "保留输入",
      "资源",
      "显式选择",
      "delivery_unknown",
      "outcome_unknown",
      "自动重放",
    ]) &&
      hasClause(workbench, [["不得改由 Pi"], ["保留输入"], ["用户主动改选"]]) &&
      hasClause(workbench, [
        ["delivery_unknown"],
        ["outcome_unknown"],
        ["不经 Pi"],
        ["自动重放"],
      ]) &&
      !contradicts(workbench, [
        /(?:静默|自动|silently)\s*fallback.*Pi/i,
        /不可用.*自动.*Pi/i,
        /(?:delivery_unknown|outcome_unknown).{0,80}(?:允许|可以|应当|必须|会)(?:自动)?(?:重放|重试|replay)/i,
      ]),
  );

  check(
    findings,
    available,
    "ui.plugin-skill-lineage",
    P.workbench,
    hasAll(workbench, [
      P.pluginRoute,
      P.routeTree,
      P.pluginLibrary,
      "browse/search",
      "installed/enabled",
      "source/marketplace failure",
      "loading",
      "empty",
      "error",
      "working-directory requirement",
      "truthful unavailable",
    ]) &&
      !contradicts(workbench, [/永久(?:地)?\s*unavailable.*(?:允许|可以|足以).*(?:删除|移除)/i]),
  );

  check(
    findings,
    available,
    "ui.plugin-skill-mapping",
    P.workbench,
    hasAll(workbench, [P.pluginRoute, P.routeTree, P.pluginLibrary]) &&
      hasClause(workbench, [
        ["donor /plugins discovery"],
        ["Settings › Packages"],
        ["Package detail"],
        ["Settings › Agents"],
        ["Composer"],
      ]) &&
      hasClause(workbench, [
        ["三个 source anchor"],
        ["映射"],
        ["Packages"],
        ["Agents"],
        ["Composer"],
      ]),
  );

  check(
    findings,
    available,
    "quality.ui",
    P.workbench,
    hasAll(workbench, [
      "stream batching",
      "bounded DOM",
      "scroll anchor",
      "纯键盘",
      "screen-reader name",
      "简体中文和英文",
      "CJK",
      "reduced motion",
    ]) &&
      hasClause(workbench, [["100k+ 字符 Conversation"], ["bounded DOM"]]) &&
      hasClause(workbench, [["键盘"], ["screen-reader"], ["focus"], ["reduced motion"]]),
  );

  check(
    findings,
    available,
    "adoption.deletion-gate",
    P.workbench,
    hasAll(workbench, [
      "direct transplant",
      "behavior proof",
      "same-state visual review",
      "behavior replacement",
      "Donor provider tabs",
      "受保护 ontology",
      "re-entry proof",
    ]) &&
      hasClause(workbench, [
        ["删除", "移除"],
        ["direct transplant", "behavior replacement"],
        ["proof", "视觉复核"],
      ]) &&
      !contradicts(workbench, [
        /unavailable.*(?:允许|可以|足以).*(?:删除|移除)/i,
        /未完成.*(?:允许|可以).*(?:删除|移除)/i,
      ]),
  );
}

function validateQueue(findings, documents, available) {
  const workbench = textOf(documents, P.workbench);
  const productState = textOf(documents, P.productState);
  const execution = textOf(documents, P.execution);
  const contradictionPatterns = [
    /delivery_unknown.{0,100}(?:允许|可以|应当|必须|会).*(?:退回|放回|回到).*(?:editable )?Queue/i,
    /(?:delivery_unknown|outcome_unknown).{0,100}(?:允许|可以|应当|必须|会)(?:自动)?(?:重放|重试|automatic replay)/i,
  ];

  const productStateValid =
    hasClause(productState, [["Queue"], [/pre-dispatch/i], ["intent"]]) &&
    hasClause(productState, [["dispatch", "派发"], ["Run"], ["receipt"]]) &&
    hasAll(productState, ["delivery_unknown", "outcome_unknown", "可编辑 Queue", "自动重放"]) &&
    hasClause(productState, [["delivery_unknown"], ["不得"], ["可编辑 Queue"], ["自动重放"]]) &&
    !contradicts(productState, contradictionPatterns);

  const executionValid =
    hasClause(execution, [["接纳前"], ["Composer intent"], ["Run"], ["dispatch receipt"]]) &&
    hasClause(execution, [["delivery_unknown"], ["不得自动重放"], ["editable Queue"]]) &&
    !contradicts(execution, contradictionPatterns);

  const workbenchValid =
    hasClause(workbench, [["pre-dispatch intent"], ["Run/receipt"], ["Engine"]]) &&
    hasAll(workbench, ["delivery_unknown", "outcome_unknown", "editable Queue", "自动重放"]) &&
    hasClause(workbench, [["delivery_unknown"], ["outcome_unknown"], ["不经 Pi"], ["自动重放"]]) &&
    !contradicts(workbench, contradictionPatterns);

  check(findings, available, "queue.ownership", P.workbench, workbenchValid);
  check(findings, available, "queue.ownership", P.productState, productStateValid);
  check(findings, available, "queue.ownership", P.execution, executionValid);
}

function validatePluginAnchors(findings, documents, available) {
  const pluginRoute = executableSource(textOf(documents, P.pluginRoute));
  const routeTree = executableSource(textOf(documents, P.routeTree));
  const pluginLibrary = executableSource(textOf(documents, P.pluginLibrary));

  check(
    findings,
    available,
    "ui.plugin-skill-anchor",
    P.pluginRoute,
    matchesAll(pluginRoute, [
      /import\s*\{\s*createFileRoute\s*\}\s*from\s*["'][^"']+["']\s*;/,
      /import\s*\{\s*PluginLibrary\s*\}\s*from\s*["'][^"']+["']\s*;/,
      /export\s+const\s+Route\s*=\s*createFileRoute\s*\(\s*["']\/_chat\/plugins["']\s*\)\s*\(\s*\{[\s\S]{0,200}component\s*:\s*PluginLibrary[\s\S]{0,80}\}\s*\)\s*;/,
    ]),
  );

  check(
    findings,
    available,
    "ui.plugin-skill-anchor",
    P.routeTree,
    matchesAll(routeTree, [
      /import\s*\{\s*Route\s+as\s+ChatPluginsRouteImport\s*\}\s*from\s*["']\.\/routes\/_chat\.plugins["']/,
      /const\s+ChatPluginsRoute\s*=\s*ChatPluginsRouteImport\.update\s*\(\s*\{[\s\S]{0,240}id\s*:\s*["']\/plugins["'][\s\S]{0,120}path\s*:\s*["']\/plugins["'][\s\S]{0,160}getParentRoute\s*:\s*\(\)\s*=>\s*ChatRoute/,
      /["']\/_chat\/plugins["']\s*:\s*\{[\s\S]{0,240}id\s*:\s*["']\/_chat\/plugins["'][\s\S]{0,120}path\s*:\s*["']\/plugins["'][\s\S]{0,160}preLoaderRoute\s*:\s*typeof\s+ChatPluginsRouteImport/,
    ]),
  );

  check(
    findings,
    available,
    "ui.plugin-skill-anchor",
    P.pluginLibrary,
    matchesAll(pluginLibrary, [
      /import\s*\{\s*RouteInsetSurface\s*\}\s*from\s*["'][^"']+["']\s*;/,
      /export\s+function\s+PluginLibrary\s*\(\s*\)\s*\{/,
      /return\s*\(\s*<RouteInsetSurface>[\s\S]{0,1600}<\/RouteInsetSurface>\s*\)\s*;/,
      /<h1[^>]*>\s*Packages\s*<\/h1>/,
      /Package\s+and\s+Skill\s+discovery\s+is\s+unavailable\s+in\s+this\s+build\./,
      /Runtime\s+capabilities\s+come\s+from\s+the\s+Native\s+Host/,
      /no\s+Provider\s+marketplace\s+or\s+cross-Provider\s+fallback\s+is\s+queried\./,
      /Return\s+here\s+after\s+a\s+Product-owned\s+catalog,\s*trust,\s*compatibility,\s*and\s+activation\s+surface\s+is\s+connected\./,
    ]) &&
      !hasAny(pluginLibrary, [
        /\bproviderPluginsQueryOptions\b/,
        /\bproviderSkillsQueryOptions\b/,
        /\brankProviderDiscoveryItems\b/,
        /\bbuildPluginSearchFields\b/,
        /\bbuildSkillSearchFields\b/,
        /\bisInstalledProviderPlugin\b/,
        /\bmarketplaceLoadErrors\b/,
      ]) &&
      !hasAny(pluginLibrary, [
        /Package\s+and\s+Skill\s+discovery\s+is\s+available\s+in\s+this\s+build/i,
        /Runtime\s+capabilities\s+(?:also\s+)?come\s+from\s+(?:the\s+)?(?:renderer|Electron\s+Main|Web|Product\s+Service)/i,
        /(?:Provider|donor)-owned\s+catalog/i,
      ]) &&
      !hasExecutableTextStatement(pluginLibrary, "Provider marketplace is queried.") &&
      !hasExecutableTextStatement(pluginLibrary, "cross-Provider fallback is queried."),
  );
}

/**
 * Validate the bounded, durable document contract without traversing or mutating
 * the repository. `read` is injectable so tests and other callers can provide a
 * virtual filesystem while retaining the same fixed path boundary.
 *
 * @param {{ root: string, read?: (path: string, encoding: string) => Promise<string> }} options
 * @returns {Promise<Array<{rule: string, path: string, message: string}>>}
 */
export async function validateDocumentContract({ root, read = readFile }) {
  if (typeof root !== "string" || root.length === 0) {
    throw new TypeError("validateDocumentContract requires a repository root");
  }

  const documents = new Map();
  const available = new Set();
  const findings = [];

  for (const documentPath of [...DOCUMENT_PATHS, ...PLUGIN_ANCHOR_PATHS]) {
    try {
      const content = await read(path.join(root, documentPath), "utf8");
      documents.set(documentPath, normalize(String(content)));
      available.add(documentPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const protectedAnchor = PLUGIN_ANCHOR_PATHS.includes(documentPath);
      addFinding(
        findings,
        protectedAnchor ? "ui.plugin-skill-anchor" : "document.required",
        documentPath,
        protectedAnchor
          ? RULE_MESSAGES["ui.plugin-skill-anchor"]
          : "required contract input is missing",
      );
    }
  }

  validateOwners(findings, documents, available);
  validateRoutes(findings, documents, available);
  validateUiContract(findings, documents, available);
  validateQueue(findings, documents, available);
  validatePluginAnchors(findings, documents, available);

  return findings;
}
