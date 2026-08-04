---
type: "QbD Audit"
title: "QbD 1 attempt 2: calibrated checkpoint repair"
entry: "../design.md"
verdict: "PASS"
actor_id: "ui_chassis_qbd_1_recheck"
dispatch_receipt: "9e59453cd00f4cbca636d81931c7b629"
predecessor_receipt: "80a3565b20924f928ffade8d312f559b"
---

# QbD 1 attempt 2: calibrated checkpoint repair

这是对 [PRD](../prd.md) 与 [Design](../design.md) 中 F-01/F-02 修复 delta 的独立限定复核。
复核以第一次 [QbD 1 audit](design-audit.md) 及维护者记录的
[human calibration](../decisions/qbd-1-calibration.md) 为边界；第一次审计已经关闭的判断与 A-01–A-04
继续生效。本次不重开 rights/source research、UI 方向、Package、Remote、external Engine 或 release scope，
也不把阶段设计写成 production、Campaign 或实现证据。

## Verdict

**PASS。** F-01 与 F-02 的两个 checkpoint 矛盾已经按人类校准的最小路径消除，且修复没有引入新的
material contradiction：

1. T1 现在有可同时满足的 exit predicate。rights/assets/legal、`vendor/ui` dependency 与 provenance 是
   hard-green；仅 mechanically moved Product Service 的精确 mixed Pi dependency 和 donor code identity
   是受控 expected-red。这个例外被 development-only profile、无真实 workspace/data/credential、无 release
   artifact、不得以该 SHA 单独 merge/promote/candidate 和 T4 无例外清零共同封闭。
2. T2 现在有真实可验收对象。它交付未来 production path 上的 Pi-free Native Host executable、认证且有界的
   Service↔Host channel、Desktop 独立 supervision、health、shutdown、restart budget 和 circuit breaker；
   T4 只在同一个 executable/endpoint/supervisor 内增加 Pi runtime、Session、dispatch 与 Package execution，
   并删除旧 authority。

因此 T1 的 source-closure proof 不再被最终 Host-only invariant 伪装成失败，T2 的 fault proof 也不再依赖一个
尚未存在的 T4 Host。两阶段的 owned change 与证据不重叠：T2 不产生 Engine acceptance/runtime journey
证据，T4 不能另建 Host、旁路 transport 或永久 translator。

当前限定范围内没有 unresolved blocking finding。`PASS` 只表示本 Design 可提交人类校准；它本身不授权
Decompose、Execute、Campaign 状态变化、source transplant 或生产删除。

## Audit identity and scope

- Entry: [UI chassis source and authority takeover design](../design.md)
- Requirements: [Runnable UI chassis takeover PRD](../prd.md)
- Prior audit: [QbD 1 attempt 1](design-audit.md)
- Human decision: [QbD 1 calibration](../decisions/qbd-1-calibration.md)
- Delta under review: F-01 T1 stage exception and F-02 T2/T4 Host ownership only
- Promised output: `qbd/design-audit-recheck.md`
- Actor: `ui_chassis_qbd_1_recheck`
- Dispatch receipt: `9e59453cd00f4cbca636d81931c7b629`
- Predecessor receipt: `80a3565b20924f928ffade8d312f559b`

## Scoped finding judgment

### F-01 — CLOSED: T1 hard-green and expected-red gates are now mutually executable

**Repair evidence.** PRD binding constraint 4 now explicitly makes zero Pi dependency outside Native Host a
**T4 production-candidate invariant**, not an unqualified T1 condition. It names T1 as the sole stage exception and
requires disposable local state, no real user data/workspace/credential, no release artifact and no T1-targeted
promotion. R2 and the checkpoint table separately require:

- hard-green zero authorized-corpus filename/byte delta and donor product binaries, complete legal/provenance evidence and zero root→`vendor/ui` dependency;
- an exact, pre-enumerated expected-red set for Product Service Pi dependencies and donor code identity;
- failure for any dependency/identity finding outside that set;
- no production/candidate claim from the T1 evidence.

Design §§4.4–4.5 repeats the same boundary as an executable profile and a two-result scan table. It also fixes the
terminal condition: the old route becomes unreachable at T2, while T4 physically deletes the debt and makes the
Host-external source/lock/artifact scan green without exception.

**Why the original consequence is removed.** A T1 reviewer no longer has to choose between a runnable moved closure
and a falsely green Product Service dependency scan. The declared result is now deterministically hard-green for
rights/provenance/vendor boundaries and expected-red only for an exact bounded debt set. A new or broader finding
fails T1; an expected finding cannot promote T1. This gives T1 one responsibility—prove the rights-safe physical
closure—and gives T4 the distinct authority/dependency deletion responsibility.

**No new material contradiction.** A non-candidate T1 commit may remain an ancestor in the continuous construction
chain, but the text forbids selecting that SHA itself as merge/release/candidate evidence; T4 must remove the debt
before the first production candidate. That is compatible with Git rollback/provenance and does not create a
parallel runtime or permanent waiver.

### F-02 — CLOSED: T2 now owns a real Pi-free Host boundary and T4 adopts it in place

**Repair evidence.** PRD R6 requires a real executable Host shell, not a stub or read-model simulation. Its T2
acceptance covers the actual authenticated rendezvous, readiness/liveness/shutdown, independent process kill,
restart budget, circuit breaker, re-entry, log attribution and zero Pi/Package executable dependency in that Host.
Unsupported Run/Engine requests fail truthfully; they do not produce accepted or indeterminate runtime evidence.

Design §5.6 assigns the corresponding production paths and behavior to T2: Desktop creates the scoped endpoint and
one-time authentication material, independently supervises Service and Host, and tests a real child process. Design
§7 then requires T4 to retain the same executable target identity, endpoint family, authentication, supervision,
health and shutdown contract while adding only runtime/catalog/Session/dispatch message families. The T4 gate also
requires a zero-second-Host/transport scan.

**Why the original consequence is removed.** T2 now has a concrete process to kill and restart, so its crash-domain,
health and circuit-breaker proof cannot be satisfied by fake state. T4 no longer silently absorbs T2 supervision
scope: it consumes the already proved boundary and owns Pi acceptance, Session continuity, real dispatch uncertainty,
Package execution and old-authority deletion. The distinction is observable in the gate: T2 real-path execution is
`unsupported`; T4 must prove the real Chat/Agent journey and crash windows.

**No new material contradiction.** Keeping the mechanically moved Pi dependency as unreachable physical debt in
Product Service through T2 does not give it live execution authority: the Product journey has cut over to one writer
and the old route must be negatively proved unreachable. Conversely, the Pi-free Host is not a second Agent Runtime;
before T4 it owns only the durable process/protocol/supervision seam and explicitly refuses execution.

## Carried-forward findings

The first audit's closed and advisory findings are not re-litigated. They remain binding inputs to Decompose and later
verification:

| Prior item | Carried status | Required downstream treatment |
| --- | --- | --- |
| rights/source path | closed, later calibrated | Preserve the complete authorized corpus with exact fixed/source/artifact proof; keep donor product binaries zero and legal/provenance complete. |
| A-01 scan truth | advisory, carried | Author the exact T1 expected-red package/path and identity sets before judging scan output; never label a run scan as production identity green. |
| A-02 acceptance truth | advisory, carried | Make queryable Pi acceptance the first T4 falsifier before destructive authority deletion; otherwise settle as unknown and never invent/replay a receipt. |
| A-03 UI visual gate | advisory, carried | Preserve baseline → human same-state calibration → surgery → renewed proof → deletion ordering; QbD approval is not visual approval. |
| A-04 evidence SHA | advisory, carried | Keep historical T0 evidence tied to its source SHA and current-candidate gates tied to the frozen candidate SHA; do not repeat an unchanged probe. |
| Product single writer, typed ingress/uncertainty, UI mother, deletion and frozen-candidate routes | closed | Preserve the accepted design and its stop conditions; this scoped repair adds no authority to change them. |

## Scoped adversarial result

| Counter-case | Result | Reason |
| --- | --- | --- |
| T1 still claims zero Pi dependency while running the mixed backend | rejected | Zero Host-external dependency is explicitly T4-only; T1 records the exact mixed debt as expected-red and cannot be promoted. |
| T1 expected-red can hide new dependency or identity leakage | rejected | Only a pre-enumerated exact set is allowed; any extra finding fails the checkpoint, while rights/assets/legal stay hard-green. |
| T2 Host is a fake heartbeat used to satisfy fault tests | rejected | The Host must be the production-path executable and real authenticated channel that T4 extends in place; fake/in-process/read-model-only paths are negative test targets. |
| T2 fabricates Engine acceptance to make the journey appear complete | rejected | T2 only emits health/handshake/typed unsupported; acceptance/stream/uncertainty runtime proof is explicitly T4-owned. |
| T4 can replace the T2 shell with a second Host or transport | rejected | PRD R8 and Design §§5.6/7 require identity/endpoint/supervisor continuity and a zero-second-path scan. |
| Old Product Service execution remains live until physical deletion | rejected as a design path | T2 requires a single Product writer and negative reachability proof before T4 performs physical deletion; dual write or live old routing fails the checkpoint. |

## Human calibration

The applicable governance option is one bounded decision: accept this scoped `PASS` and proceed to Decompose while
carrying the table above into the work map, or withhold approval and identify a material contradiction in the repaired
F-01/F-02 boundary. No new Converge, research or broader evidence audit is indicated by this recheck.
