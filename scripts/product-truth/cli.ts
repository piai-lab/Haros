#!/usr/bin/env node

import {
  DirectFirstPublicError,
  applyDirectFirstPublic,
  inspectDirectFirstPublic,
  sanitizedReceipt,
  validateDefaultRoot,
} from "./direct-first-public.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const home = args[2];
  const inspectShape = command === "inspect" && args.length === 3 && args[1] === "--home";
  const applyShape = command === "apply" && args.length === 5 && args[1] === "--home" && args[3] === "--confirm-destroy-prebaseline-state";
  if ((!inspectShape && !applyShape) || !home || home.startsWith("--")) {
    throw new DirectFirstPublicError(2, "DEFAULT_ROOT_INVALID");
  }
  if (command === "inspect") {
    const canonicalHome = validateDefaultRoot(home);
    const plan = await inspectDirectFirstPublic(canonicalHome);
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    if (plan.blockers.length > 0) throw new DirectFirstPublicError(4, "CLASSIFICATION_BLOCKED");
    return;
  }
  const confirmation = args[4];
  if (!confirmation) throw new DirectFirstPublicError(2, "DEFAULT_ROOT_INVALID");
  const canonicalHome = validateDefaultRoot(home, confirmation);
  const result = await applyDirectFirstPublic(canonicalHome);
  process.stdout.write(`${JSON.stringify(sanitizedReceipt(result), null, 2)}\n`);
}

main().catch((cause) => {
  const error =
    cause instanceof DirectFirstPublicError
      ? cause
      : new DirectFirstPublicError(5, "INSPECTION_UNSAFE");
  process.stderr.write(`${JSON.stringify({ code: error.code })}\n`);
  process.exitCode = error.exitCode;
});
