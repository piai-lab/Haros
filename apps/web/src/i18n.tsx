import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAppSettings } from "./appSettings";
import { resolveAppLocale, type AppLocale } from "./locale";

export const EN_MESSAGES = {
  "common.system": "System",
  "common.chinese": "简体中文",
  "common.english": "English",
  "common.search": "Search",
  "common.onDefault": "On (default)",
  "common.off": "Off",
  "shell.switchSurface": "Switch between Agent and Chat",
  "shell.activity": "Activity",
  "shell.activityDescription":
    "See running tasks, completed work, and anything that needs your attention.",
  "shell.activityView": "Activity view",
  "shell.switchToActivity": "Switch to activity view",
  "shell.switchToAgent": "Switch to Agent view",
  "nav.agent": "Agent",
  "nav.chat": "Chat",
  "nav.agentDescription": "Folder-backed agent work",
  "nav.chatDescription": "Open-ended conversations",
  "nav.projects": "Projects",
  "nav.groups": "Groups",
  "nav.newGroup": "New Group",
  "nav.newAgent": "New Agent",
  "nav.newChat": "New Chat",
  "nav.addProject": "Add Project",
  "nav.library": "Library",
  "nav.settings": "Settings",
  "nav.noChats": "No chats yet",
  "nav.loadingChat": "Loading Chat…",
  "composer.send": "Send message",
  "composer.sendToAgent": "Send to Agent",
  "composer.thinking": "Thinking",
  "composer.resolveApproval": "Resolve this approval request to continue",
  "composer.answer": "Type your answer to continue",
  "composer.answerOrOption": "Type your own answer, or leave this blank to use the selected option",
  "composer.planFeedback": "Add feedback to refine the plan, or leave this blank to implement it",
  "composer.messageSubagent": "Message this subagent while it works",
  "composer.followUp": "Ask for follow-up changes",
  "composer.followUpWithImages": "Ask for follow-up changes or attach images",
  "composer.askAnything": "Ask anything, @tag files/folders, or use / to show available commands",
  "composer.emptyChat": "What should we work on?",
  "composer.emptyAgentPrefix": "What should we do in",
  "composer.emptyAgentSuffix": "?",
  "composer.thisFolder": "this folder",
  "timeline.thinking": "Thinking",
  "timeline.details": "Details",
  "timeline.workedFor": "Worked for {duration}",
  "timeline.copyMessage": "Copy message",
  "timeline.copyClipboard": "Copy to clipboard",
  "timeline.copied": "Copied!",
  "timeline.copyFailed": "Failed to copy",
  "timeline.scrollBottom": "Scroll to bottom",
  "workbench.environment": "Workbench",
  "workbench.changes": "Changes",
  "workbench.files": "Files",
  "workbench.hideFiles": "Hide files sidebar",
  "workbench.diff": "Diff",
  "workbench.hideDiff": "Hide diff sidebar",
  "workbench.searchFiles": "Search files",
  "workbench.hideSearch": "Hide search sidebar",
  "workbench.terminal": "Terminal",
  "workbench.chat": "Chat",
  "workbench.panelSections": "Workbench sections",
  "workbench.repository": "Repository",
  "settings.backToApp": "Back to app",
  "settings.search": "Search settings…",
  "settings.searchLabel": "Search settings",
  "settings.noMatches": "No matching settings.",
  "settings.general": "General",
  "settings.generalDescription": "Choose defaults for new chats, navigation, and the Workbench.",
  "settings.profile": "Profile",
  "settings.appearance": "Appearance",
  "settings.appearanceDescription": "Customize the theme, typography, density, and time format.",
  "settings.notifications": "Notifications",
  "settings.behavior": "Chat behavior",
  "settings.behaviorDescription":
    "Control live responses, follow-ups, review defaults, and safety confirmations.",
  "settings.appsnap": "AppSnap",
  "settings.shortcuts": "Keybindings",
  "settings.worktrees": "Managed worktrees",
  "settings.archived": "Archived threads",
  "settings.models": "Models & writing",
  "settings.providers": "Agent providers",
  "settings.skills": "Agent skills",
  "settings.usage": "Usage & limits",
  "settings.integrations": "MCP connections",
  "settings.advanced": "System tools",
  "settings.groupPersonal": "Personal",
  "settings.groupIntegrations": "Integrations",
  "settings.groupCoding": "Coding",
  "settings.groupSystem": "System",
  "settings.groupArchived": "Archived",
  "settings.language": "Language",
  "settings.languageDescription": "System follows the language preference of this device.",
  "settings.coreDefaults": "Core defaults",
  "settings.defaultProvider": "Default provider",
  "settings.defaultProviderDescription": "Choose the provider used for new chats.",
  "settings.chatSurfaceDescription": "Show the Chat surface in the Agent | Chat switcher.",
  "settings.timeAndReading": "Time and reading",
  "library.plugins": "Plugins",
  "library.skills": "Skills",
  "library.title": "{provider} Library",
  "library.subtitle": "Native capabilities plus compatible OmniMind Library assets.",
  "library.searchPlugins": "Search plugins",
  "library.searchSkills": "Search skills",
  "library.workspaceRequired": "Skills need a workspace path. Open a project or thread first.",
  "library.nativeDiscoveryFailed":
    "{provider} native skill discovery failed. Any available OmniMind Library skills are shown below.",
  "library.catalogDiscoveryFailed":
    "OmniMind Library discovery failed. Any available {provider} native skills are shown below.",
  "library.pluginsUnavailable": "Plugins unavailable for {provider}",
  "library.skillsUnavailable": "Skills unavailable for {provider}",
  "library.pluginDiscoveryUnsupported": "This provider does not expose plugin discovery.",
  "library.skillDiscoveryUnsupported": "This provider does not expose skill discovery.",
  "library.noPlugins": "No installed plugins found",
  "library.onlyInstalledPlugins": "This view only shows plugins already available to {provider}.",
  "library.noSkills": "No skills found",
  "library.noSkillMatch": "No skills match this search.",
  "error.prepareAgent": "Unable to prepare the Agent thread.",
  "error.prepareChat": "Unable to prepare a new Chat.",
  "error.chatWorkspaceTimeout":
    "Chat is taking too long to load — the server has not reported its Chat folder yet.",
  "error.openFolder": "Unable to open folder",
  "error.desktopUnavailable": "The desktop connection is not available yet.",
  "error.unknown": "An unknown error occurred.",
  "updater.check": "Check for updates",
  "updater.checking": "Checking…",
  "updater.preparing": "Preparing",
  "updater.retry": "Retry",
  "updater.update": "Update",
  "updater.updating": "Updating…",
} as const;

export type MessageKey = keyof typeof EN_MESSAGES;
type MessageCatalog = { readonly [Key in MessageKey]: string };
type MessageParams = Readonly<Record<string, string | number>>;

export const ZH_CN_MESSAGES = {
  "common.system": "System",
  "common.chinese": "简体中文",
  "common.english": "English",
  "common.search": "搜索",
  "common.onDefault": "开启（默认）",
  "common.off": "关闭",
  "shell.switchSurface": "切换 Agent 与 Chat",
  "shell.activity": "动态",
  "shell.activityDescription": "查看正在运行的任务、已完成的工作，以及需要你处理的事项。",
  "shell.activityView": "动态视图",
  "shell.switchToActivity": "切换到动态视图",
  "shell.switchToAgent": "切换到 Agent 视图",
  "nav.agent": "Agent",
  "nav.chat": "Chat",
  "nav.agentDescription": "基于文件夹的智能体工作",
  "nav.chatDescription": "开放式对话",
  "nav.projects": "项目",
  "nav.groups": "分组",
  "nav.newGroup": "新建分组",
  "nav.newAgent": "新建 Agent",
  "nav.newChat": "新建 Chat",
  "nav.addProject": "添加项目",
  "nav.library": "能力库",
  "nav.settings": "设置",
  "nav.noChats": "还没有 Chat",
  "nav.loadingChat": "正在加载 Chat…",
  "composer.send": "发送消息",
  "composer.sendToAgent": "发送到 Agent",
  "composer.thinking": "思考",
  "composer.resolveApproval": "请先处理此授权请求",
  "composer.answer": "输入回答以继续",
  "composer.answerOrOption": "输入自己的回答，或留空以使用所选选项",
  "composer.planFeedback": "输入反馈以完善计划，或留空以直接实施",
  "composer.messageSubagent": "在子 Agent 工作时向它发送消息",
  "composer.followUp": "提出后续修改",
  "composer.followUpWithImages": "提出后续修改或附加图片",
  "composer.askAnything": "输入问题、用 @ 引用文件或文件夹，或输入 / 查看可用命令",
  "composer.emptyChat": "我们要一起做什么？",
  "composer.emptyAgentPrefix": "要在",
  "composer.emptyAgentSuffix": "中做什么？",
  "composer.thisFolder": "此文件夹",
  "timeline.thinking": "正在思考",
  "timeline.details": "详情",
  "timeline.workedFor": "工作了 {duration}",
  "timeline.copyMessage": "复制消息",
  "timeline.copyClipboard": "复制到剪贴板",
  "timeline.copied": "已复制",
  "timeline.copyFailed": "复制失败",
  "timeline.scrollBottom": "滚动到底部",
  "workbench.environment": "工作台",
  "workbench.changes": "更改",
  "workbench.files": "文件",
  "workbench.hideFiles": "隐藏文件侧栏",
  "workbench.diff": "差异",
  "workbench.hideDiff": "隐藏差异侧栏",
  "workbench.searchFiles": "搜索文件",
  "workbench.hideSearch": "隐藏搜索侧栏",
  "workbench.terminal": "终端",
  "workbench.chat": "Chat",
  "workbench.panelSections": "工作台分区",
  "workbench.repository": "代码仓库",
  "settings.backToApp": "返回应用",
  "settings.search": "搜索设置…",
  "settings.searchLabel": "搜索设置",
  "settings.noMatches": "没有匹配的设置。",
  "settings.general": "通用",
  "settings.generalDescription": "设置新 Chat、导航与工作台的默认行为。",
  "settings.profile": "个人资料",
  "settings.appearance": "外观",
  "settings.appearanceDescription": "自定义主题、字体、密度与时间格式。",
  "settings.notifications": "通知",
  "settings.behavior": "Chat 行为",
  "settings.behaviorDescription": "控制流式回复、后续消息、审阅默认值与安全确认。",
  "settings.appsnap": "AppSnap",
  "settings.shortcuts": "快捷键",
  "settings.worktrees": "托管工作树",
  "settings.archived": "已归档任务",
  "settings.models": "模型与写作",
  "settings.providers": "Agent Providers",
  "settings.skills": "Agent Skills",
  "settings.usage": "用量与限额",
  "settings.integrations": "MCP 连接",
  "settings.advanced": "系统工具",
  "settings.groupPersonal": "个人",
  "settings.groupIntegrations": "集成",
  "settings.groupCoding": "开发",
  "settings.groupSystem": "系统",
  "settings.groupArchived": "归档",
  "settings.language": "语言",
  "settings.languageDescription": "“系统”会跟随此设备的语言偏好。",
  "settings.coreDefaults": "核心默认值",
  "settings.defaultProvider": "默认 Provider",
  "settings.defaultProviderDescription": "选择新 Chat 默认使用的 Provider。",
  "settings.chatSurfaceDescription": "在 Agent | Chat 切换器中显示 Chat。",
  "settings.timeAndReading": "时间与阅读",
  "library.plugins": "插件",
  "library.skills": "Skills",
  "library.title": "{provider} 能力库",
  "library.subtitle": "保留 Engine 原生能力，并加入兼容的 OmniMind 能力库资产。",
  "library.searchPlugins": "搜索插件",
  "library.searchSkills": "搜索 Skills",
  "library.workspaceRequired": "Skills 需要工作区路径。请先打开项目或任务。",
  "library.nativeDiscoveryFailed":
    "{provider} 原生 Skill 发现失败。下方仍显示可用的 OmniMind 能力库 Skills。",
  "library.catalogDiscoveryFailed":
    "OmniMind 能力库发现失败。下方仍显示可用的 {provider} 原生 Skills。",
  "library.pluginsUnavailable": "{provider} 不支持插件",
  "library.skillsUnavailable": "{provider} 不支持 Skills",
  "library.pluginDiscoveryUnsupported": "此 Provider 未提供插件发现能力。",
  "library.skillDiscoveryUnsupported": "此 Provider 未提供 Skill 发现能力。",
  "library.noPlugins": "未找到已安装的插件",
  "library.onlyInstalledPlugins": "此处只显示 {provider} 已经可用的插件。",
  "library.noSkills": "未找到 Skills",
  "library.noSkillMatch": "没有与此次搜索匹配的 Skill。",
  "error.prepareAgent": "无法准备 Agent 任务。",
  "error.prepareChat": "无法准备新的 Chat。",
  "error.chatWorkspaceTimeout": "Chat 加载时间过长：服务端尚未报告 Chat 文件夹。",
  "error.openFolder": "无法打开文件夹",
  "error.desktopUnavailable": "桌面连接尚不可用。",
  "error.unknown": "发生未知错误。",
  "updater.check": "检查更新",
  "updater.checking": "正在检查…",
  "updater.preparing": "正在准备",
  "updater.retry": "重试",
  "updater.update": "更新",
  "updater.updating": "正在更新…",
} as const satisfies MessageCatalog;

export const MESSAGE_CATALOGS: Readonly<Record<AppLocale, MessageCatalog>> = {
  en: EN_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function translate(locale: AppLocale, key: MessageKey, params?: MessageParams): string {
  const message = MESSAGE_CATALOGS[locale][key];
  if (!params) return message;
  return message.replace(/\{([a-zA-Z0-9_]+)\}/g, (token, name: string) => {
    const value = params[name];
    return value === undefined ? token : String(value);
  });
}

type I18nContextValue = {
  readonly locale: AppLocale;
  readonly t: (key: MessageKey, params?: MessageParams) => string;
};

const DEFAULT_I18N_CONTEXT: I18nContextValue = {
  locale: "en",
  t: (key, params) => translate("en", key, params),
};

const I18nContext = createContext<I18nContextValue>(DEFAULT_I18N_CONTEXT);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings();
  const [systemLanguages, setSystemLanguages] = useState<readonly string[]>(() => [
    ...(globalThis.navigator?.languages ?? []),
  ]);

  useEffect(() => {
    const handleLanguageChange = () => setSystemLanguages([...(navigator.languages ?? [])]);
    globalThis.addEventListener?.("languagechange", handleLanguageChange);
    return () => globalThis.removeEventListener?.("languagechange", handleLanguageChange);
  }, []);

  const locale = resolveAppLocale(settings.localePreference, systemLanguages);
  const t = useCallback(
    (key: MessageKey, params?: MessageParams) => translate(locale, key, params),
    [locale],
  );
  const value = useMemo<I18nContextValue>(() => ({ locale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function DocumentLocaleSync() {
  const { locale } = useI18n();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
