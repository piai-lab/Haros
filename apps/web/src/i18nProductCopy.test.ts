import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { EN_MESSAGES, ZH_CN_MESSAGES } from "./i18n";
import {
  localizeSettingsSearchEntryTitle,
  rankSettingsSearchEntries,
  SETTINGS_SEARCH_RECORDS,
} from "./settingsSearchIndex";

const PRODUCT_COPY_SOURCES = [
  "routes/_chat.tsx",
  "routes/_chat.settings.tsx",
  "routes/-automations.shared.tsx",
  "routes/_chat.automations.$automationId.tsx",
  "routes/_chat.automations.index.tsx",
  "routes/_chat.automations.tsx",
  "routes/_chat.pull-requests.index.tsx",
  "routes/__root.tsx",
  "components/CreateGitHubProjectFields.tsx",
  "components/CreateProjectDialog.tsx",
  "components/ChatView.tsx",
  "components/onboarding/FirstRunReadinessDialog.tsx",
  "components/ChatMarkdown.tsx",
  "components/BrowserPanel.tsx",
  "components/BranchToolbarBranchSelector.tsx",
  "components/BranchToolbar.tsx",
  "components/DesktopWindowControls.tsx",
  "components/DiffPanel.tsx",
  "components/DiffPanelFileJumpMenu.tsx",
  "components/DiffPanelFileList.tsx",
  "components/DiffPanelPatchViewport.tsx",
  "components/DiffPanelToolbar.tsx",
  "components/EditorWorkspaceView.tsx",
  "components/FeedbackDialog.tsx",
  "components/GitCreatePrDialog.tsx",
  "components/GitActionsControl.tsx",
  "components/LocalImagePreview.tsx",
  "components/PdfFilePreview.tsx",
  "components/PluginLibrary.tsx",
  "components/PullRequestThreadDialog.tsx",
  "components/ProjectHoverCardContent.tsx",
  "components/ProjectScriptsControl.tsx",
  "components/ProjectSourceSegmentedPicker.tsx",
  "components/RecentViewSwitcher.tsx",
  "components/RenameDialog.tsx",
  "components/RenameThreadDialog.tsx",
  "components/ReviewFileTreePanel.tsx",
  "components/SettingsSidebarNav.tsx",
  "components/Sidebar.tsx",
  "components/SidebarActivityView.tsx",
  "components/SidebarStatusTrailingGlyph.tsx",
  "components/SidebarThreadRowContent.tsx",
  "components/SidebarSearchPalette.tsx",
  "components/ShortcutsDialog.tsx",
  "components/chat/ChatHeader.tsx",
  "components/chat/BrowserAnnotationChip.tsx",
  "components/chat/BrowserAnnotationStrip.tsx",
  "components/chat/AutomationCreatedCard.tsx",
  "components/chat/AgentActivityDetailView.tsx",
  "components/chat/ActiveTaskListCard.tsx",
  "components/chat/ComposerAutomationSetupBanner.tsx",
  "components/chat/ComposerCommandMenu.tsx",
  "components/chat/ComposerExtrasMenu.tsx",
  "components/chat/ComposerLocalDirectoryMenu.tsx",
  "components/chat/ComposerEnginePicker.tsx",
  "components/chat/ComposerModelEffortPicker.tsx",
  "components/chat/EngineModelPicker.tsx",
  "components/chat/ContextWindowMeter.tsx",
  "components/chat/DockExplorerPane.tsx",
  "components/chat/DockFilePane.tsx",
  "components/chat/GeneratedMarkdownImage.tsx",
  "components/chat/GitPanel.tsx",
  "components/chat/ComposerPendingTerminalContexts.tsx",
  "components/chat/ComposerPendingUserInputPanel.tsx",
  "components/chat/ComposerSlashStatusDialog.tsx",
  "components/chat/QueuedComposerActions.tsx",
  "components/chat/ProposedPlanActions.tsx",
  "components/chat/ProposedPlanCard.tsx",
  "components/chat/RateLimitBanner.tsx",
  "components/chat/RightDock.tsx",
  "components/chat/SingleChatSurface.tsx",
  "components/chat/SplitChatSurface.tsx",
  "components/chat/WorkspaceFilePreviewHeader.tsx",
  "components/chat/ThreadDetailHydrationState.tsx",
  "components/chat/ExpandedImageOverlay.tsx",
  "components/chat/OpenInPicker.tsx",
  "components/chat/TranscriptSelectionAction.tsx",
  "components/chat/ToolCallDetailsDialog.tsx",
  "components/chat/workspaceExplorer.tsx",
  "components/chat/environment/EnvironmentAutomationsSection.tsx",
  "components/chat/environment/EnvironmentEditableChecklistRow.tsx",
  "components/chat/environment/EnvironmentEditorSection.tsx",
  "components/chat/environment/EnvironmentLocalServersSection.tsx",
  "components/chat/environment/EnvironmentMarkersSection.tsx",
  "components/chat/environment/EnvironmentNotesSection.tsx",
  "components/chat/environment/EnvironmentPanel.tsx",
  "components/chat/environment/EnvironmentPinnedSection.tsx",
  "components/chat/environment/EnvironmentPullRequestSection.tsx",
  "components/chat/environment/EnvironmentRow.tsx",
  "components/chat/environment/EnvironmentStudioOutputsSection.tsx",
  "components/chat/environment/EnvironmentToggle.tsx",
  "components/chat/environment/EnvironmentUsageSection.tsx",
  "components/chat/environment/usePinnedMessageActions.ts",
  "components/chat/environment/EnvironmentPanel.logic.ts",
  "components/chat/environment/environmentPanelStyles.ts",
  "components/chat/environment/environmentPullRequest.logic.ts",
  "components/chat/environment/useThreadNotesAutosave.ts",
  "components/kanban/KanbanCardView.tsx",
  "components/kanban/KanbanColumn.tsx",
  "components/kanban/KanbanNewTaskDialog.tsx",
  "components/kanban/KanbanOverview.tsx",
  "components/kanban/KanbanProjectBoardView.tsx",
  "components/kanban/KanbanTaskExtrasMenu.tsx",
  "components/kanban/KanbanTaskProjectPicker.tsx",
  "components/kanban/KanbanView.tsx",
  "components/kanban/useKanbanCardContextMenu.tsx",
  "components/kanban/useKanbanTaskSubmit.ts",
  "components/automation/AutomationProposalActions.tsx",
  "components/pdf/PdfPageView.tsx",
  "components/pdf/PdfViewerToolbar.tsx",
  "components/pullRequest/PullRequestCodeTab.tsx",
  "components/pullRequest/PullRequestCommentCard.tsx",
  "components/pullRequest/PullRequestCommentComposer.tsx",
  "components/pullRequest/PullRequestDetailPanel.tsx",
  "components/pullRequest/PullRequestDockPane.tsx",
  "components/pullRequest/PullRequestList.tsx",
  "components/pullRequest/PullRequestListFilters.tsx",
  "components/pullRequest/PullRequestMarkdown.tsx",
  "components/pullRequest/PullRequestRow.tsx",
  "components/pullRequest/PullRequestStateGlyph.tsx",
  "components/pullRequest/PullRequestSummaryTab.tsx",
  "components/pullRequest/PullRequestsUnavailableState.tsx",
  "components/pullRequest/PullRequestTimelineTab.tsx",
  "components/pullRequest/PrStateChip.tsx",
  "components/ThemePackEditor.tsx",
  "components/settings/AdvancedSettingsPanel.tsx",
  "components/settings/AppIconPicker.tsx",
  "components/settings/AppSnapShortcutControl.tsx",
  "components/settings/BuiltInToolsSettingsPanel.tsx",
  "components/settings/ConversationStorageSettingsPanels.tsx",
  "components/settings/DesktopSettingsPanels.tsx",
  "components/settings/ExternalConnectionsSettingsPanel.tsx",
  "components/settings/KeyboardShortcutsSettingsPanel.tsx",
  "components/settings/ModelsSettingsPanel.tsx",
  "components/settings/ProfileSettingsPanel.tsx",
  "components/settings/EngineUsageSettingsPanel.tsx",
  "components/settings/EnginesSettingsPanel.tsx",
  "components/settings/SettingControls.tsx",
  "components/settings/SkillsSettingsPanel.tsx",
  "components/settings/ThemeModePicker.tsx",
  "components/ui/combobox.tsx",
  "components/ui/dialog.tsx",
  "components/ui/sheet.tsx",
  "components/ui/spinner.tsx",
  "components/ui/time-picker.tsx",
  "components/ui/toast.tsx",
  "components/WorkspaceFilePreview.tsx",
  "components/TerminalScrollToBottom.tsx",
  "components/TerminalSearch.tsx",
  "components/ThreadTerminalDrawer.tsx",
  "components/ThreadWorktreeHandoffDialog.tsx",
  "components/ThreadArchiveActionButton.tsx",
  "components/ThreadPinToggleButton.tsx",
  "components/terminal/TerminalChrome.tsx",
  "components/terminal/TerminalViewportPane.tsx",
  "hooks/useCopyToClipboard.ts",
  "hooks/useComposerCommandMenuItems.ts",
  "hooks/useHandleNewThread.ts",
  "lib/sidechatCreation.ts",
  "lib/threadEnvironment.ts",
  "settingsSearchIndex.ts",
  "shortcutsSheet.ts",
] as const;

// These owners define the normal shell journey. Keep this independent of the scan list so a
// future cleanup cannot silently drop a whole surface while leaving the scanner green.
const REQUIRED_SHELL_COPY_SOURCES = [
  "routes/__root.tsx",
  "routes/_chat.settings.tsx",
  "components/ChatView.tsx",
  "components/Sidebar.tsx",
  "components/chat/ChatHeader.tsx",
  "components/PluginLibrary.tsx",
] as const;

const REQUIRED_W1_COPY_SOURCES = [
  "routes/_chat.tsx",
  "components/BranchToolbar.tsx",
  "components/GitActionsControl.tsx",
  "components/chat/RightDock.tsx",
  "components/chat/DockExplorerPane.tsx",
  "components/chat/DockFilePane.tsx",
  "components/chat/GitPanel.tsx",
  "components/chat/SingleChatSurface.tsx",
  "components/chat/environment/EnvironmentAutomationsSection.tsx",
  "components/chat/environment/EnvironmentEditableChecklistRow.tsx",
  "components/chat/environment/EnvironmentEditorSection.tsx",
  "components/chat/environment/EnvironmentLocalServersSection.tsx",
  "components/chat/environment/EnvironmentMarkersSection.tsx",
  "components/chat/environment/EnvironmentNotesSection.tsx",
  "components/chat/environment/EnvironmentPanel.logic.ts",
  "components/chat/environment/EnvironmentPanel.tsx",
  "components/chat/environment/environmentPanelStyles.ts",
  "components/chat/environment/EnvironmentPinnedSection.tsx",
  "components/chat/environment/environmentPullRequest.logic.ts",
  "components/chat/environment/EnvironmentPullRequestSection.tsx",
  "components/chat/environment/EnvironmentRow.tsx",
  "components/chat/environment/EnvironmentStudioOutputsSection.tsx",
  "components/chat/environment/EnvironmentToggle.tsx",
  "components/chat/environment/EnvironmentUsageSection.tsx",
  "components/chat/environment/usePinnedMessageActions.ts",
  "components/chat/environment/useThreadNotesAutosave.ts",
  "lib/threadEnvironment.ts",
  "settingsSearchIndex.ts",
] as const;

const PRODUCT_COPY_PROPERTIES = new Set([
  "aria-label",
  "ariaLabel",
  "description",
  "detail",
  "emptyLabel",
  "label",
  "placeholder",
  "title",
  "tooltip",
]);

type Finding = {
  readonly file: string;
  readonly kind: "attribute" | "property" | "text";
  readonly line: number;
  readonly text: string;
};

// Exact, reviewed exceptions belong here only when the UI intentionally exposes a raw fact
// (for example a command, path, model name, or wire identifier). Every entry must remain used.
const RAW_FACT_ALLOWLIST = [
  "_chat.settings.tsx:text:px",
  "BrowserPanel.tsx:text:localhost:",
  "CreateGitHubProjectFields.tsx:text:owner/repository",
  "CreateGitHubProjectFields.tsx:text:gh auth login",
  "CreateGitHubProjectFields.tsx:attribute:/parent/folder",
  "CreateGitHubProjectFields.tsx:attribute:repository",
  "CreateProjectDialog.tsx:attribute:/path/to/project",
  "BranchToolbarBranchSelector.tsx:attribute:feature/my-change",
  "GitCreatePrDialog.tsx:text:Ctrl ↵",
  "GitActionsControl.tsx:attribute:feature/my-change",
  "ProjectScriptsControl.tsx:attribute:bun test",
  "ProjectScriptsControl.tsx:text:Backspace",
  "ProjectSourceSegmentedPicker.tsx:text:GitHub",
  "PullRequestThreadDialog.tsx:attribute:https://github.com/owner/repo/pull/42 or #42",
  "ThreadWorktreeHandoffDialog.tsx:attribute:harnessos/feature-name",
  "workspaceExplorer.tsx:attribute:`${match.path}, ${lineLabel}: ${match.lineText}`",
  "workspaceExplorer.tsx:attribute:`${match.path}:${match.lineNumber}`",
  "PullRequestRow.tsx:attribute:`${entry.headBranch} → ${entry.baseBranch}`",
  "-automations.shared.tsx:attribute:Europe/Rome",
  "PdfViewerToolbar.tsx:text:PDF",
  'ThemePackEditor.tsx:attribute:"JetBrains Mono"',
  "ThemePackEditor.tsx:text:Aa",
  'ThemePackEditor.tsx:attribute:harnessos-theme-v1:{"presetId":"linear",...}',
  "EnginesSettingsPanel.tsx:property:CODEX_HOME",
  "EnginesSettingsPanel.tsx:property:https://api2.cursor.sh",
  "EnginesSettingsPanel.tsx:property:droid",
  "EnginesSettingsPanel.tsx:property:http://127.0.0.1:4096",
  "SidebarSearchPalette.tsx:text:Aa",
  "SidebarSearchPalette.tsx:text:Claude",
  "SidebarSearchPalette.tsx:text:Cursor",
  "SidebarSearchPalette.tsx:text:Kilo",
  "SidebarSearchPalette.tsx:text:OpenCode",
  "SidebarSearchPalette.tsx:text:Codex",
  "SidebarSearchPalette.tsx:text:Enter",
  "SidebarActivityView.tsx:text:HarnessOS",
  "Sidebar.tsx:property:`#${pr.number} ${label}: ${pr.title}`",
  "useComposerCommandMenuItems.ts:property:`@${name}`",
  "useComposerCommandMenuItems.ts:property:`@${alias}`",
  "useComposerCommandMenuItems.ts:property:`@${LOCAL_FOLDER_MENTION_NAME}`",
  "useComposerCommandMenuItems.ts:property:`/${command}`",
  "useComposerCommandMenuItems.ts:property:`/${command.name}`",
  "useComposerCommandMenuItems.ts:property:`${engineLabel} · ${slug}`",
  // Persisted internal placeholder; ChatView maps it through the catalog at presentation time.
  "TerminalSearch.tsx:text:Aa",
] as const satisfies readonly string[];

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isEnglishCopy(value: string): boolean {
  return /[A-Za-z]{2}/.test(normalizedText(value));
}

function findingKey(finding: Finding): string {
  return `${finding.file}:${finding.kind}:${finding.text}`;
}

function sourceFindings(relativePath: (typeof PRODUCT_COPY_SOURCES)[number]): Finding[] {
  const absolutePath = resolve(import.meta.dirname, relativePath);
  const sourceText = readFileSync(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(
    absolutePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings = new Map<string, Finding>();

  const record = (node: ts.Node, kind: Finding["kind"], value: string) => {
    const text = normalizedText(value);
    if (!isEnglishCopy(text)) return;
    const finding = {
      file: basename(relativePath),
      kind,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      text,
    } as const;
    findings.set(`${finding.line}:${finding.kind}:${finding.text}`, finding);
  };

  const visit = (node: ts.Node) => {
    if (
      ts.isJsxAttribute(node) &&
      PRODUCT_COPY_PROPERTIES.has(node.name.getText(sourceFile)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      record(node, "attribute", node.initializer.text);
    } else if (
      ts.isJsxAttribute(node) &&
      PRODUCT_COPY_PROPERTIES.has(node.name.getText(sourceFile)) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression &&
      ts.isTemplateExpression(node.initializer.expression)
    ) {
      record(node, "attribute", node.initializer.expression.getText(sourceFile));
    } else if (
      ts.isPropertyAssignment(node) &&
      PRODUCT_COPY_PROPERTIES.has(node.name.getText(sourceFile)) &&
      (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
    ) {
      // Settings search titles are stable English DOM-anchor records. Their visible projection
      // is localized below for every entry and both supported catalogs.
      if (
        !(relativePath === "settingsSearchIndex.ts" && node.name.getText(sourceFile) === "title")
      ) {
        record(node, "property", node.initializer.text);
      }
    } else if (
      ts.isPropertyAssignment(node) &&
      PRODUCT_COPY_PROPERTIES.has(node.name.getText(sourceFile)) &&
      ts.isTemplateExpression(node.initializer)
    ) {
      record(node, "property", node.initializer.getText(sourceFile));
    } else if (ts.isJsxText(node)) {
      record(node, "text", node.text);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      let child: ts.Node = node;
      let parent: ts.Node | undefined = node.parent;
      while (parent && !ts.isJsxExpression(parent)) {
        if (
          ts.isParenthesizedExpression(parent) ||
          ts.isAsExpression(parent) ||
          ts.isNonNullExpression(parent)
        ) {
          child = parent;
          parent = parent.parent;
          continue;
        }
        if (ts.isConditionalExpression(parent) && parent.condition !== child) {
          child = parent;
          parent = parent.parent;
          continue;
        }
        parent = undefined;
      }
      if (
        parent &&
        (!ts.isJsxAttribute(parent.parent) ||
          PRODUCT_COPY_PROPERTIES.has(parent.parent.name.getText(sourceFile)))
      ) {
        record(node, "text", node.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [...findings.values()];
}

describe("reachable HarnessOS-owned product copy", () => {
  it("keeps every normal shell owner inside the source-level gate", () => {
    const scannedSources = new Set<string>(PRODUCT_COPY_SOURCES);
    expect(
      REQUIRED_SHELL_COPY_SOURCES.filter((source) => !scannedSources.has(source)),
      "add every normal shell owner to PRODUCT_COPY_SOURCES",
    ).toEqual([]);
  });

  it("keeps every W1 responsive-workbench owner inside the source-level gate", () => {
    const scannedSources = new Set<string>(PRODUCT_COPY_SOURCES);
    expect(
      REQUIRED_W1_COPY_SOURCES.filter((source) => !scannedSources.has(source)),
      "add every W1 copy owner to PRODUCT_COPY_SOURCES",
    ).toEqual([]);
  });

  it("routes reachable product copy through the sole message catalog", () => {
    const allFindings = PRODUCT_COPY_SOURCES.flatMap(sourceFindings);
    const allowlist = new Set<string>(RAW_FACT_ALLOWLIST);
    const staleAllowlist = [...allowlist].filter(
      (allowed) => !allFindings.some((finding) => findingKey(finding) === allowed),
    );
    const violations = allFindings.filter((finding) => !allowlist.has(findingKey(finding)));

    expect(staleAllowlist, "remove stale raw-fact exceptions").toEqual([]);
    expect(
      violations.map(
        (finding) => `${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`,
      ),
      "translate product copy with useI18n(); allow only exact reviewed raw facts",
    ).toEqual([]);
  });

  it("projects every canonical Settings search record through both language catalogs", () => {
    for (const entry of SETTINGS_SEARCH_RECORDS) {
      expect(localizeSettingsSearchEntryTitle(entry, (key) => EN_MESSAGES[key])).toBeTruthy();
      expect(localizeSettingsSearchEntryTitle(entry, (key) => ZH_CN_MESSAGES[key])).toBeTruthy();
    }

    const expectedZhW1Titles = new Map([
      ["settings.usageLabel", "用量"],
      ["settings.repositoryLabel", "代码仓库"],
      ["settings.recap", "摘要"],
      ["settings.pinnedMessages", "置顶消息"],
      ["settings.textMarkers", "文本标记"],
      ["settings.notepad", "记事本"],
    ]);
    for (const [titleKey, localizedTitle] of expectedZhW1Titles) {
      const entry = SETTINGS_SEARCH_RECORDS.find((candidate) => candidate.titleKey === titleKey);
      expect(entry).toBeDefined();
      expect(localizeSettingsSearchEntryTitle(entry!, (key) => ZH_CN_MESSAGES[key])).toBe(
        localizedTitle,
      );
      expect(
        rankSettingsSearchEntries(localizedTitle, 100, (key) => ZH_CN_MESSAGES[key]).some(
          (candidate) => candidate.title === localizedTitle,
        ),
      ).toBe(true);
    }
  });

  it("uses the localized AppSnap product name throughout the Chinese catalog", () => {
    expect(EN_MESSAGES["settings.appsnap"]).toBe("AppSnap");
    expect(ZH_CN_MESSAGES["settings.appsnap"]).toBe("应用快照");

    for (const [key, value] of Object.entries(ZH_CN_MESSAGES)) {
      if (!key.toLowerCase().includes("appsnap")) continue;
      expect(value, `${key} must use the Chinese product name`).not.toContain("AppSnap");
    }
  });

  it("locks the W1 Environment, thread environment, Workbench, and Git taxonomy", () => {
    const exact = [
      ["environment.title", "Environment", "环境信息"],
      ["environment.changes", "Changes", "变更"],
      ["settings.environmentPanel", "Environment panel", "环境信息面板"],
      ["environment.repository", "Repository", "代码仓库"],
      ["environment.localServers", "Local servers", "本地服务"],
      ["environment.editor", "Editor", "编辑器"],
      ["environment.builtInEditor", "Built-in editor", "内置编辑器"],
      ["environment.usage", "Usage", "用量"],
      ["threadEnvironment.local", "Local", "本地"],
      ["threadEnvironment.worktree", "Worktree", "工作树"],
      ["threadEnvironment.newWorktree", "New worktree", "新建工作树"],
      ["git.action.commitOrPush", "Commit or push", "提交或推送"],
      ["git.action.commitPush", "Commit and push", "提交并推送"],
      ["git.panel.changes", "Changes", "变更"],
      ["workbench.sideChats", "Side chats", "侧边对话"],
      ["environment.outputs", "Outputs", "产出"],
      ["environment.recap", "Recap", "摘要"],
      ["environment.pinnedMessages", "Pinned messages", "置顶消息"],
      ["environment.textMarkers", "Text markers", "文本标记"],
      ["environment.notepad", "Notepad", "记事本"],
      ["environment.notepadPlaceholder", "Add notes for this task…", "记录当前任务的临时信息…"],
      ["composer.command.subagents", "Subagents", "子智能体"],
    ] as const;
    for (const [key, en, zh] of exact) {
      expect(EN_MESSAGES[key]).toBe(en);
      expect(ZH_CN_MESSAGES[key]).toBe(zh);
    }
    expect("workbench.environment" in EN_MESSAGES).toBe(false);
    expect("workbench.changes" in EN_MESSAGES).toBe(false);
  });

  it("keeps normal Model services copy in product language", () => {
    const forbidden = [
      /\bPi\b/u,
      /credential owner/iu,
      /models\.json/iu,
      /ModelRuntime/u,
      /runtime projection/iu,
      /local model snapshot/iu,
      /凭据\s*owner/iu,
      /本地模型快照/u,
    ];
    const catalogs = [EN_MESSAGES, ZH_CN_MESSAGES] as const;

    for (const catalog of catalogs) {
      const modelServiceCopy = Object.entries(catalog).filter(
        ([key]) => key.startsWith("settings.modelService") || key.startsWith("settings.customApi"),
      );
      expect(
        modelServiceCopy.flatMap(([key, message]) =>
          forbidden.flatMap((pattern) => (pattern.test(message) ? [`${key}: ${message}`] : [])),
        ),
      ).toEqual([]);
    }

    expect(EN_MESSAGES["settings.customApiKeyDescription"]).toContain("saved on this device");
    expect(ZH_CN_MESSAGES["settings.customApiKeyDescription"]).toContain("保存在这台设备上");
    expect(EN_MESSAGES["settings.modelServiceOriginModelsJson"]).toBe(
      "Connected with an API endpoint",
    );
    expect(ZH_CN_MESSAGES["settings.modelServiceOriginModelsJson"]).toBe("通过 API 地址连接");
    expect(EN_MESSAGES["settings.noServiceModels"]).toContain("service");
    expect(ZH_CN_MESSAGES["settings.noServiceModels"]).toContain("服务");
    expect(EN_MESSAGES["settings.recommendedModelServices"]).toBe("Recommended");
    expect(ZH_CN_MESSAGES["settings.recommendedModelServices"]).toBe("推荐");
    expect(EN_MESSAGES["settings.otherModelServices"]).toBe("Other services");
    expect(ZH_CN_MESSAGES["settings.otherModelServices"]).toBe("其他服务");
    expect(EN_MESSAGES["settings.modelServiceAuthMethodApiKey"]).toBe("API Key");
    expect(ZH_CN_MESSAGES["settings.modelServiceAuthMethodApiKey"]).toBe("API Key");
    expect(EN_MESSAGES["settings.modelServiceAuthMethodSignIn"]).toBe("Sign in");
    expect(ZH_CN_MESSAGES["settings.modelServiceAuthMethodSignIn"]).toBe("登录");
    expect(EN_MESSAGES["settings.customApiCommandRiskTitle"]).toBe("Run a local command?");
    expect(ZH_CN_MESSAGES["settings.customApiCommandRiskTitle"]).toBe("执行本机命令？");
    expect(EN_MESSAGES["settings.customApiCredentialCommandExecutionWarning"]).toContain(
      "provide a hidden value",
    );
    expect(ZH_CN_MESSAGES["settings.customApiCredentialCommandExecutionWarning"]).toContain(
      "提供隐藏值",
    );
    expect(EN_MESSAGES["settings.customApiHeaderCommandDescription.engine"]).toContain(
      "without another Settings confirmation",
    );
    expect(ZH_CN_MESSAGES["settings.customApiHeaderCommandDescription.engine"]).toContain(
      "不会再次经过设置页确认",
    );
  });

  it("keeps normal Prompt settings copy in HarnessOS product language", () => {
    const forbidden = [
      /\bPi\b/u,
      /Pi-compatible/iu,
      /ResourceLoader/u,
      /Engine Contract/iu,
      /APPEND_SYSTEM\.md/u,
      /SYSTEM\.md/u,
      /runtime projection/iu,
      /资源加载器/u,
      /引擎合同/u,
    ];
    for (const catalog of [EN_MESSAGES, ZH_CN_MESSAGES] as const) {
      const promptCopy = Object.entries(catalog).filter(
        ([key]) =>
          key.startsWith("settings.prompt") ||
          key.startsWith("settings.customRules") ||
          key.startsWith("settings.removeCustomRules") ||
          key.startsWith("settings.shadowedPrompt") ||
          key.startsWith("settings.projectPrompt") ||
          key.startsWith("settings.activePrompt") ||
          key.startsWith("settings.defaultPrompt"),
      );
      expect(
        promptCopy.flatMap(([key, message]) =>
          forbidden.flatMap((pattern) => (pattern.test(message) ? [`${key}: ${message}`] : [])),
        ),
      ).toEqual([]);
    }
  });

  it("locks the bilingual first-run focus-flow copy without internal runtime vocabulary", () => {
    const exact = [
      ["onboarding.firstRun.engineTitle", "Choose your work engine", "选择你的工作引擎"],
      ["onboarding.firstRun.serviceTitle", "Connect a model service", "连接一个模型服务"],
      ["onboarding.firstRun.modelTitle", "Choose an exact model", "选择一个精确模型"],
      ["onboarding.firstRun.readyTitle", "HarnessOS is ready", "HarnessOS 已准备好"],
      ["onboarding.firstRun.later", "Set up later", "稍后设置"],
      ["onboarding.firstRun.startUsing", "Start using", "开始使用"],
    ] as const;

    for (const [key, en, zh] of exact) {
      expect(EN_MESSAGES[key]).toBe(en);
      expect(ZH_CN_MESSAGES[key]).toBe(zh);
    }

    const firstRunCopy = Object.entries(EN_MESSAGES)
      .filter(([key]) => key.startsWith("onboarding.firstRun."))
      .map(([, value]) => value)
      .join(" ");
    expect(firstRunCopy).not.toMatch(/\b(?:Pi-derived|ModelRuntime|runtime projection)\b/u);
  });

  it("keeps interruption recovery localized in both supported languages", () => {
    expect(EN_MESSAGES["conversation.editRestartRequired"]).toContain("Stop");
    expect(ZH_CN_MESSAGES["conversation.editRestartRequired"]).toContain("停止");
    expect(EN_MESSAGES["conversation.editRestartRequiredDescription"]).toContain("restart");
    expect(ZH_CN_MESSAGES["conversation.editRestartRequiredDescription"]).toContain("重新启动");
  });

  it("localizes automatic model retry progress", () => {
    expect(EN_MESSAGES["timeline.modelRequestRetrying"]).toBe("Retrying model request");
    expect(ZH_CN_MESSAGES["timeline.modelRequestRetrying"]).toBe("正在重试模型请求");
  });
});
