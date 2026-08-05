import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const componentDirectory = path.dirname(fileURLToPath(import.meta.url));

describe("Product submission health wiring", () => {
  it("retains durable Queue ownership and returns before admission when dispatch is unavailable", () => {
    const chatView = fs.readFileSync(path.join(componentDirectory, "../ChatView.tsx"), "utf8");
    const start = chatView.indexOf("const sendProductConversation = async");
    const end = chatView.indexOf("const onSend = async", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);

    const productJourney = chatView.slice(start, end);
    const ownershipTransfer = productJourney.indexOf(
      "const queueItem = await confirmProductQueueOwnershipBeforeDraftClear",
    );
    const healthGate = productJourney.indexOf("if (!canDispatchProductSubmission(");
    const entryCreation = productJourney.indexOf("const entryId = ProductEntryId");
    const submission = productJourney.indexOf("productApi.submitQueueItem");
    expect(ownershipTransfer).toBeGreaterThan(0);
    expect(productJourney).toContain("publishQueueItem: setProductQueueItem");
    expect(healthGate).toBeGreaterThan(ownershipTransfer);
    expect(entryCreation).toBeGreaterThan(healthGate);
    expect(submission).toBeGreaterThan(entryCreation);

    const queueOnlyPath = productJourney.slice(healthGate, entryCreation);
    expect(queueOnlyPath).toContain("return true;");
    expect(queueOnlyPath).toContain("resetLocalDispatch();");
    expect(queueOnlyPath).not.toMatch(/Product(?:Entry|Run|Dispatch|OperationReceipt)Id/);
  });
});
