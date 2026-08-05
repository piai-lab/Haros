import "../../index.css";

import type { ProductRuntimeCatalog } from "@omnimind/contracts";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { KanbanRuntimePicker } from "./KanbanRuntimePicker";

const runtimeCatalog: ProductRuntimeCatalog = {
  engineId: "pi",
  runtimeVersion: "test",
  packageGeneration: "package-browser",
  models: [
    {
      id: "host-a/current",
      provider: "host-a",
      modelId: "current",
      name: "Current Host model",
      reasoning: true,
      thinkingLevels: ["medium"],
      available: true,
      auth: "configured",
    },
    {
      id: "host-b/missing-auth",
      provider: "host-b",
      modelId: "missing-auth",
      name: "Missing auth model",
      reasoning: false,
      thinkingLevels: [],
      available: true,
      auth: "missing",
    },
  ],
  capabilities: {
    ingress: "typed-native-host",
    lineage: { continue: "available", rebuild: "available" },
    controls: {
      steer: "available",
      followUp: "available",
      abort: "available",
      cancel: "unknown",
    },
    structuredQuestions: "unknown",
    packages: "unknown",
    filesRead: "unknown",
    filesWrite: "unknown",
    terminal: "unknown",
    enforcement: "unverified",
  },
  truncated: false,
};

describe("KanbanRuntimePicker", () => {
  afterEach(async () => cleanup());

  it("keeps a Host-configured model selectable", async () => {
    const onSelectionChange = vi.fn();
    await render(
      <KanbanRuntimePicker
        catalog={runtimeCatalog}
        selection={null}
        onSelectionChange={onSelectionChange}
      />,
    );

    await page.getByRole("combobox", { name: "Host model" }).click();
    expect(page.getByText("Current Host model · host-a", { exact: true })).toBeInTheDocument();
    expect(
      page.getByText(/Missing auth model · host-b · authentication required/),
    ).toBeInTheDocument();
    expect(page.getByText(/donor\/static/)).not.toBeInTheDocument();
    await page.getByText("Current Host model · host-a", { exact: true }).click();

    expect(onSelectionChange).toHaveBeenCalledWith(runtimeCatalog.models[0], null);
  });

  it("preserves a donor-only historical selection as unavailable without advertising it", async () => {
    const onSelectionChange = vi.fn();
    await render(
      <KanbanRuntimePicker
        catalog={runtimeCatalog}
        selection={{
          state: "unavailable",
          reason: "model-unavailable",
          requestedRuntimeModelId: "donor/static",
          permissionPolicy: "approval-required",
          enforcement: "unverified",
          executionTarget: null,
        }}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(page.getByText("donor/static · unavailable", { exact: true })).toBeInTheDocument();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
