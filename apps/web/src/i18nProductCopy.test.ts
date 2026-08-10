import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PRODUCT_COPY_SOURCES = [
  "routes/_chat.settings.tsx",
  "routes/__root.tsx",
  "components/CreateGitHubProjectFields.tsx",
  "components/CreateProjectDialog.tsx",
  "components/ChatMarkdown.tsx",
  "components/DesktopWindowControls.tsx",
  "components/LocalImagePreview.tsx",
  "components/PdfFilePreview.tsx",
  "components/RecentViewSwitcher.tsx",
  "components/SettingsSidebarNav.tsx",
  "components/SidebarSearchPalette.tsx",
  "components/ShortcutsDialog.tsx",
  "components/chat/ChatHeader.tsx",
  "components/chat/ComposerExtrasMenu.tsx",
  "components/chat/ComposerModelEffortPicker.tsx",
  "components/chat/ContextWindowMeter.tsx",
  "components/chat/GeneratedMarkdownImage.tsx",
  "components/chat/RightDock.tsx",
  "components/chat/WorkspaceFilePreviewHeader.tsx",
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
  "components/pdf/PdfPageView.tsx",
  "components/pdf/PdfViewerToolbar.tsx",
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
  "hooks/useCopyToClipboard.ts",
  "shortcutsSheet.ts",
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
  "CreateGitHubProjectFields.tsx:text:owner/repository",
  "CreateGitHubProjectFields.tsx:text:gh auth login",
  "CreateGitHubProjectFields.tsx:attribute:/parent/folder",
  "CreateGitHubProjectFields.tsx:attribute:repository",
  "CreateProjectDialog.tsx:attribute:/path/to/project",
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
});
