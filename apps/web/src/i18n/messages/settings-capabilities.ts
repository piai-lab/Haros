import { defineMessageSlice } from "../messageCatalog";

const EN_MESSAGES = {
  "settings.skills": "Agent skills",
  "settings.prompts": "Prompts",
  "settings.builtInTools": "Built-in tools",
  "settings.promptsDescription":
    "Customize HarnessOS Agent's default instructions and personal rules.",
  "settings.defaultPrompt": "Default prompt",
  "settings.defaultPromptDescription":
    "Sets the basic way HarnessOS Agent works. Dynamic tools, skills, and project context remain automatic.",
  "settings.defaultPromptSourceNotice":
    "HarnessOS built-in default. Saved changes apply to tasks and conversations started afterward.",
  "settings.defaultPromptCustomizedNotice":
    "Customized for HarnessOS Agent. Saved changes apply to tasks and conversations started afterward.",
  "settings.promptRestoreFailed": "Could not restore the default prompt",
  "settings.customRules": "Custom rules",
  "settings.customRulesDescription":
    "Personal preferences that HarnessOS Agent applies across all of your projects.",
  "settings.customRulesCreateNotice": "AGENTS.md will be created on the first non-empty save.",
  "settings.customRulesTooLarge":
    "These custom rules are too large to edit here. Use the location below to make changes.",
  "settings.customRulesUnavailable":
    "These custom rules cannot be edited here. Use the location below to make changes.",
  "settings.promptOpenFailed": "Could not open the custom rules location",
  "settings.promptByteCount": "{current} of {max} bytes",
  "settings.promptInvalidText":
    "Use valid text without unsupported control characters. Tabs and line breaks are allowed.",
  "settings.promptSaved": "Global instructions saved",
  "settings.promptAlreadyCurrent": "Already up to date",
  "settings.promptSaveFailed": "Could not save instructions",
  "settings.promptSaveFailedDescription": "Your draft is still here. Check it and try again.",
  "settings.promptRemoveFailed": "Could not delete custom rules",
  "settings.promptRemoveFailedDescription":
    "Nothing was removed. Reload the current rules and try again.",
  "settings.promptConflictTitle": "This setting changed elsewhere",
  "settings.promptContentChanged": "Your draft was not overwritten or saved over the newer value.",
  "settings.promptSourceChanged":
    "The source of your custom rules changed. Reload before making another change.",
  "settings.reloadPromptValue": "Reload current value",
  "settings.keepPromptDraft": "Keep my draft",
  "settings.removeCustomRulesTitle": "Delete your custom rules?",
  "settings.removeCustomRulesDescription":
    "If another personal rule already exists, HarnessOS may use it next.",
  "settings.promptsUnavailable":
    "Prompt settings are unavailable right now. Nothing was changed; try again.",
  "settings.skillsDescription":
    "Review reusable workflows discovered across all configured engines.",
  "settings.builtInToolsDescription":
    "Choose which HarnessOS built-in tools are available in Agent, Chat, and Studio.",
  "settings.portableSkills": "Portable skills",
  "settings.skillsFolder": "HarnessOS skills folder",
  "settings.skillsFolderDescription":
    "Skills placed here are projected into compatible Engines without copying into their private homes. Same-named Engine-native assets remain separate.",
  "settings.scanning": "Scanning…",
  "settings.skillDiscoveryFailed": "Skill discovery failed",
  "settings.skillDiscoveryFailedDescription":
    "HarnessOS could not scan the skill folders. Retry after checking that the server is running.",
  "settings.noSkills": "No skills found",
  "settings.noSkillsDescription":
    "Add a skill folder containing a SKILL.md to the HarnessOS skills folder above, or install skills for any supported engine.",
  "settings.totalPrompts": "Total prompts",
  "settings.promptSingular": "prompt",
  "settings.promptPlural": "prompts",
  "settings.skillsExplored": "Skills explored",
  "settings.enabledSkillsSummary": "{enabled} of {total} HarnessOS skills enabled",
  "settings.enableHarnessOSSkill": "Enable the {skill} HarnessOS skill",
  "settings.builtInToolsForAgents": "Agent access",
  "settings.builtInToolsForAgentsDescription":
    "These controls affect every Agent, including HarnessOS Agent. They do not turn off the Browser or Device panels you use directly. New calls are checked immediately; tool lists update in a new session or after a supported reload.",
  "settings.builtInToolGroups": "Tool groups",
  "settings.builtInToolsForSurfacesDescription":
    "Choose which built-in tool groups are available in Agent, Chat, and Studio. These settings do not control engine-native tools, skills, or the Browser and Device panels you use directly.",
  "settings.builtInRestoreRecommended": "Restore recommended defaults",
  "settings.builtInGroupTasks": "Tasks",
  "settings.builtInGroupTasksDescription":
    "Lets Agents inspect, create, coordinate, interrupt, rename, and archive HarnessOS tasks.",
  "settings.builtInGroupDiagnostics": "Diagnostics",
  "settings.builtInGroupDiagnosticsDescription":
    "Lets Agents inspect task activity, durable events, runtime events, and bounded diagnostic snapshots.",
  "settings.builtInGroupGoals": "Goals",
  "settings.builtInGroupGoalsDescription":
    "Lets Agents manage explicit persistent goals for HarnessOS tasks.",
  "settings.builtInGroupAutomations": "Automations",
  "settings.builtInGroupAutomationsDescription":
    "Lets Agents create, inspect, update, stop, and report scheduled HarnessOS automations.",
  "settings.builtInGroupBrowser": "Browser",
  "settings.builtInGroupBrowserDescription":
    "Lets Agents work with HarnessOS's shared in-app browser when it is available.",
  "settings.builtInGroupDevice": "Device",
  "settings.builtInGroupDeviceDescription":
    "Lets Agents inspect and control supported local device runtimes when they are available.",
  "settings.builtInAvailable": "Available",
  "settings.builtInDegraded": "Partially available",
  "settings.builtInUnavailable": "Unavailable",
  "settings.builtInDisabled": "Disabled",
  "settings.builtInEnabled": "Enabled",
  "settings.builtInEnabledUnavailable": "Enabled, currently unavailable",
  "settings.builtInEnabledDegraded": "Enabled, some tools available",
  "settings.builtInUnsupported": "Not available in this surface",
  "settings.builtInSaving": "Saving…",
  "settings.builtInToolCount": "{available} of {total} tools currently available",
  "settings.builtInGroupSurfaceToggle": "Use {group} in {surface}",
  "settings.builtInSessionTiming":
    "Turning a group off takes effect immediately. Re-enabled tools are provided in a new session or after a reload.",
  "settings.builtInToolAvailabilitySummary": "{state} · {available} of {total} tools available",
  "settings.builtInGroupToggle": "Allow Agents to use {group}",
  "settings.loadingBuiltInToolGroups": "Loading built-in tools…",
  "settings.builtInGroupsUnavailable": "Built-in tools are unavailable",
  "settings.builtInGroupsUnavailableDescription":
    "HarnessOS could not load the current built-in tool status. Try again after the server reconnects.",
  "settings.builtInUpdateFailed": "Could not update built-in tools",
  "settings.builtInUpdateFailedDescription":
    "HarnessOS restored the server's current setting. Try again.",
  "settings.builtInRefreshFailed": "Setting saved; status could not refresh",
  "settings.builtInRefreshFailedDescription":
    "Your choice is saved. HarnessOS will refresh the current tool status after reconnecting.",
  "settings.builtInRefreshFailedInline":
    "Your choice is saved, but the current tool status could not be refreshed.",
  "settings.builtInConfirmationFailed": "Could not confirm the setting",
  "settings.builtInConfirmationFailedDescription":
    "HarnessOS could not confirm whether your choice was saved. It will refresh after reconnecting.",
  "settings.builtInConfirmationFailedInline":
    "HarnessOS could not confirm whether your choice was saved. The current choice is kept until the server status refreshes.",
  "settings.examplePromptCopied": "Example prompt copied",
  "settings.copyExamplePrompt": "Copy example prompt",
} as const;

const ZH_CN_MESSAGES = {
  "settings.skills": "Agent 技能",
  "settings.prompts": "提示词",
  "settings.builtInTools": "内置工具",
  "settings.promptsDescription": "自定义 HarnessOS Agent 的默认指令与个人规则。",
  "settings.defaultPrompt": "默认提示词",
  "settings.defaultPromptDescription":
    "决定 HarnessOS Agent 的基础工作方式；工具、技能与项目上下文仍会自动组合。",
  "settings.defaultPromptSourceNotice":
    "HarnessOS 内置默认；保存的修改会用于之后启动的任务和对话。",
  "settings.defaultPromptCustomizedNotice":
    "已为 HarnessOS Agent 自定义；保存的修改会用于之后启动的任务和对话。",
  "settings.promptRestoreFailed": "无法恢复默认提示词",
  "settings.customRules": "自定义规则",
  "settings.customRulesDescription": "HarnessOS Agent 在所有项目中使用的个人偏好与规则。",
  "settings.customRulesCreateNotice": "首次保存非空内容后会创建 AGENTS.md。",
  "settings.customRulesTooLarge": "自定义规则过大，无法在此编辑。请使用下方位置进行修改。",
  "settings.customRulesUnavailable": "自定义规则无法在此编辑。请使用下方位置进行修改。",
  "settings.promptOpenFailed": "无法打开自定义规则所在位置",
  "settings.promptByteCount": "{current} / {max} 字节",
  "settings.promptInvalidText": "请输入有效文本并移除不支持的控制字符；制表符和换行符可以保留。",
  "settings.promptSaved": "全局指令已保存",
  "settings.promptAlreadyCurrent": "当前内容已是最新",
  "settings.promptSaveFailed": "无法保存指令",
  "settings.promptSaveFailedDescription": "草稿仍然保留。请检查后重试。",
  "settings.promptRemoveFailed": "无法删除自定义规则",
  "settings.promptRemoveFailedDescription": "没有删除任何内容。请重新载入当前规则后重试。",
  "settings.promptConflictTitle": "这项设置已在其他位置发生变化",
  "settings.promptContentChanged": "没有覆盖较新的内容，你的草稿也仍然保留。",
  "settings.promptSourceChanged": "自定义规则的来源已经改变，请先重新载入再继续修改。",
  "settings.reloadPromptValue": "重新载入当前内容",
  "settings.keepPromptDraft": "保留我的草稿",
  "settings.removeCustomRulesTitle": "要删除自定义规则吗？",
  "settings.removeCustomRulesDescription": "如果已有另一份个人规则，HarnessOS 接下来可能会采用它。",
  "settings.promptsUnavailable": "暂时无法读取提示词设置。没有修改任何内容，请重试。",
  "settings.skillsDescription": "查看从所有已配置引擎中发现的可复用工作流。",
  "settings.builtInToolsDescription": "选择 HarnessOS 内置工具可在哪些工作面使用。",
  "settings.portableSkills": "可移植技能",
  "settings.skillsFolder": "HarnessOS 技能文件夹",
  "settings.skillsFolderDescription":
    "这里的技能会投影到兼容的引擎，不会复制到其私有目录；同名引擎原生资产保持独立。",
  "settings.scanning": "正在扫描…",
  "settings.skillDiscoveryFailed": "技能发现失败",
  "settings.skillDiscoveryFailedDescription":
    "HarnessOS 无法扫描技能文件夹；请确认服务正在运行后重试。",
  "settings.noSkills": "未找到技能",
  "settings.noSkillsDescription":
    "请在上方 HarnessOS 技能文件夹中添加包含 SKILL.md 的技能文件夹，或为受支持的引擎安装技能。",
  "settings.totalPrompts": "提示词总数",
  "settings.promptSingular": "提示词",
  "settings.promptPlural": "提示词",
  "settings.skillsExplored": "探索过的技能",
  "settings.enabledSkillsSummary": "已启用 {enabled}/{total} 个 HarnessOS 技能",
  "settings.enableHarnessOSSkill": "启用 HarnessOS 技能：{skill}",
  "settings.builtInToolsForAgents": "Agent 访问权限",
  "settings.builtInToolsForAgentsDescription":
    "这些开关作用于所有 Agent，包括 HarnessOS Agent；不会关闭你直接使用的浏览器或设备面板。新调用会立即按当前设置检查，工具列表在新会话或受支持的重新加载后更新。",
  "settings.builtInToolGroups": "工具组",
  "settings.builtInToolsForSurfacesDescription":
    "选择每组内置工具可在哪些工作面使用。这些设置不控制引擎原生工具、技能，也不会关闭你直接使用的浏览器或设备面板。",
  "settings.builtInRestoreRecommended": "恢复推荐默认",
  "settings.builtInGroupTasks": "任务",
  "settings.builtInGroupTasksDescription":
    "允许 Agent 查看、创建、协调、中断、重命名和归档 HarnessOS 任务。",
  "settings.builtInGroupDiagnostics": "诊断",
  "settings.builtInGroupDiagnosticsDescription":
    "允许 Agent 检查任务活动、持久事件、运行时事件和有界诊断快照。",
  "settings.builtInGroupGoals": "目标",
  "settings.builtInGroupGoalsDescription": "允许 Agent 管理 HarnessOS 任务中明确设置的持续目标。",
  "settings.builtInGroupAutomations": "自动化",
  "settings.builtInGroupAutomationsDescription":
    "允许 Agent 创建、检查、更新、停止和报告定时自动化。",
  "settings.builtInGroupBrowser": "浏览器",
  "settings.builtInGroupBrowserDescription":
    "在可用时允许 Agent 使用 HarnessOS 共享的应用内浏览器。",
  "settings.builtInGroupDevice": "设备",
  "settings.builtInGroupDeviceDescription": "在可用时允许 Agent 检查和控制受支持的本机设备运行时。",
  "settings.builtInAvailable": "可用",
  "settings.builtInDegraded": "部分可用",
  "settings.builtInUnavailable": "不可用",
  "settings.builtInDisabled": "已关闭",
  "settings.builtInEnabled": "已开启",
  "settings.builtInEnabledUnavailable": "已开启，当前不可用",
  "settings.builtInEnabledDegraded": "已开启，部分工具当前可用",
  "settings.builtInUnsupported": "此工作面不可用",
  "settings.builtInSaving": "正在保存…",
  "settings.builtInToolCount": "当前 {available}/{total} 个工具可用",
  "settings.builtInGroupSurfaceToggle": "在{surface}中使用{group}",
  "settings.builtInSessionTiming": "关闭会立即生效。重新启用的工具会在新会话或重新加载后提供。",
  "settings.builtInToolAvailabilitySummary": "{state} · {available}/{total} 个工具可用",
  "settings.builtInGroupToggle": "允许 Agent 使用{group}",
  "settings.loadingBuiltInToolGroups": "正在加载内置工具…",
  "settings.builtInGroupsUnavailable": "内置工具不可用",
  "settings.builtInGroupsUnavailableDescription":
    "HarnessOS 无法加载当前内置工具状态；请在服务器重新连接后重试。",
  "settings.builtInUpdateFailed": "无法更新内置工具",
  "settings.builtInUpdateFailedDescription": "HarnessOS 已恢复服务器当前设置，请重试。",
  "settings.builtInRefreshFailed": "设置已保存，但无法刷新状态",
  "settings.builtInRefreshFailedDescription":
    "你的选择已经保存；HarnessOS 会在重新连接后刷新当前工具状态。",
  "settings.builtInRefreshFailedInline": "你的选择已经保存，但当前工具状态暂时无法刷新。",
  "settings.builtInConfirmationFailed": "无法确认设置结果",
  "settings.builtInConfirmationFailedDescription":
    "HarnessOS 暂时无法确认你的选择是否已保存；重新连接后会刷新服务器状态。",
  "settings.builtInConfirmationFailedInline":
    "HarnessOS 暂时无法确认你的选择是否已保存；在服务器状态刷新前会保留当前选择。",
  "settings.examplePromptCopied": "示例提示已复制",
  "settings.copyExamplePrompt": "复制示例提示",
} as const;

export const SETTINGS_CAPABILITIES_MESSAGES = defineMessageSlice(EN_MESSAGES, ZH_CN_MESSAGES);
