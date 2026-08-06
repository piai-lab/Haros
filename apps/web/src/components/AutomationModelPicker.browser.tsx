import "../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { AutomationModelPicker } from "../routes/-automations.shared";

describe("AutomationModelPicker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("presents preserved runtime history as unavailable rather than selectable capability", async () => {
    await render(
      <AutomationModelPicker
        value={{
          state: "unavailable",
          reason: "model-unavailable",
          requestedEngineId: "pi",
          requestedRuntimeChoice: {
            kind: "product-model",
            runtimeModelId: "saved-model",
            thinking: null,
          },
          packageGeneration: null,
          permissionPolicy: "approval-required",
          executionTarget: null,
        }}
      />,
    );

    expect(page.getByText("Automation execution unavailable")).toBeInTheDocument();
    expect(page.getByText(/requested saved-model/)).toBeInTheDocument();
    expect(page.getByRole("combobox")).not.toBeInTheDocument();
  });
});
