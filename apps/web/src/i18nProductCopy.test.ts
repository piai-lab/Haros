import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { EN_MESSAGES, ZH_CN_MESSAGES } from "./i18n";

const PRODUCT_COPY_SOURCES = [
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
  "components/ChatMarkdown.tsx",
  "components/BrowserPanel.tsx",
  "components/BranchToolbarBranchSelector.tsx",
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
  "components/chat/ProviderModelPicker.tsx",
  "components/chat/ContextWindowMeter.tsx",
  "components/chat/GeneratedMarkdownImage.tsx",
  "components/chat/ComposerPendingTerminalContexts.tsx",
  "components/chat/ComposerPendingUserInputPanel.tsx",
  "components/chat/ComposerSlashStatusDialog.tsx",
  "components/chat/QueuedComposerActions.tsx",
  "components/chat/ProposedPlanActions.tsx",
  "components/chat/ProposedPlanCard.tsx",
  "components/chat/RateLimitBanner.tsx",
  "components/chat/RightDock.tsx",
  "components/chat/SplitChatSurface.tsx",
  "components/chat/WorkspaceFilePreviewHeader.tsx",
  "components/chat/ThreadDetailHydrationState.tsx",
  "components/chat/ExpandedImageOverlay.tsx",
  "components/chat/OpenInPicker.tsx",
  "components/chat/TranscriptSelectionAction.tsx",
  "components/chat/ToolCallDetailsDialog.tsx",
  "components/chat/workspaceExplorer.tsx",
  "components/chat/environment/EnvironmentAutomationsSection.tsx",
  "components/chat/environment/EnvironmentPullRequestSection.tsx",
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
  "components/profile/EditProfileDialog.tsx",
  "components/settings/AdvancedSettingsPanel.tsx",
  "components/settings/AppIconPicker.tsx",
  "components/settings/AppSnapShortcutControl.tsx",
  "components/settings/ConversationStorageSettingsPanels.tsx",
  "components/settings/DesktopSettingsPanels.tsx",
  "components/settings/ExternalMcpSettingsPanel.tsx",
  "components/settings/KeyboardShortcutsSettingsPanel.tsx",
  "components/settings/ModelsSettingsPanel.tsx",
  "components/settings/ProfileSettingsPanel.tsx",
  "components/settings/ProviderUsageSettingsPanel.tsx",
  "components/settings/ProvidersSettingsPanel.tsx",
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
  "ThreadWorktreeHandoffDialog.tsx:attribute:omnimind/feature-name",
  "PullRequestRow.tsx:attribute:`${entry.headBranch} → ${entry.baseBranch}`",
  "-automations.shared.tsx:attribute:Europe/Rome",
  "PdfViewerToolbar.tsx:text:PDF",
  'ThemePackEditor.tsx:attribute:"JetBrains Mono"',
  "ThemePackEditor.tsx:text:Aa",
  'ThemePackEditor.tsx:attribute:codex-theme-v1:{"codeThemeId":"linear",...}',
  "ProfileSettingsPanel.tsx:text:OmniMind",
  "ProvidersSettingsPanel.tsx:property:CODEX_HOME",
  "ProvidersSettingsPanel.tsx:property:https://api2.cursor.sh",
  "ProvidersSettingsPanel.tsx:property:droid",
  "ProvidersSettingsPanel.tsx:property:http://127.0.0.1:4096",
  "SidebarSearchPalette.tsx:text:Aa",
  "SidebarSearchPalette.tsx:text:Claude",
  "SidebarSearchPalette.tsx:text:Cursor",
  "SidebarSearchPalette.tsx:text:Kilo",
  "SidebarSearchPalette.tsx:text:OpenCode",
  "SidebarSearchPalette.tsx:text:Codex",
  "SidebarSearchPalette.tsx:text:Enter",
  "SidebarActivityView.tsx:text:OmniMind",
  "Sidebar.tsx:property:`#${pr.number} ${label}: ${pr.title}`",
  "useComposerCommandMenuItems.ts:property:`@${name}`",
  "useComposerCommandMenuItems.ts:property:`@${alias}`",
  "useComposerCommandMenuItems.ts:property:`@${LOCAL_FOLDER_MENTION_NAME}`",
  "useComposerCommandMenuItems.ts:property:`/${command.name}`",
  "useComposerCommandMenuItems.ts:property:`${providerLabel} · ${slug}`",
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
    ts.ScriptKind.TSX,
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
      record(node, "property", node.initializer.text);
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

describe("reachable OmniMind-owned product copy", () => {
  it("keeps every normal shell owner inside the source-level gate", () => {
    const scannedSources = new Set<string>(PRODUCT_COPY_SOURCES);
    expect(
      REQUIRED_SHELL_COPY_SOURCES.filter((source) => !scannedSources.has(source)),
      "add every normal shell owner to PRODUCT_COPY_SOURCES",
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
        ([key]) =>
          key.startsWith("settings.modelService") ||
          key.startsWith("settings.customApi") ||
          key.startsWith("settings.legacyOmniMindModel"),
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
    expect(EN_MESSAGES["settings.customApiHeaderCommandDescription.provider"]).toContain(
      "without another Settings confirmation",
    );
    expect(ZH_CN_MESSAGES["settings.customApiHeaderCommandDescription.provider"]).toContain(
      "不会再次经过设置页确认",
    );
    expect(EN_MESSAGES["settings.legacyOmniMindModelsDescription"]).toContain(
      "real API format, endpoint, and credential",
    );
    expect(ZH_CN_MESSAGES["settings.legacyOmniMindModelsDescription"]).toContain(
      "真实的 API 格式、地址和凭据",
    );
    expect(EN_MESSAGES["settings.legacyOmniMindModelRemoveDescription"]).toContain(
      "does not delete an API connection",
    );
    expect(ZH_CN_MESSAGES["settings.legacyOmniMindModelRemoveDescription"]).toContain(
      "不会删除 API 连接",
    );
  });

  it("distinguishes first-run setup from recovery in both supported languages", () => {
    expect(EN_MESSAGES["composer.modelSetupTitle"]).toBe("Set up a model to get started");
    expect(ZH_CN_MESSAGES["composer.modelSetupTitle"]).toBe("配置模型后开始");
    expect(EN_MESSAGES["composer.modelSetupDescription"]).toContain("draft and attachments");
    expect(ZH_CN_MESSAGES["composer.modelSetupDescription"]).toContain("草稿和附件");
    expect(EN_MESSAGES["composer.modelRecoveryDescription"]).toContain("existing connection");
    expect(ZH_CN_MESSAGES["composer.modelRecoveryDescription"]).toContain("现有连接");
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
