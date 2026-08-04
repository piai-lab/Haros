---
type: "QbD Audit"
title: "QbD 2 scoped recheck: Host placement ownership"
entry: "../work/index.md"
verdict: "PASS"
actor_id: "ui_chassis_qbd_2_recheck"
dispatch_receipt: "f8fc0037b31a4919af96b644eca4c782"
predecessor_receipt: "6ab80f1b42ab48548b95a56807714940"
---

# QbD 2 scoped recheck: Host placement ownership

> Historical audit note: a later controlling maintainer calibration merged the product-identity/
> asset responsibility into the runnable-source Work, so the live catalog now has seven Works.
> The Host ownership repair audited here remains unchanged. This is a bounded catalog correction,
> not another audit or a changed verdict.

本复核只挑战第一次 [QbD 2 audit](work-map-audit.md) 的 WM-01、维护者批准的
[有界修复](../decisions/qbd-2-calibration.md)，以及该修复可能引入的直接矛盾。它不重开已经通过的
QbD 1，不重审来源、权利、产品方向或其余 Work 设计，也不修改被审内容。

## Verdict

**PASS。** WM-01 已关闭，当前限域内没有 unresolved blocking finding，也没有修复引入的新 material
contradiction。

现有 [Host boundary Work](../work/establish-isolated-host-boundary.md) 现在原子地拥有唯一 Execution owner
确认与真实 Host 边界：`architecture/execution.md` 已进入精确 allowed paths；更新 owner 是创建
`apps/native-host` 前的第一项强制步骤；owner delta 被限定为 physical executable placement、build target、
separate Desktop supervision 和 direct Product Service client relation；产品对象、执行权威和 topology 方向均
不得改变。done、handoff、checkpoint 和 independent review 又要求 durable owner 与 development/packaged
process tree、Desktop supervision、Service client 及 T2→T4 原位连续性逐项相符。

这次 `PASS` 只证明 Work Map 已能合法且可验证地实施批准的设计。它不声称
`architecture/execution.md` 已经发生生产变更，不证明真实 Host 已创建，也不提升任何 Campaign claim。
这些事实仍须由该 Work 的实现、handoff、真实进程测试和独立 review 产生。

## Audit identity and bounded scope

- Entry: [UI chassis takeover implementation work](../work/index.md)
- Previous verdict: [QbD 2 attempt 1](work-map-audit.md)
- Human calibration: [QbD 2 human calibration](../decisions/qbd-2-calibration.md)
- Changed responsibility under review:
  [Establish the real isolated Host boundary](../work/establish-isolated-host-boundary.md)
- Durable owner checked: [`architecture/execution.md`](../../../../architecture/execution.md)
- Approved design anchors: [PRD R6/R8](../prd.md) and [Design target/T2/T4 boundary](../design.md)
- Actor: `ui_chassis_qbd_2_recheck`
- Dispatch receipt: `f8fc0037b31a4919af96b644eca4c782`
- Predecessor receipt: `6ab80f1b42ab48548b95a56807714940`

## WM-01 closure

### 1. Exact owner-path authorization is now executable

The Host Work's allowed-path block contains exactly:

```text
architecture/execution.md
```

and limits that path to the approved Host placement/build/supervision/client relation. No other Work needs to
edit the architecture owner to complete this decision. The Work therefore no longer forces an implementer to
choose between violating its path contract and silently overriding the sole owner.

### 2. Owner confirmation precedes path creation

The Objective, first In-scope item, Done conditions and Ordering/Review all require the Execution-owner update
before `apps/native-host` is created. Creation remains unauthorized until that confirmation is present in the
same Work change. This is strong enough to stop a path-first implementation and avoids treating the Bundle
Design as durable architecture authority.

### 3. The architecture delta is materially bounded

The authorized owner change can state only:

- `apps/native-host` is the physical executable workspace for the already approved isolated Native Host;
- it is its own build target;
- Desktop supervises Product Service and Native Host separately;
- Product Service is the direct Host protocol client.

The Work explicitly forbids a new product object, moved execution authority, another topology direction,
second Host, alternate transport or Electron Main payload proxy. These bounds match the existing Execution
responsibilities: Desktop owns supervision, Product Service owns Product control/facts, and the isolated Host
owns native execution only when T4 adds Pi. The repair therefore resolves placement ambiguity without reopening
the architecture decision.

### 4. Authority-to-runtime comparison is required at both process trees

The Done conditions require observed development and packaged process trees to show Desktop supervising
Service and `apps/native-host` separately, with Product Service directly using the Host protocol. Checkpoint
verification and Expected handoff require the same comparison against the durable Execution owner and reject an
undocumented intermediary or sibling Host target. The independent reviewer must perform that comparison rather
than accepting source text or a fake process fixture.

### 5. T2-to-T4 continuity remains one seam

The Host Work freezes executable identity, endpoint family, authentication, supervisor state machine, health
semantics and shutdown contract. It rejects any T2-only executable/transport. The later
[Pi adoption Work](../work/adopt-pi-native-execution.md) must extend this exact seam in place and still rejects a
second Host, alternate transport and permanent translator. The repair therefore preserves the QbD 1-closed
real Pi-free T2 shell and same-boundary T4 adoption rather than creating a temporary architecture.

## Work identities and closed coverage

At the time of this recheck, the Work Map linked eight executable responsibilities. The later
maintainer calibration merged the first two responsibilities atomically; it introduced no new
authority or checkpoint:

| Work identity | Carried responsibility | Recheck judgment |
| --- | --- | --- |
| Authorized runnable source and identity closure | R1–R4/R11, complete authorized assets, T1 hard-green and exact expected-red boundary | later merged in place |
| Product facts and typed ingress | R5/R9 Product writer, outbox, receipt and projection | unchanged |
| Isolated Host boundary | R6 and T2 half of R8 | WM-01 repaired in place; no scope fork |
| Agent and Chat workbench | R7/R11 UI mother, visual/a11y/performance proof | unchanged |
| Pi native execution | R5/R8/R9 real replacement and acceptance proof | unchanged; consumes repaired seam |
| Execution-authority retirement | R8/R10/R11 physical deletion and zero-exception scans | unchanged |
| Frozen production candidate | R12 same-SHA verification and claim boundary | unchanged |

R1–R12 and A-01–A-04 remain closed at the same Work owners described in the first audit. The repair changes only
the legal/executable ownership of the R6 physical placement. It does not alter T0–T4 meanings, ordering, candidate
eligibility, destructive deletion gates, visual calibration, source/right boundaries, Product single-writer
semantics or same-SHA proof.

## Carried judgments

The first QbD 2 audit's non-WM-01 judgments carry forward unchanged:

- T1 remains one atomic runnable closure with a pre-enumerated expected-red set and no production-candidate
  authorization.
- T2 Product facts and the real Pi-free Host remain ordered, independently reviewable responsibilities.
- T3 still requires same-state human visual calibration before material anchor deletion.
- T4 still requires queryable Pi acceptance and accepted replacement review before destructive authority
  retirement.
- Candidate freezing still verifies one immutable SHA and cannot repair failed production content or self-promote
  Campaign claims.
- The later maintainer calibration closed the A-03 precision observation by locking icon/identity direction in
  the source-closure Work while retaining material UI calibration in the Agent/Chat Work.
- Any future relocation of a retained mechanism outside the retirement Work allowlist still requires a scoped
  Work-boundary update and review; the handoff alone cannot widen it.

## Blocking findings

None.

## Residual implementation obligations

These are required execution proofs, not `NEEDS_EVIDENCE` blockers for the Work Map:

1. The Host implementer must actually update the Execution owner before creating the production path; current
   architecture text is an input, not evidence that this future step is complete.
2. Development and packaged process trees must be observed, not inferred from source layout.
3. T4 must reuse the frozen T2 Host seam; any real need for a second executable, transport or supervisor is a
   stop condition and a new material finding.
4. The final candidate must bind the owner change, executable bytes, process/fault evidence and independent
   review to the same accepted implementation history and immutable SHA.

Under the recorded human calibration, this scoped `PASS` closes QbD 2 and permits transition to Execute. It does
not waive any Work stop condition or implementation review.
