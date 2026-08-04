export type WorkbenchLocale = "en" | "zh-CN";

const WORKBENCH_COPY = {
  en: {
    agent: "Agent",
    chat: "Chat",
    newAgent: "New agent",
    newChat: "New chat",
    settings: "Settings",
    backToApp: "Back to app",
    searchSettings: "Search settings",
    noMatchingSettings: "No matching settings.",
    settingsSearchResults: "Settings search results",
    settingsSections: "Settings sections",
    settingsGroupPersonal: "Personal",
    settingsGroupIntegrations: "Integrations",
    settingsGroupCoding: "Coding",
    settingsGroupSystem: "System",
    settingsGroupArchived: "Archived",
    settingsGeneral: "General",
    settingsProfile: "Profile",
    settingsAppearance: "Appearance",
    settingsNotifications: "Notifications",
    settingsBehavior: "Chat behavior",
    settingsShortcuts: "Keyboard shortcuts",
    settingsUsage: "Usage & limits",
    settingsAppSnap: "AppSnap",
    settingsIntegrations: "MCP connections",
    settingsWorktrees: "Managed worktrees",
    settingsAdvanced: "System tools",
    settingsArchived: "Archived threads",
    handOff: "Hand off",
    handOffThread: "Hand off thread",
    createHandOffThread: "Create handoff thread",
    handOffTo: "Hand off to",
    unsentDraft: "unsent draft",
    surfaceSwitcherLabel: "Agent and Chat",
    projects: "Projects",
    groups: "Groups",
    recent: "Recent",
    noProjects: "No projects yet",
    noGroups: "No groups yet",
    groupsUnavailable:
      "Groups are unavailable until Product Group facts are connected. Projects and conversations are unchanged.",
    models: "Models",
    agents: "Agents",
    packages: "Packages",
    modelsDescription: "Connections, models, thinking levels, authentication, and health.",
    agentsDescription:
      "Native and external agents, their capability evidence, permissions, and diagnostics.",
    agentsBoundary:
      "Agent capability parity is not inferred. The provider controls below remain available while typed Agent evidence is connected.",
    packagesDescription:
      "Discovery, source evidence, compatibility, activation, updates, rollback, and licenses.",
    packagesBoundary:
      "Exact rights, trust, activation, and rollback facts are not connected yet. Existing discovery and Skill behavior remain available without claiming Package readiness.",
    openPackageDiscovery: "Open legacy plugin and skill discovery",
    noRecentChats: "No recent chats",
    loadingRecentChats: "Loading recent chats…",
    agentEmptyHeading: "What should we build?",
    chatEmptyHeading: "What should we talk through?",
    chatEmptyTitle: "Start a conversation when you are ready",
    chatEmptyDescription:
      "Nothing was restored or replayed. A new Chat has no Primary Folder and starts with read-only references.",
    conversationMissingTitle: "This conversation is unavailable",
    conversationMissingDescription:
      "It is not present in the current Product conversation inventory. OmniMind did not infer, restore, or replay it.",
    backToChatRecent: "Back to Chat recent",
    startNewConversation: "Start new conversation",
    productShellTimeout:
      "Chat is taking too long to load. Product state remains authoritative; no conversation was inferred.",
    productShellUnavailable:
      "Chat state is unavailable because Product facts could not be synchronized.",
    draftWorkspaceUnavailable:
      "A new Chat cannot be prepared because the private draft workspace is unavailable. Existing Product conversations remain readable.",
    unablePrepareNewChat: "Unable to prepare a new Chat.",
    renameUnavailableTitle: "Rename unavailable",
    renameUnavailableDescription: "This Product Conversation does not expose a rename command yet.",
    queueMessage: "Add to Queue",
    queueQueuedFollowUp: "Queued follow-up",
    queueCodeBlock: "Code block",
    queueSteer: "Steer",
    queueMoveNext: "Move next",
    queueEditing: "Editing",
    queueCancelEdit: "Cancel edit",
    queueDeleteFollowUp: "Delete queued follow-up",
    queueActions: "Queued follow-up actions",
    queueEditPrompt: "Edit queued prompt",
    queueDeletePrompt: "Delete queued prompt",
    queueDeleteError: "Failed to delete queued prompt.",
    queueReorderError: "Failed to reorder queued prompt.",
    queuePutError: "Failed to add this message to Product Queue.",
    composerApproval: "Resolve this approval request to continue",
    composerQuestion: "Type your answer to continue",
    composerQuestionWithOptions:
      "Type your own answer, or leave this blank to use the selected option",
    composerPlanFeedback: "Add feedback to refine the plan, or leave this blank to implement it",
    composerSubagent: "Message this subagent while it works",
    composerFollowUp: "Ask for follow-up changes",
    composerFollowUpWithAttachments: "Ask for follow-up changes or attach images",
    composerDefault: "Ask anything, @tag files/folders, or use / to show available commands",
    permissionApprovalLabel: "Ask for approval",
    permissionApprovalDescription: "Always ask before editing external files or using the internet",
    permissionAutoLabel: "Approve for me",
    permissionAutoDescription: "Only ask for actions detected as potentially unsafe",
    permissionFullAccessLabel: "Full access",
    permissionFullAccessDescription:
      "Unrestricted access to the internet and any file on your computer",
    changePermissions: "Click to change permissions",
    thinkingNone: "None",
    thinkingMinimal: "Minimal",
    thinkingLow: "Low",
    thinkingMedium: "Medium",
    thinkingHigh: "High",
    thinkingExtraHigh: "Extra high",
    thinkingMax: "Max",
    productLoadingLabel: "Reading Product state",
    productLoadingTitle: "Loading conversation…",
    productLoadingDescription:
      "The UI is waiting for typed Product facts. No Engine state is inferred.",
    productUnavailableLabel: "Conversation unavailable",
    productUnavailableTitle: "Conversation temporarily unavailable",
    productUnavailableDescription:
      "The last typed Product state remains authoritative. Re-enter when the Product Service is available.",
    executionUnavailableLabel: "Execution unavailable",
    executionUnavailableTitle: "Conversation available; execution unavailable",
    executionUnavailableDescription:
      "This conversation and its Queue remain available. New dispatch waits until Product, Host, and Engine readiness are proved.",
    systemHealthServiceRecovering:
      "Product Service is recovering. Existing conversation and workbench state remain available read-only.",
    systemHealthHostCircuitOpen:
      "Native Host restart protection is open. Drafts and Queue are preserved; execution remains unavailable.",
    systemHealthHostRestarting:
      "Native Host is restarting. Drafts and Queue are preserved; execution is temporarily unavailable.",
    systemHealthExecutionUnavailable:
      "Native execution is not connected yet. Drafts and Queue remain available; dispatch is unavailable.",
    systemHealthRetryHost: "Retry Host",
    productRejectedLabel: "Request rejected",
    productRejectedTitle: "The request was not accepted",
    productDeliveryUnknownLabel: "Delivery unknown",
    productDeliveryUnknownTitle: "Delivery could not be confirmed",
    productDeliveryUnknownDescription:
      "Your request remains visible. OmniMind will not replay it automatically.",
    productOutcomeUnknownLabel: "Outcome unknown",
    productOutcomeUnknownTitle: "The final outcome could not be confirmed",
    productOutcomeUnknownDescription:
      "The Engine accepted the request, but Product cannot prove how it settled. Review activity before deciding what to do next.",
  },
  "zh-CN": {
    agent: "Agent",
    chat: "Chat",
    newAgent: "新建 Agent",
    newChat: "新建 Chat",
    settings: "设置",
    backToApp: "返回应用",
    searchSettings: "搜索设置",
    noMatchingSettings: "没有匹配的设置。",
    settingsSearchResults: "设置搜索结果",
    settingsSections: "设置分区",
    settingsGroupPersonal: "个人",
    settingsGroupIntegrations: "集成",
    settingsGroupCoding: "开发",
    settingsGroupSystem: "系统",
    settingsGroupArchived: "归档",
    settingsGeneral: "通用",
    settingsProfile: "个人资料",
    settingsAppearance: "外观",
    settingsNotifications: "通知",
    settingsBehavior: "Chat 行为",
    settingsShortcuts: "键盘快捷键",
    settingsUsage: "用量与限额",
    settingsAppSnap: "AppSnap",
    settingsIntegrations: "MCP 连接",
    settingsWorktrees: "托管工作树",
    settingsAdvanced: "系统工具",
    settingsArchived: "已归档对话",
    handOff: "移交",
    handOffThread: "移交此对话",
    createHandOffThread: "创建移交对话",
    handOffTo: "移交给",
    unsentDraft: "未发送草稿",
    surfaceSwitcherLabel: "Agent 与 Chat",
    projects: "项目",
    groups: "分组",
    recent: "最近",
    noProjects: "暂无项目",
    noGroups: "暂无分组",
    groupsUnavailable: "Product Group 事实接入前，分组暂不可用；项目与对话不会被改写。",
    models: "模型",
    agents: "Agent",
    packages: "Package",
    modelsDescription: "连接、模型、思考等级、认证与健康状态。",
    agentsDescription: "原生与外部 Agent 的能力证据、权限和诊断。",
    agentsBoundary:
      "不会推测不同 Agent 的能力对等。类型化 Agent 证据接入前，以下 Provider 控件继续可用。",
    packagesDescription: "发现、来源证据、兼容、激活、更新、回滚与许可证。",
    packagesBoundary:
      "精确权利、信任、激活和回滚事实尚未接入；现有发现与 Skill 能力继续可用，但不会冒充 Package 已就绪。",
    openPackageDiscovery: "打开旧版 Plugin 与 Skill 发现",
    noRecentChats: "暂无最近对话",
    loadingRecentChats: "正在载入最近对话…",
    agentEmptyHeading: "我们要构建什么？",
    chatEmptyHeading: "我们聊点什么？",
    chatEmptyTitle: "准备好时，再开始一段对话",
    chatEmptyDescription:
      "没有恢复或重放任何内容。新 Chat 不设 Primary Folder，默认仅使用只读引用。",
    conversationMissingTitle: "此对话当前不可用",
    conversationMissingDescription:
      "当前 Product 对话清单中不存在它；OmniMind 没有推测、恢复或重放该对话。",
    backToChatRecent: "返回 Chat 最近对话",
    startNewConversation: "开始新对话",
    productShellTimeout: "Chat 载入时间过长。Product 状态仍是权威事实，界面没有推测任何对话。",
    productShellUnavailable: "Product 事实无法同步，Chat 状态当前不可用。",
    draftWorkspaceUnavailable:
      "私有草稿工作区不可用，暂时无法准备新 Chat；已有 Product 对话仍可读取。",
    unablePrepareNewChat: "无法准备新的 Chat。",
    renameUnavailableTitle: "暂不支持重命名",
    renameUnavailableDescription: "此 Product Conversation 尚未提供重命名命令。",
    queueMessage: "加入队列",
    queueQueuedFollowUp: "队列中的后续消息",
    queueCodeBlock: "代码块",
    queueSteer: "调整方向",
    queueMoveNext: "移到下一项",
    queueEditing: "正在编辑",
    queueCancelEdit: "取消编辑",
    queueDeleteFollowUp: "删除队列中的后续消息",
    queueActions: "队列消息操作",
    queueEditPrompt: "编辑队列消息",
    queueDeletePrompt: "删除队列消息",
    queueDeleteError: "无法删除队列消息。",
    queueReorderError: "无法调整队列顺序。",
    queuePutError: "无法将此消息加入 Product 队列。",
    composerApproval: "处理此审批请求后继续",
    composerQuestion: "输入回答后继续",
    composerQuestionWithOptions: "输入自定义回答，或留空使用已选选项",
    composerPlanFeedback: "补充反馈以完善计划，或留空直接实施",
    composerSubagent: "向正在工作的子 Agent 发送消息",
    composerFollowUp: "补充后续修改要求",
    composerFollowUpWithAttachments: "补充后续修改要求或添加图片",
    composerDefault: "输入任何问题，使用 @ 引用文件或文件夹，或输入 / 查看命令",
    permissionApprovalLabel: "需要审批",
    permissionApprovalDescription: "编辑外部文件或访问网络前始终询问",
    permissionAutoLabel: "自动审批",
    permissionAutoDescription: "仅在操作可能不安全时询问",
    permissionFullAccessLabel: "完全访问",
    permissionFullAccessDescription: "可访问网络和电脑上的任意文件",
    changePermissions: "点击更改权限",
    thinkingNone: "无",
    thinkingMinimal: "极简",
    thinkingLow: "低",
    thinkingMedium: "中",
    thinkingHigh: "高",
    thinkingExtraHigh: "超高",
    thinkingMax: "最高",
    productLoadingLabel: "正在读取 Product 状态",
    productLoadingTitle: "正在载入对话…",
    productLoadingDescription: "界面正在等待类型化 Product 事实，不会推测 Engine 状态。",
    productUnavailableLabel: "对话不可用",
    productUnavailableTitle: "对话暂时不可用",
    productUnavailableDescription:
      "最后一次类型化 Product 状态仍是权威事实，请在 Product Service 恢复后重新进入。",
    executionUnavailableLabel: "执行不可用",
    executionUnavailableTitle: "对话可读，执行暂不可用",
    executionUnavailableDescription:
      "此对话与队列仍然可用；只有 Product、Host 与 Engine 就绪状态得到证明后，才会发起新的 dispatch。",
    systemHealthServiceRecovering: "Product Service 正在恢复；已有对话与工作台状态仍可只读访问。",
    systemHealthHostCircuitOpen: "Native Host 已触发重启保护；草稿与队列均已保留，执行仍不可用。",
    systemHealthHostRestarting: "Native Host 正在重启；草稿与队列均已保留，执行暂时不可用。",
    systemHealthExecutionUnavailable:
      "Native execution 尚未连接；草稿与队列仍然可用，但暂时无法 dispatch。",
    systemHealthRetryHost: "重试 Host",
    productRejectedLabel: "请求被拒绝",
    productRejectedTitle: "请求未被接纳",
    productDeliveryUnknownLabel: "送达状态未知",
    productDeliveryUnknownTitle: "无法确认请求是否送达",
    productDeliveryUnknownDescription: "请求仍然可见，OmniMind 不会自动重放。",
    productOutcomeUnknownLabel: "结果状态未知",
    productOutcomeUnknownTitle: "无法确认最终结果",
    productOutcomeUnknownDescription:
      "Engine 已接纳请求，但 Product 无法证明其最终结算状态。请先检查活动记录，再决定下一步。",
  },
} as const;

export type WorkbenchCopy = {
  readonly [Key in keyof (typeof WORKBENCH_COPY)["en"]]: string;
};

export function resolveWorkbenchLocale(language?: string | null): WorkbenchLocale {
  return language?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function getWorkbenchCopy(locale?: WorkbenchLocale): WorkbenchCopy {
  return WORKBENCH_COPY[locale ?? resolveWorkbenchLocale(globalThis.navigator?.language)];
}

export function localizeWorkbenchTraitLabel(label: string, locale?: WorkbenchLocale): string {
  const copy = getWorkbenchCopy(locale);
  switch (label.trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " ")) {
    case "none":
    case "off":
      return copy.thinkingNone;
    case "minimal":
      return copy.thinkingMinimal;
    case "low":
      return copy.thinkingLow;
    case "medium":
      return copy.thinkingMedium;
    case "high":
      return copy.thinkingHigh;
    case "extra high":
    case "xhigh":
      return copy.thinkingExtraHigh;
    case "max":
      return copy.thinkingMax;
    default:
      return label;
  }
}
