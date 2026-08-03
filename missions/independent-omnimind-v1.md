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

## 2. Authority

读取顺序：

1. `README.md` — 唯一产品与架构真相
2. `execution-brief.md` — 当前施工顺序
3. `discovery-record.md` — 裁决依据
4. 本文件 — 唯一 Campaign 状态

不得创建第二 Campaign、Goal spec、ledger、manifest、handoff 或进度报告。历史聊天、旧 worktree、旧 probe 和自动摘要都不是当前权威。

## 3. Locked decisions

- Pi-native / OmniMind-owned / Ecosystem-first / Engine-open；
- 对外诚实 Powered by Pi，OmniMind 保持独立品牌；
- Pi 是唯一 bundled-native Engine，外部 Agent 不承诺同等集成深度；
- Pi SDK 在 isolated worker/sidecar，绝不进入 Electron Main/renderer；
- SDK 是 Gold Path，RPC/ACP 不是 bundled 产品宪法；
- Pi 拥有 native Session、Provider/Model/Thinking、ResourceLoader、Extension lifecycle 和 Package private state；
- OmniMind 拥有 Workspace、visible Conversation、轻量 Run receipt、资源/副作用引用、Package trust/current/LKG、桌面体验和跨 Engine 连续性；
- U1 使用完整 exact provenance baseline，再换脑；
- 旧自研 extension/runtime/journal skeleton 删除，不保留兼容层；
- Package 使用 Catalog/Curated/Verified 与 Native/Bridged UI/PTY/Unsupported 分级；
- `Agent | Chat` 是一级入口，Agent 有 Folder，Chat 默认无 Primary Folder且引用只读；
- 中英文、真实性、恢复、性能和三平台是 V1 质量门。

只有新的固定源码或真实运行证据推翻上述前提时才重新收敛；实现困难本身不是推翻理由。

## 4. Authorization and boundaries

### Authorized

- 删除、重命名、重构全部产品代码、测试、文档、schema、目录和功能；
- 完整源码接管、package、fork、transplant、adapt 或重写；
- 在唯一 Campaign branch/worktree 中形成 exact provenance baseline；
- 使用本机固定研究镜像验证 Pi/U1；
- 在来源、权限、成本和秘密边界内运行 focused live tests；
- commit 与 push 已验证的 in-scope 变更。

### Not authorized by this Campaign alone

- 发布公开版本、创建公开远端或选择最终商业许可；
- 未核 rights 的源码/资产进入 production candidate；
- 自动合入上游更新；
- 把第三方任意代码描述为安全沙箱；
- 删除与当前任务无关且含未知未提交修改的其他工作树；
- force-push、重写共享历史、泄漏 credential 或执行无界费用测试。

## 5. Milestones

### M0 — Doctrine reset

- 单一 Pi-native 产品宪法；
- 删除旧 runtime/journal skeleton；
- AGENTS、execution、discovery 与 Campaign 对齐；
- source/identity/structure gates 通过。

Exit: F-01、F-02 为 candidate。

### M1 — U1 provenance and rights

- 固定完整 revision；
- 核原始上游 lineage、history、contributors、assets 和 LICENSE；
- full-tree runnable baseline commit；
- README adoption 与 `LICENSES/` 同 commit；
- baseline 不承载 OmniMind 新产品代码。

Exit: F-03、F-04 为 candidate。

### M2 — Pi native vertical slice

- Electron desktop + Product Service + isolated Pi Host；
- real Provider/Model/Thinking；
- Chat 与 Agent 的第一条完整用户旅程；
- visible Conversation + native Pi Session 双权威；
- outbox/receipt、stream、tool、queue、steer、cancel、restart/rebuild；
- U1 runtime/provider/state 被替换且无长期双轨。

Exit: F-05 至 F-10 为 candidate。

### M3 — Package distribution slice

- 一个真实 headless Package native load；
- 一个 raw-UI/TUI Package 正确进入 PTY 或 unsupported；
- source/rights/trust/compatibility report；
- exact generation、safe activation、lease、LKG rollback；
- Package fault isolation 与三平台路径。

Exit: F-11、F-12 为 candidate。

### M4 — External Engine escape hatch

- 一个真实 ACP Engine；
- next-Run switch、capability truth、permission truth、no fallback；
- 返回 Pi 时 stale lineage rebuild；
- 从两条具体路径提炼最小 ingress contract，无 switch 蔓延。

Exit: F-13 为 candidate。

### M5 — Files, Remote and product durability

- 文件/Diff/Terminal/Artifact 与 observed-version writes；
- crash/restart/outcome-unknown matrix；
- 一个真实 SSH target 和 durable external process；
- large conversation/output 性能与中文/英文关键路径。

Exit: F-14 至 F-17 为 candidate。

### M6 — Release candidate

- macOS、Windows、Linux packaging/update/rollback；
- all required claims frozen on one SHA；
- final gates 与独立 completion audit。

Exit: F-18 verified，Campaign 完成。

## 6. Acceptance matrix

状态只允许 `open -> candidate -> verified`，另有 `blocked`。生产者只能提交 candidate；verified 需要独立证据。final SHA 改变后，受影响 verified 回到 candidate。

| ID | Claim | Proof type | Status | Evidence | SHA |
| --- | --- | --- | --- | --- | --- |
| F-01 | Product doctrine, execution order, discovery rationale and Campaign express one non-contradictory Pi-native architecture; no obsolete RPC-first, Pi-through-ACP, equal-engine or hidden-Pi doctrine remains | deterministic text/decision audit | open | — | — |
| F-02 | Repository contains no competing custom Agent/Extension runtime, full execution journal, donor identity leakage or untracked source adoption; identity, structure, source and focused tests pass | source/tree scan + tests | open | — | — |
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

## 7. Retired evidence

Earlier M0/M1 candidates and branches measured useful mechanisms, but their custom extension bridge, Thread journal, direct-RPC-first and engine-neutral conclusions are superseded by the confirmed Pi-native architecture. They remain recoverable in Git history and cannot be cited as current production evidence. No old `candidate` status transfers automatically to this matrix.

This reset is deliberate: preserving obsolete green tests would create false confidence and maintenance obligations for code that must not ship.

## 8. Current next action

1. Complete M0 doctrine/code deletion and run `npm run quality`.
2. Commit the reset as one concern; do not mix donor import into it.
3. Start one Campaign branch/worktree from that clean SHA.
4. Complete U1 rights/history/asset audit.
5. Import the exact complete U1 source and prove unchanged runnable baseline.
6. Immediately begin the Pi SDK isolated-host Chat vertical slice; do not start Package marketplace, Remote, Wiki or a generic multi-engine framework first.

## 9. Blockers

None currently. U1 rights failure or evidence that Pi SDK cannot run a representative native Package in an isolated Host would be a structural blocker and trigger a new convergence round; ordinary implementation difficulty does not.

## 10. Done

Not done. All current claims are open.
