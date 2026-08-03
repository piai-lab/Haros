# Independent OmniMind V1 Campaign

Status: active

Owner: maintainer

Canonical path: `missions/independent-omnimind-v1.md`

Updated: 2026-08-03

## 1. Objective

交付 production-grade OmniMind V1：一个公开 Powered by Pi、以 Pi 为唯一 bundled-native Gold Path、具有世界级桌面 GUI、可信 Package 分发与恢复能力，并可接入真实外部 Agent Engine 的本地优先跨平台产品。

Campaign 完成必须同时满足：

- required claims 全部在同一 frozen final SHA 为 `verified`；
- `blocked = 0`；
- 相关 final gates 在该 SHA 运行并通过；
- fresh-context completion audit 无 material finding；
- 没有 donor identity、双 runtime、平行 Package loader、静默 fallback、虚假权限或未披露来源。

## 2. Authority and read route

本文件只拥有 Campaign claim 状态和证据指针，不定义产品、UI、对象、topology、施工计划或来源结论。统一读取顺序是：

1. `README.md` — 产品宪法与 production adoption；
2. `architecture/README.md` 与全部相关专题 owner — 稳定 contract；
3. `execution-brief.md` — 当前施工顺序与 proof gate；
4. 本文件 — active Campaign status only；
5. 只有来源、既往裁决或潜在反证相关时，才读取 `research/README.md` 与对应 evidence。

权威不由顺序产生。产品决定见 README/architecture，施工顺序见 execution brief，固定证据与复验触发器见 research。不得创建第二 Campaign、Goal spec、ledger、manifest 或进度报告；历史聊天、旧 worktree 和自动摘要不是状态证据。

## 3. Acceptance matrix

状态只允许 `open -> candidate -> verified`，另有 `blocked`。生产者只能提交 candidate；verified 需要独立证据。final SHA 改变后，受影响 verified 回到 candidate。

| ID | Claim | Proof type | Status | Evidence | SHA |
| --- | --- | --- | --- | --- | --- |
| F-01 | Product doctrine, execution order, discovery rationale and Campaign express one non-contradictory Pi-native architecture; no obsolete RPC-first, Pi-through-ACP, equal-engine or hidden-Pi doctrine remains | deterministic text/decision audit | candidate | Root constitution, execution phases, decision ledger and locked Campaign decisions were rewritten together; the previous transport/identity/authority routes remain only in explicit rejected/retired context. `git diff --check` and the README-derived identity/structure scan passed on the reset SHA. | `ee67b0858bdf2c701a904b78864f35ea9df2d1b7` |
| F-02 | Repository contains no competing custom Agent/Extension runtime, full execution journal, donor identity leakage or untracked source adoption; identity, structure, source and focused tests pass | source/tree scan + tests | candidate | The custom engine/extension, journal/projection, tool execution and output skeleton plus five obsolete suites were deleted. `npm run quality` passed: 12 source files, 0 generated files, 0 adopted sources and 8/8 governance tests; the repository inventory now excludes tracked paths deleted from the working tree. | `ee67b0858bdf2c701a904b78864f35ea9df2d1b7` |
| F-03 | U1 exact source, original-upstream lineage, contributors, assets, rights and legal texts are fully disclosed before production adoption | manifest + legal/history review | open | — | — |
| F-04 | Complete U1 tree builds and launches unchanged at the provenance baseline, and that commit contains no OmniMind product surgery | reproducible build/run + tree digest | open | — | — |
| F-05 | Pi SDK runs only in a supervised isolated Host; Electron Main/renderer survive Host/package crash and never execute third-party Agent code | process fault injection + architecture audit | open | — | — |
| F-06 | Real Pi Provider, Model catalog and Thinking levels drive one Chat and one folder-backed Agent without product-maintained static mirrors | live integration + catalog/config tests | open | — | — |
| F-07 | Pi owns native Session/transcript/compaction/branch/package state while OmniMind owns visible Conversation and lightweight Run receipts; restart, loss and rebuild do not create competing truth | schema/API review + recovery matrix | open | — | — |
| F-08 | Transactional dispatch distinguishes pending, delivered and delivery-unknown; side effects after uncertain dispatch are never blindly replayed | crash-boundary fault matrix | open | — | — |
| F-09 | Stream, thinking, tool activity, output, queue, steer, follow-up, cancel and usage project incrementally into stable UI without raw Engine payloads reaching React | real stream/replay/type/performance tests | open | — | — |
| F-10 | U1 visual quality and critical workbench behavior survive surgery while donor provider/runtime/state/identity and long-term dual tracks are absent | UI/e2e/structure audit + maintainer review | open | — | — |
| F-11 | One exact mature Pi Package runs unchanged through native ResourceLoader with truthful source, rights, permissions, compatibility and private-state ownership | real package matrix + source review | open | — | — |
| F-12 | Package Catalog/Curated/Verified and Native/Bridged UI/PTY/Unsupported are accurate; active generation never hot-updates and staged failure returns to LKG | update/fault/compatibility matrix | open | — | — |
| F-13 | One external ACP Engine can handle the next Run in the same Conversation with honest capability/permission differences, no silent fallback and no lowest-common-denominator rewrite of Pi Gold Path | two-engine conformance + architecture audit | open | — | — |
| F-14 | Chat read-only/no-folder and Agent folder/write boundaries are real; file writes use observed-version preconditions and recovery never destroys user Git or concurrent edits | filesystem/Git concurrency tests | open | — | — |
| F-15 | Local and one real SSH target share product semantics while host keys, credentials, remote files and durable process state retain correct authority and recover after disconnect | real remote scenario + security audit | open | — | — |
| F-16 | Permissions report policy separately from host/engine enforcement; Package isolation is not overstated as sandbox and post-dispatch uncertainty remains visible | deny-side-effect and process-boundary tests | open | — | — |
| F-17 | Chinese and English critical journeys, 100k+ visible Conversation, burst streaming, large/unknown outputs, stable scrolling and bounded memory meet measured budgets | dual-locale e2e + profiling | open | — | — |
| F-18 | Signed/traceable macOS, Windows and Linux candidates install, update, roll back and pass all required final gates on one frozen SHA; independent audit has no material finding | release matrix + fresh-context audit | open | — | — |

## 4. Retired evidence

Earlier M0/M1 candidates and branches measured useful mechanisms, but their custom extension bridge, Thread journal, direct-RPC-first and engine-neutral conclusions are superseded by the confirmed Pi-native architecture. They remain recoverable in Git history and cannot be cited as current production evidence. No old `candidate` status transfers automatically to this matrix.

This reset is deliberate: preserving obsolete green tests would create false confidence and maintenance obligations for code that must not ship.

## 5. Current status and next evidence route

F-01/F-02 remain `candidate`; F-03 through F-18 remain `open`. [`research/source-review.md`](../research/source-review.md) already records the exact-tree comparison, install/build/typecheck, unchanged macOS desktop smoke, upstream failures, limitations and revalidation triggers. This Campaign does not reinterpret that evidence or request the same unchanged probe again.

The ordered work is owned by [`execution-brief.md`](../execution-brief.md): finish and independently review the durable architecture/UI/governance contract; review the recorded F-03/F-04 evidence and remaining rights/assets gaps; map approved UI source domains; then begin the Execution-owned isolated Native Host and the first real Product-State-defined journey. No claim changes state merely because those documents are edited.

## 6. Blockers

None currently. U1 rights failure or evidence that Pi SDK cannot run a representative native Package in an isolated Host would be a structural blocker and trigger a new convergence round; ordinary implementation difficulty does not.

## 7. Done

Not done. F-01 and F-02 are candidate; F-03 through F-18 remain open.
