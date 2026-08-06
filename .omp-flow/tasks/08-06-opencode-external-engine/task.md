---
type: "Task"
title: "Run one real OpenCode external Engine"
---

# Run one real OpenCode external Engine

Task directory: `08-06-opencode-external-engine`.

This bounded checkpoint implements [`execution-brief.md`](../../../execution-brief.md) §7's sole
next stage and primarily targets Campaign claim F-13. In the same Product-visible Conversation,
an explicit next-Run choice must dispatch to the real user-installed OpenCode `1.14.40` process
over its non-experimental `opencode acp` JSON-RPC/stdio path. Pi remains the bundled-native default
and Gold Path.

The governing product facts remain in the repository owners rather than this Bundle:

- [`README.md`](../../../README.md) owns product identity and the Pi-native/Engine-open doctrine;
- [`architecture/execution.md`](../../../architecture/execution.md) owns the external-process and
  execution-authority boundary;
- [`architecture/product-state.md`](../../../architecture/product-state.md) owns visible
  Conversation, next-Run selection, `EngineBinding`, receipt and unknown-delivery recovery;
- [`architecture/workbench.md`](../../../architecture/workbench.md) owns truthful selector,
  capability, permission and no-fallback behavior;
- [`execution-brief.md`](../../../execution-brief.md) owns sequencing and proof gates;
- [`missions/independent-omnimind-v1.md`](../../../missions/independent-omnimind-v1.md) owns claim
  status and evidence pointers.

OpenCode keeps its auth, Session, provider/model selection, upgrade, private execution state and
ACP semantics. OmniMind keeps the visible Conversation, exact next-Run choice, admission,
dispatch/settlement receipt, recovery and no-replay truth. Product state must not copy OpenCode
credentials, configuration or transcript. Missing, unauthenticated, incompatible or unavailable
OpenCode preserves the user's input and exact choice and dispatches neither Pi nor another Engine.

The selected executable is the already installed OpenCode `1.14.40` arm64 binary at
`/opt/homebrew/Cellar/opencode/1.14.40/libexec/lib/node_modules/opencode-ai/node_modules/opencode-darwin-arm64/bin/opencode`,
whose orientation SHA-256 is
`4b261084514f625065296e972995bb8a7eeadd6277ea5a679dbcf269185e1edc`. This run may depend on that
existing executable but may not vendor, bundle, redistribute, patch, install, update or silently
modify OpenCode or its global configuration. Future distribution policy remains undecided.

Completion requires exact source/version/license/protocol evidence, real process and smallest live
journey evidence, truthful catalog/capability/permission/enforcement differences, explicit
next-Run dispatch without fallback, external Session authority, typed acceptance/stream/final/
failure/abort/disconnect receipts, and proportional `delivery_unknown`/`outcome_unknown` plus
attempt-count/no-replay proof. Focused fixtures may diagnose but cannot replace the real Engine
claim. One different actor must review the frozen candidate and return PASS; the implementation is
one atomic commit, F-13 may advance only to `candidate`, and the Bundle must Finish/archive with a
clean worktree. No third review or unchanged final/live gate is allowed.

Stop and escalate if the real protocol cannot support an honest acceptance boundary, the selected
path would require OpenCode configuration/credential mutation or redistribution, a sole owner
conflicts, Pi would need a lowest-common-denominator rewrite, or the checkpoint requires a generic
Engine framework, Remote target, marketplace/catalog completion or release work.
