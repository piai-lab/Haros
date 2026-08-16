import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EN_MESSAGES, ZH_CN_MESSAGES } from "~/i18n";
import { ComposerBranchMismatchNotice } from "./ComposerBranchMismatchNotice";
import { COMPOSER_INPUT_SURFACE_CLASS_NAME } from "./composerPickerStyles";

describe("ComposerBranchMismatchNotice", () => {
  it("uses the existing detached composer surface and keeps long branch labels bounded", () => {
    const markup = renderToStaticMarkup(
      <ComposerBranchMismatchNotice
        threadBranch="feature/a-very-long-finished-task-branch"
        currentBranch="feature/a-very-long-current-checkout-branch"
      />,
    );

    expect(markup).toContain('data-testid="composer-branch-mismatch-notice"');
    expect(markup).toContain(EN_MESSAGES["git.branch.resumeNotice"]);
    expect(markup).toContain("max-w-[40%]");
    expect(markup).toContain("truncate");
    for (const className of COMPOSER_INPUT_SURFACE_CLASS_NAME.split(/\s+/)) {
      expect(markup).toContain(className);
    }
  });

  it("ships matching English and Chinese product copy", () => {
    expect(EN_MESSAGES["git.branch.resumeNotice"]).toBe(
      "Sending will continue this task on the current branch",
    );
    expect(ZH_CN_MESSAGES["git.branch.resumeNotice"]).toBe("发送后，此任务将在当前分支继续");
    expect(ZH_CN_MESSAGES["git.branch.savedLabel"]).toContain("{branch}");
    expect(ZH_CN_MESSAGES["git.branch.currentLabel"]).toContain("{branch}");
  });
});
