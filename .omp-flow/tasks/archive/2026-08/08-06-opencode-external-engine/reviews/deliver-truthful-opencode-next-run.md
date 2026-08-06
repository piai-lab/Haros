---
type: "Implementation Review"
title: "Review: Deliver a truthful OpenCode next Run"
work: "../work/deliver-truthful-opencode-next-run.md"
handoff: "../handoffs/deliver-truthful-opencode-next-run.md"
verdict: "PASS"
revision: "review-deliver-truthful-opencode-next-run-20260807-r9"
actor_id: "final_review_g51"
dispatch_receipt: "599488bbb5124ad9867c9e2955a21b69"
predecessor_receipt: "df8910f58491458eab884db31d841252"
predecessor_output: "../handoffs/deliver-truthful-opencode-next-run.md"
reviewed_candidate: "02979ff7488e0491b04f29876b253de3b96540b1"
reviewed_parent: "986c3ce6d7e091d9d59e50e83f355274de621884"
---

# Review: Deliver a truthful OpenCode next Run

## Verdict

`PASS` for exact immutable candidate
`02979ff7488e0491b04f29876b253de3b96540b1`.

No material finding remains. The candidate is exactly one atomic commit over the authorized base,
has no `apps/` or `packages/` drift, closes the previously reviewed migration, cross-Engine fact,
outbox-boundary, scratch-startup and proof-topology defects, and passes the independently rerun
focused gates below. The completed g50 predecessor adds the formerly missing same-candidate Pi
production journey without changing product bytes. Together with the retained g47 OpenCode
production journey, it satisfies Work done condition 6: each selected Engine crosses the literal
two-boundary Product-v2 gateway exactly once while the sibling boundary is observably untouched.

The maintainer explicitly decided that earlier credential disclosure is not a blocker for this
bounded acceptance. This Review follows that decision without weakening evidence hygiene: no
credential, endpoint, account, raw Provider response or child output is present in the retained g50
evidence, and this reviewer neither read nor reused any credential value.

## Findings

None.

## Scope and correctness review

- The completed predecessor operation `df8910f58491458eab884db31d841252` is a `verifier` operation
  by `pi_live_g50`, is recorded `completed`, targets the same Work entry and names the assigned
  r1.59 handoff as its output. The handoff links back to Work r1.9 and binds the exact candidate.
  The current reviewer actor and receipt are distinct and active.
- The full `986c3ce6..02979ff` delta contains 122 paths, 16,865 insertions and 1,252 deletions. The
  production changes remain inside the Work's Contracts, Service/Product/Automation/OpenCode,
  Native mapping/probe, Web, legal/source and bounded architecture seams. No Desktop supervision,
  credential store, provider configuration, Remote, release or Package-artifact authority was
  added.
- Product protocol/store v2 remains closed. Schema-1 migration rebuilds the production v2 tables,
  preserves canonical v1 Run/receipt/selection/mutation and Automation meaning, validates the
  cross-row Engine/resolved/binding/outbox relationships before either store writes, retains legal
  pending crash states, and resumes fixed-order per-file migration without claiming cross-file
  atomicity.
- The literal `makeProductExecutionGateway` routes prepare, attempt, control, recovery and facts by
  frozen Engine identity. Fact fan-in supplies its concrete source Engine; Product rejects source,
  outbox, binding or resolved-selection disagreement before mutation. Unknown or unavailable
  OpenCode never invokes Pi, and OpenCode startup failure does not suppress the healthy Pi catalog.
- Pi retains real accepted-operation evidence, Package generation, native control and recovery.
  OpenCode retains no-ACK observed-delivery truth, no operation reference, locked
  `approval-required`, ACP permission rejection and `unverified` enforcement. Durable outbox
  `accepted` versus `observed` boundaries survive reopen without rewrite; ambiguous post-send state
  remains one attempt, zero automatic replay and zero fallback.
- Exact `@agentclientprotocol/sdk@1.3.0` remains pinned as the sole ACP framing, schema, request
  correlation, handler dispatch, cancellation and protocol-error authority. The production
  `apps/service/src/opencode` residual scan found no handwritten JSON-RPC/framing or request-ID
  implementation; OmniMind code is limited to process/resource/privacy supervision, Product
  normalization and allowlisted proof serialization. Apache-2.0 legal/SBOM inventory is present.
- Web keeps Pi as the explicit next-Run default, presents Engine separately from Pi Model/Thinking,
  preserves unavailable OpenCode intent, derives selection-aware readiness and enforcement truth,
  migrates both draft owners to v2 before hydration, and rejects stale admission without invoking
  either Engine.

## Same-candidate production evidence

### OpenCode — retained g47 PASS

The mode-`0700` evidence root contains only a mode-`0600` final and pre-cleanup snapshot. Their
published SHA-256 values independently match:

- final `6e9f9b721c8c074a2071f9fb569fdb0f6d89bf00a8082e88f1427616a97368b8`;
- snapshot `d6b6f3c231771e7e19bcf9bf9f6ccbf26cddae57160a6cf59153420c157f2fdb`.

Allowlisted inspection proves candidate `02979ff…`, readiness `available / 1.14.40`, Product receipt
`settled / observed-delivery / succeeded`, no operation reference, one visible non-empty Assistant
Entry before one settlement, terminal outbox boundary `observed`, attempt/replay `1/0`, OpenCode
prepare/attempt/EngineAttemptGuard `1/1/1`, Pi sibling prepare/attempt `0/0`, fallback `0`, runtime
disposed, scratch empty, Product state removed and cleanup complete.

### Pi — completed g50 PASS

The production-layout Node executor launched the exact repository Native Host entry, formal Desktop
credential broker and repository `single-chat` proof. The final, snapshot, executor summary and
missing-root falsifier are all mode `0600` beneath mode-`0700` directories. Their published SHA-256
values independently match:

- final `675f092c50de9a71ac81632739fbe0262e6746237944a4be4ab2d6f98037fba3`;
- snapshot `ac50f24470767ae25b39f4ba765558092e5c34e5615a8253c4ea95971cd98a98`;
- executor summary `9bc1b4f1188e8c6a944f94b301f104785822118fb0a00d05c3a7f3d8bb0ed3f8`;
- Node falsifier `c404d7ef29a627d8f640ffb4a88da77bca930e3ea8696a4b9d9122d6e182c070`.

Allowlisted inspection proves candidate `02979ff…`, Node production host/probe exits `0/0`, Pi
runtime `0.81.1`, exact curated Package generation match, Product receipt
`settled / accepted-operation / succeeded` with a real operation reference, one visible non-empty
Assistant Entry before one settlement, terminal outbox boundary `accepted`, attempt/replay `1/0`,
Pi prepare/attempt/EngineAttemptGuard `1/1/1`, OpenCode sibling prepare/attempt `0/0`, fallback `0`
and cleanup complete. The broker recorded 38 availability requests and exactly one credential
request; no retry occurred.

The six retained acceptance/falsifier JSON files exactly match their closed top-level schemas.
An independent recursive scan found zero URL strings, zero secret/raw-response field names and zero
schema mismatches. The g50 root contains only its four sanitized receipts; the g47 root contains
only its two sanitized receipts. This corroborates the predecessor's bounded no-persistence scan
without exposing or re-reading credential values.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| Read `.omp-flow/.runtime/operations/df8910f58491458eab884db31d841252.json` and `599488bbb5124ad9867c9e2955a21b69.json` | PASS — completed predecessor/output/work match; current reviewer active; actors differ |
| Read README, Architecture index and applicable Product State/Execution/Workbench owners, Execution Brief, active Campaign, PRD, Design, calibrations, ACP/Product-seam research, Work r1.9 and handoff r1.59 | PASS — authority, scope, done conditions and evidence links are consistent |
| `git rev-parse HEAD HEAD^`; `git rev-list --count 986c3ce6..02979ff`; `git diff --name-status`; `git diff --stat`; `git diff --check`; `git diff --quiet HEAD -- apps packages` | PASS — exact candidate/parent, one commit, 122 paths, 16,865 insertions / 1,252 deletions, no whitespace error, no Product-byte drift |
| `git diff --binary 986c3ce6..02979ff -- apps packages \| shasum -a 256` | PASS — `c4d791b3a6a1e6357b34b8eca9c579defc0fde934b9e5fe76c9abc6260ff88e7`, matching the handoff |
| `bun run --filter @omnimind/contracts test -- src/product/state.test.ts` | PASS — 1 file / 7 tests |
| `bun run --filter @omnimind/service test -- src/native-host/liveJourneyProbe.test.ts src/opencode/liveJourneyProbe.test.ts src/opencode/productBoundary.test.ts src/product/productExecutionGateway.test.ts src/product/engineJourneyProof.test.ts src/product/schema1ProductTranscode.test.ts src/persistence/selectionSchemaCoordinator.test.ts` | PASS — 7 files / 44 tests |
| `bun run --filter @omnimind/service typecheck` | PASS |
| `bun run --filter @omnimind/native-host test && bun run --filter @omnimind/native-host typecheck` | PASS — 2 files / 30 tests; typecheck exit 0 |
| `bun run --filter @omnimind/web test -- src/components/product/ProductRuntimePicker.test.ts src/store/systemHealthStore.test.ts src/productReadModel.test.ts src/composerDraftV2Transcode.test.ts src/store/productStore.test.ts` | PASS — 5 files / 41 tests |
| `bun run --filter @omnimind/web test:browser -- src/components/ProductChatJourney.browser.tsx src/components/kanban/KanbanDispatchAdmission.browser.tsx src/components/kanban/KanbanRuntimePicker.browser.tsx` | PASS — 3 files / 14 Chromium tests |
| `bun run --filter @omnimind/web typecheck` | PASS |
| Inspect all retained g47/g50 file modes, parent modes, SHA-256, file inventory, closed keys and allowlisted receipt/outbox/counter/product fields | PASS — hashes and `0700/0600` modes match; both same-SHA journeys prove the required truth; no sensitive persisted field |
| `rg` production OpenCode sources for JSON-RPC/framing/request-ID duplication and `apps`/`packages` for stale provider-request guard terminology | PASS — official SDK remains the sole ACP wire owner; no stale provider-wire telemetry claim |

The broader repaired deterministic gates in handoff r1.59 also remain bound to the same unchanged
candidate: Contracts 7, Service 153, Native Host 30, Web unit 60 and Chromium 20 all passed, with
type/build/format/diff checks green and lint at zero errors.

## Acceptance boundary

This PASS accepts the bounded Work and exact implementation candidate; it does not self-promote the
Campaign to `verified`, authorize release/push, change credential stores or provider configuration,
or claim F-14–F-18. Per the Work and Campaign rules, Main may advance F-13 at most to `candidate` on
the reviewed SHA and perform metadata-only Finish/closure separately. No product-byte fix is
authorized or required by this Review.

## Dispatch identity

- role: `reviewer`
- actorId: `final_review_g51`
- receipt: `599488bbb5124ad9867c9e2955a21b69`
- predecessor: `df8910f58491458eab884db31d841252`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- reviewed candidate: `02979ff7488e0491b04f29876b253de3b96540b1`
- reviewed parent: `986c3ce6d7e091d9d59e50e83f355274de621884`
- verdict: `PASS`
- explicitly allowed fix: none
