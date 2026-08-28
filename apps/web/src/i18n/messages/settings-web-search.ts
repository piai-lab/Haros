import { defineMessageSlice } from "../messageCatalog";

const EN_MESSAGES = {
  "settings.webSearchDescription":
    "Configure HarnessOS Web Access routing, source review, and search services.",
  "settings.webSearch.loading": "Loading HarnessOS Web Access settings…",
  "settings.webSearch.loadFailed": "Could not load Web search settings",
  "settings.webSearch.saveFailed": "Could not save Web search settings",
  "settings.webSearch.loadRecovery":
    "Retry loading. If the problem continues, check the configuration file.",
  "settings.webSearch.saveRecovery":
    "Your draft is still here. Retry, refresh the file, or open it to repair permissions and content.",
  "settings.webSearch.openConfigRecovery":
    "Refresh and try again, or verify that a supported editor can open local files.",
  "settings.webSearch.saved": "Web search settings saved",
  "settings.webSearch.noChanges": "Web search settings are already up to date",
  "settings.webSearch.title": "Web search",
  "settings.webSearch.availability": "Can the Agent search the web?",
  "settings.webSearch.availabilityDescription":
    "Recheck sends one real request and may use service quota.",
  "settings.webSearch.defaults": "Search defaults",
  "settings.webSearch.routing": "Search routing",
  "settings.webSearch.routingDescription":
    "Auto stops at the first successful service. All can make several paid or quota-limited requests.",
  "settings.webSearch.workflow": "Result handling",
  "settings.webSearch.workflowDescription":
    "Automatic summary is the recommended no-interruption default. Summary review waits for your approval before the Agent continues.",
  "settings.webSearch.workflow.summary-review": "Summary review · Wait for approval",
  "settings.webSearch.workflow.auto-summary": "Automatic summary · Recommended",
  "settings.webSearch.workflow.none": "Raw results",
  "settings.webSearch.autoShowSearchProcess": "Show search progress automatically",
  "settings.webSearch.autoShowSearchProcessDescription":
    "Show live results in the Right Dock while search runs. This does not pause the Agent or require approval.",
  "settings.webSearch.routeAuto": "Auto · first success",
  "settings.webSearch.routeBroad": "Multi-source · up to three services",
  "settings.webSearch.routeAll": "All eligible services",
  "settings.webSearch.broadCostWarning":
    "Multi-source coverage may request up to three available services for each query and may use multiple service quotas.",
  "settings.webSearch.parallelCostWarning":
    "This mode contacts several services. Each service may use its own quota or charge separately.",
  "settings.webSearch.selectedParallel": "Selected services · file configured",
  "settings.webSearch.providers": "Search services",
  "settings.webSearch.addProvider": "Add service",
  "settings.webSearch.searchProviders": "Search services…",
  "settings.webSearch.configured": "Configured",
  "settings.webSearch.notConfigured": "Not configured",
  "settings.webSearch.setup": "Set up",
  "settings.webSearch.view": "View",
  "settings.webSearch.state.noSetup":
    "No setup required; shared quota or service availability may apply",
  "settings.webSearch.state.complete": "Ready to try",
  "settings.webSearch.state.sessionDependent": "May use the current signed-in Agent session",
  "settings.webSearch.state.partial": "Setup incomplete · {count} required item(s) missing",
  "settings.webSearch.state.missing": "Setup required",
  "settings.webSearch.group.configured": "Current and configured",
  "settings.webSearch.group.noSetup": "No key required",
  "settings.webSearch.group.credentials": "Credentials required",
  "settings.webSearch.group.advanced": "MCP, self-hosted, and advanced",
  "settings.webSearch.noProviderMatches": "No search service matches this filter.",
  "settings.webSearch.prerequisite.none": "No setup required",
  "settings.webSearch.prerequisite.optionalKey": "Shared quota or optional API key",
  "settings.webSearch.prerequisite.key": "API key required",
  "settings.webSearch.prerequisite.endpoint": "Endpoint required",
  "settings.webSearch.prerequisite.keyOrSession": "API key or signed-in session",
  "settings.webSearch.prerequisite.gemini": "API key or Chromium account",
  "settings.webSearch.noConfiguredProviders":
    "No keyed search service is configured yet. Keyless routes may still be available with shared quota.",
  "settings.webSearch.providerRequestsMayCost":
    "Every real request may consume quota or incur service charges.",
  "settings.webSearch.fieldEnv": "Saved in the configuration file. Environment fallback: {env}",
  "settings.webSearch.fieldFile": "Saved in the configuration file",
  "settings.webSearch.fieldRole.api-key": "API key",
  "settings.webSearch.fieldRole.endpoint": "Service address",
  "settings.webSearch.fieldRole.model": "Model",
  "settings.webSearch.fieldRole.zone": "Zone",
  "settings.webSearch.invalidStoredValue":
    "This field has a non-text value in the file. Saving a text value will replace it.",
  "settings.webSearch.requiredValue": "Required value",
  "settings.webSearch.optionalValue": "Optional value",
  "settings.webSearch.advancedFileOnly": "Advanced file-only settings",
  "settings.webSearch.openConfig": "Open config file",
  "settings.webSearch.openConfigFailed": "Could not open the Web search config file",
  "settings.webSearch.testSection": "Real request",
  "settings.webSearch.testCurrentDraft": "Test current draft",
  "settings.webSearch.testDraftDescription":
    "Tests the unsaved service draft without saving it. This real request may consume quota or incur charges.",
  "settings.webSearch.test": "Test",
  "settings.webSearch.testing": "Testing…",
  "settings.webSearch.statusAndFiles": "Status and advanced configuration",
  "settings.webSearch.capability": "HarnessOS Web Access",
  "settings.webSearch.capabilityDescription":
    "Choose how the Agent searches, handles results, and whether to show the live process.",
  "settings.webSearch.searchCapability": "Network search",
  "settings.webSearch.searchCapabilityDescription":
    "Search uses the selected route. Recheck sends one real request and may consume quota.",
  "settings.webSearch.readCapability": "Open and read pages",
  "settings.webSearch.readCapabilityDescription":
    "Direct links and content from prior results remain available independently of search routing.",
  "settings.webSearch.readCapabilityStatus": "Available for direct links",
  "settings.webSearch.reviewCapability": "Source handling",
  "settings.webSearch.reviewCapabilityDescription":
    "The selected workflow controls whether results return directly, summarize automatically, or wait for review.",
  "settings.webSearch.possible": "Available",
  "settings.webSearch.needsConfiguration": "Set up the selected service",
  "settings.webSearch.recheck": "Recheck",
  "settings.webSearch.rechecking": "Rechecking…",
  "settings.webSearch.configFile": "Configuration file",
  "settings.webSearch.configFileDescription":
    "Advanced edits and common settings share one private web-search.json file.",
  "settings.webSearch.probe.ready": "This real request succeeded.",
  "settings.webSearch.probe.degraded":
    "Temporarily unavailable. Search remains available to retry.",
  "settings.webSearch.probe.unavailable":
    "Configured routes were exhausted. Repair a search service and recheck.",
  "settings.webSearch.probe.failed":
    "This service test failed. The result is not permanent connection state.",
  "settings.webSearch.probeReason.request-succeeded": "This real request succeeded.",
  "settings.webSearch.probeReason.temporary-failure":
    "The service is temporarily unavailable. You can retry later or keep using Auto.",
  "settings.webSearch.probeReason.route-exhausted":
    "No current route succeeded. Repair a service and recheck.",
  "settings.webSearch.probeReason.provider-failed":
    "This test failed. Check the service details and try again.",
  "settings.webSearch.probeReason.credential-rejected":
    "The credentials were rejected. Check or replace them.",
  "settings.webSearch.probeReason.quota-exhausted":
    "This request reached the service quota. Try later or use another route.",
  "settings.webSearch.probeReason.missing-configuration":
    "Complete the required setup before testing.",
  "settings.webSearch.probeReason.network-failure":
    "The network request failed. The setup may still be valid; retry later or use Auto.",
  "settings.webSearch.probeReason.request-cancelled":
    "The test was cancelled. No lasting connection state was created.",
  "settings.webSearch.toolStates": "Tool availability from the configuration file",
  "settings.webSearch.tool.webSearch": "Search the web",
  "settings.webSearch.tool.sourceCheck": "Check source passages",
  "settings.webSearch.tool.fetchContent": "Read page content",
  "settings.webSearch.tool.getSearchContent": "Continue from stored results",
  "settings.webSearch.tool.available": "Available",
  "settings.webSearch.tool.fileDisabled": "Turned off in the configuration file",
  "settings.webSearch.tool.fileLevelDescription":
    "Advanced users can control this tool in the configuration file.",
  "settings.webSearch.conflictTitle": "The config file changed outside this draft",
  "settings.webSearch.conflictDescription":
    "Your draft was preserved. Reload the file, or explicitly overwrite it with this draft.",
  "settings.webSearch.recovery.damaged-json":
    "The configuration file is not valid JSON. The original file was preserved; open it to repair the syntax.",
  "settings.webSearch.recovery.invalid-root":
    "The configuration file has an unsupported structure. The original file was preserved.",
  "settings.webSearch.recovery.future-schema":
    "This file was written by a newer HarnessOS version. Update HarnessOS before editing it here.",
  "settings.webSearch.recovery.too-large":
    "This config is too large to read safely. The original file was preserved. Reduce its size, then reload.",
  "settings.webSearch.recovery.unsafe-path":
    "HarnessOS cannot safely use this configuration file. Check the file and its permissions.",
  "settings.webSearch.reloadFile": "Reload file",
  "settings.webSearch.overwriteWithDraft": "Overwrite with draft",
  "settings.webSearch.recoveryTitle": "The config file needs recovery",
  "settings.webSearch.geminiAccount": "Gemini Web account",
  "settings.webSearch.geminiAccountDescription":
    "Explicitly inspect the Chromium profile and Google account used by the Gemini Web cookie route.",
  "settings.webSearch.inspectAccount": "Inspect account",
  "settings.webSearch.geminiUnavailable": "No usable Gemini Web Chromium account was found.",
  "settings.webSearch.geminiDiagnosticFailed": "Could not inspect the Gemini Web account",
  "settings.webSearch.geminiDiagnosticRecovery":
    "Try again, or check the Chromium profile in the configuration file.",
} as const;

const ZH_CN_MESSAGES = {
  "settings.webSearchDescription": "配置 HarnessOS 网络访问的路由、来源审查与搜索服务。",
  "settings.webSearch.loading": "正在加载 HarnessOS 网络访问设置…",
  "settings.webSearch.loadFailed": "无法加载网络搜索设置",
  "settings.webSearch.saveFailed": "无法保存网络搜索设置",
  "settings.webSearch.loadRecovery": "请重试加载；如果问题持续，请检查配置文件。",
  "settings.webSearch.saveRecovery": "草稿仍在。你可以重试、刷新文件，或打开文件修复权限和内容。",
  "settings.webSearch.openConfigRecovery": "请刷新后重试，或确认受支持的编辑器能够打开本地文件。",
  "settings.webSearch.saved": "网络搜索设置已保存",
  "settings.webSearch.noChanges": "网络搜索设置已是最新",
  "settings.webSearch.title": "网络搜索",
  "settings.webSearch.availability": "Agent 当前能联网搜索吗？",
  "settings.webSearch.availabilityDescription": "重新检查会发送一次真实请求，并可能消耗服务额度。",
  "settings.webSearch.defaults": "搜索默认值",
  "settings.webSearch.routing": "服务路由",
  "settings.webSearch.routingDescription":
    "自动路由在首个服务成功后停止；全部模式可能产生多份额度或费用。",
  "settings.webSearch.workflow": "结果处理",
  "settings.webSearch.workflowDescription":
    "自动摘要是推荐的无打扰默认；摘要审查会在结果就绪后等待你批准，再让 Agent 继续。",
  "settings.webSearch.workflow.summary-review": "摘要审查 · 等待批准",
  "settings.webSearch.workflow.auto-summary": "自动摘要 · 推荐",
  "settings.webSearch.workflow.none": "原始结果",
  "settings.webSearch.autoShowSearchProcess": "自动显示搜索过程",
  "settings.webSearch.autoShowSearchProcessDescription":
    "搜索时在 Right Dock 展示实时结果。不会暂停 Agent 或要求批准。",
  "settings.webSearch.routeAuto": "自动 · 首个成功即停止",
  "settings.webSearch.routeBroad": "多源覆盖 · 最多三家服务",
  "settings.webSearch.routeAll": "全部符合条件的服务",
  "settings.webSearch.broadCostWarning":
    "多源覆盖会为每个查询请求最多三家可用服务，可能消耗多份服务额度。",
  "settings.webSearch.parallelCostWarning":
    "该模式会请求多个服务；每个服务都可能分别消耗额度或产生费用。",
  "settings.webSearch.selectedParallel": "已选服务并发 · 由文件配置",
  "settings.webSearch.providers": "搜索服务",
  "settings.webSearch.addProvider": "添加服务",
  "settings.webSearch.searchProviders": "搜索服务…",
  "settings.webSearch.configured": "已配置",
  "settings.webSearch.notConfigured": "未配置",
  "settings.webSearch.setup": "设置",
  "settings.webSearch.view": "查看",
  "settings.webSearch.state.noSetup": "无需配置，可直接尝试；受共享额度或服务状态限制",
  "settings.webSearch.state.complete": "可尝试",
  "settings.webSearch.state.sessionDependent": "可使用 Agent 当前已登录会话",
  "settings.webSearch.state.partial": "配置不完整 · 还缺 {count} 项必填内容",
  "settings.webSearch.state.missing": "需要设置",
  "settings.webSearch.group.configured": "当前与已配置",
  "settings.webSearch.group.noSetup": "无需 Key",
  "settings.webSearch.group.credentials": "需要凭据",
  "settings.webSearch.group.advanced": "MCP、自建与高级服务",
  "settings.webSearch.noProviderMatches": "没有符合筛选条件的搜索服务。",
  "settings.webSearch.prerequisite.none": "无需配置",
  "settings.webSearch.prerequisite.optionalKey": "可用共享额度，也可配置 API Key",
  "settings.webSearch.prerequisite.key": "需要 API Key",
  "settings.webSearch.prerequisite.endpoint": "需要服务地址",
  "settings.webSearch.prerequisite.keyOrSession": "需要 API Key 或已登录会话",
  "settings.webSearch.prerequisite.gemini": "需要 API Key 或 Chromium 账号",
  "settings.webSearch.noConfiguredProviders":
    "尚未配置需要密钥的服务；共享额度的免密路由仍可能可用。",
  "settings.webSearch.providerRequestsMayCost": "每次真实请求都可能消耗额度或产生服务费用。",
  "settings.webSearch.fieldEnv": "保存到配置文件；也可使用环境变量：{env}",
  "settings.webSearch.fieldFile": "保存到配置文件",
  "settings.webSearch.fieldRole.api-key": "API Key",
  "settings.webSearch.fieldRole.endpoint": "服务地址",
  "settings.webSearch.fieldRole.model": "模型",
  "settings.webSearch.fieldRole.zone": "区域",
  "settings.webSearch.invalidStoredValue": "文件中的该字段不是文本值；保存文本会替换它。",
  "settings.webSearch.requiredValue": "必填值",
  "settings.webSearch.optionalValue": "可选值",
  "settings.webSearch.advancedFileOnly": "仅文件可编辑的高级设置",
  "settings.webSearch.openConfig": "打开配置文件",
  "settings.webSearch.openConfigFailed": "无法打开网络搜索配置文件",
  "settings.webSearch.testSection": "真实请求",
  "settings.webSearch.testCurrentDraft": "测试当前草稿",
  "settings.webSearch.testDraftDescription":
    "测试尚未保存的完整服务草稿，不会自动保存；该真实请求可能消耗额度或产生费用。",
  "settings.webSearch.test": "测试",
  "settings.webSearch.testing": "正在测试…",
  "settings.webSearch.statusAndFiles": "状态与高级配置",
  "settings.webSearch.capability": "HarnessOS 网络访问",
  "settings.webSearch.capabilityDescription":
    "选择 Agent 如何搜索、如何处理结果，以及是否显示实时过程。",
  "settings.webSearch.searchCapability": "网络搜索",
  "settings.webSearch.searchCapabilityDescription":
    "按当前路由执行搜索；重新检查会发送一次真实请求，可能消耗额度。",
  "settings.webSearch.readCapability": "打开并读取网页",
  "settings.webSearch.readCapabilityDescription":
    "直接链接与已有搜索结果的内容读取不依赖搜索路由是否可用。",
  "settings.webSearch.readCapabilityStatus": "可读取直接链接",
  "settings.webSearch.reviewCapability": "来源处理",
  "settings.webSearch.reviewCapabilityDescription":
    "当前方式决定直接返回、自动摘要，或等待你审查来源。",
  "settings.webSearch.possible": "可用",
  "settings.webSearch.needsConfiguration": "请设置当前选择的服务",
  "settings.webSearch.recheck": "重新检查",
  "settings.webSearch.rechecking": "正在检查…",
  "settings.webSearch.configFile": "配置文件",
  "settings.webSearch.configFileDescription":
    "高级编辑与常用设置共用一个私有 web-search.json 文件。",
  "settings.webSearch.probe.ready": "本次真实请求成功。",
  "settings.webSearch.probe.degraded": "暂时不可用，仍可稍后重试。",
  "settings.webSearch.probe.unavailable": "已穷尽当前配置的路由；请修复服务后重新检查。",
  "settings.webSearch.probe.failed": "本次服务测试失败；这不会形成永久连接状态。",
  "settings.webSearch.probeReason.request-succeeded": "本次真实请求成功。",
  "settings.webSearch.probeReason.temporary-failure":
    "服务暂时不可用。可以稍后重试，或继续使用自动路由。",
  "settings.webSearch.probeReason.route-exhausted": "当前路由均未成功。请修复服务后重新检查。",
  "settings.webSearch.probeReason.provider-failed": "本次测试失败。请检查服务详情后重试。",
  "settings.webSearch.probeReason.credential-rejected": "凭据被拒绝。请检查或更换凭据。",
  "settings.webSearch.probeReason.quota-exhausted":
    "本次请求达到服务额度。请稍后重试或改用其他路由。",
  "settings.webSearch.probeReason.missing-configuration": "请补齐必填内容后再测试。",
  "settings.webSearch.probeReason.network-failure":
    "网络请求失败。配置可能仍然有效；可稍后重试或使用自动路由。",
  "settings.webSearch.probeReason.request-cancelled": "测试已取消，未形成任何长期连接状态。",
  "settings.webSearch.toolStates": "配置文件中的工具状态",
  "settings.webSearch.tool.webSearch": "联网搜索",
  "settings.webSearch.tool.sourceCheck": "检查来源片段",
  "settings.webSearch.tool.fetchContent": "读取网页内容",
  "settings.webSearch.tool.getSearchContent": "继续读取已有结果",
  "settings.webSearch.tool.available": "可用",
  "settings.webSearch.tool.fileDisabled": "已在配置文件中关闭",
  "settings.webSearch.tool.fileLevelDescription": "高手可在配置文件中单独控制该工具。",
  "settings.webSearch.conflictTitle": "配置文件已在草稿之外发生变化",
  "settings.webSearch.conflictDescription":
    "你的草稿已保留。请重新加载文件，或明确用当前草稿覆盖。",
  "settings.webSearch.recovery.damaged-json":
    "配置文件不是有效的 JSON。原文件已保留；请打开文件修复语法。",
  "settings.webSearch.recovery.invalid-root": "配置文件结构不受支持。原文件已保留。",
  "settings.webSearch.recovery.future-schema":
    "该文件由更新版本的 HarnessOS 写入。请先更新 HarnessOS，再在此编辑。",
  "settings.webSearch.recovery.too-large":
    "此配置文件过大，无法安全读取。原文件已保留。请缩小文件后重新加载。",
  "settings.webSearch.recovery.unsafe-path":
    "HarnessOS 无法安全使用该配置文件。请检查文件及其权限。",
  "settings.webSearch.reloadFile": "重新加载文件",
  "settings.webSearch.overwriteWithDraft": "用草稿覆盖",
  "settings.webSearch.recoveryTitle": "配置文件需要恢复",
  "settings.webSearch.geminiAccount": "Gemini Web 账号",
  "settings.webSearch.geminiAccountDescription":
    "显式检查 Gemini Web Cookie 路径使用的 Chromium Profile 与 Google 账号。",
  "settings.webSearch.inspectAccount": "检查账号",
  "settings.webSearch.geminiUnavailable": "未找到可用的 Gemini Web Chromium 账号。",
  "settings.webSearch.geminiDiagnosticFailed": "无法检查 Gemini Web 账号",
  "settings.webSearch.geminiDiagnosticRecovery": "请重试，或在配置文件中检查 Chromium Profile。",
} as const;

export const SETTINGS_WEB_SEARCH_MESSAGES = defineMessageSlice(EN_MESSAGES, ZH_CN_MESSAGES);
