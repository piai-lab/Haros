---
type: "QbD Audit"
title: "Final recheck of the r1.9 selected-Run persistence mapping"
role: "qbd"
actorId: "persistence_mapping_final_qbd_g2"
receipt: "bc7b22683c1f41cbaf69039f74532f99"
predecessor: "e3227d89db2c4667a0dab40bb8a9ea23"
verdict: "PASS"
---

# Final recheck of the r1.9 selected-Run persistence mapping

## Evaluated decision and scope

This independent final recheck evaluates only the r1.9 repair to the existing persistence-delta
lineage: the normative v1 `ProductSelectedRuntime` to v2 selected-Run transform, its complete
canonical-byte fixture, the distinction between selected intent and independently resolved truth,
and the cross-row contradiction matrix in the repaired [Design](../design.md), bounded
[Work](../work/deliver-truthful-opencode-next-run.md), and human
[cross-store calibration](../decisions/cross-store-calibration.md). It carries forward the
predecessor [FAIL](persistence-delta-recheck.md) and does not reopen closed two-store topology, Web
draft authority, Automation ownership, OpenCode/Pi execution, no-ACK, or unchanged product
decisions.

## Verdict

**PASS** — risk **medium / implementation-verification residual**; **0 blocking findings**.

r1.9 closes the predecessor's sole blocker. The same legal v1 selected Run now has one normative v2
representation: historical Engine identity is preserved rather than replaced, flat model/thinking
becomes the `product-model` choice, all remaining selected facts are preserved, migrated Package
generation remains non-null, and enforcement is removed only from selected intent. Independently
resolved receipt truth remains mandatory and exact for receipt states that legally possess it, while
states that legally lack it do not receive fabricated truth. The Work binds implementation and
verification to this mapping and to fail-closed cross-row consistency.

This model verdict does not authorize Execute. A linked human calibration is still required.

## Evidence assessment

### Confirmed evidence

- The Design now names the production v1 decoder exclusively as `ProductSelectedRuntime` and
  requires exactly one canonical v2 selected object for every legal row (Design lines 707,
  721–731).
- The normative table is field-complete: `state` remains `selected`; an arbitrary valid legacy
  `engineId` is preserved byte-for-value and is never replaced by `pi` or catalog/default state;
  flat `runtimeModelId` plus nullable `thinking` maps exactly to
  `runtimeChoice: { kind: "product-model", runtimeModelId, thinking }`; policy, target and non-null
  Package generation are copied exactly; enforcement is validated but omitted from the v2 selected
  object (Design lines 733–741).
- The nullability boundary is explicit: every migrated Run must retain a valid non-null Package
  generation equal to the duplicate Run column and relevant resolved/Package evidence. `null` is
  legal only for newly admitted OpenCode Runs, not historical migration (Design lines 686–688,
  740).
- The resolved-truth distinction is legal and closed. Accepted, running, settled and
  outcome-unknown v1 receipts must carry and preserve independently resolved Engine, model,
  thinking, policy, enforcement, target and Package facts. Pending, rejected and delivery-unknown
  receipts legally lack resolved selection; migration omits selected enforcement without inventing
  resolved truth (Design lines 743–751).
- Zero-write preflight rejects missing required resolved truth and contradictions among Run,
  receipt, binding, resolved selection, outbox and Package facts. The verification inventory names
  Engine identity, enforcement, Package generation, model and target contradiction fixtures, plus
  a legal unresolved-state fixture (Design lines 743–749, 839–850; Work lines 42–46, 140–147).
- The positive selected-Run fixture includes non-null thinking, a non-default permission policy,
  concrete target, non-null Package generation and resolved receipt/binding facts, and must assert
  the complete canonical v2 JSON bytes. The Work additionally requires a non-`pi` legacy Engine ID,
  exact `product-model` choice, enforcement omission/resolved-truth validation and row/byte
  preservation, so preserve-versus-replace is discriminated rather than inferred (Design lines
  844–849; Work lines 140–147).
- The human calibration and Work agree with the Design: preserve historical
  Engine/model/thinking/policy/target/Package truth, omit enforcement only from selected intent,
  preserve it in required resolved truth, and do not normalize, default, fall back or create a dual
  decoder (cross-store calibration lines 19–39; Work lines 34–46).

### Assumptions

- “Canonical bytes” are produced by the sole production v2 encoder; the Design need not duplicate
  that encoder's property-order algorithm as prose. The fixture must compare the full encoded byte
  sequence, not a parsed-object equivalence.
- The named model contradiction fixture exercises the complete resolved runtime choice, including
  thinking consistency, or thinking mismatch receives an equally direct assertion in the same
  focused matrix.

### Strongest counter-evidence

- The short named contradiction list explicitly calls out Engine ID, enforcement, Package
  generation, model and target, but does not separately name permission-policy or thinking mismatch
  fixtures even though the normative table requires both to agree with resolved facts.
- The Design requires complete expected canonical bytes but intentionally leaves the literal byte
  string to the production encoder-bound fixture rather than embedding a second serialized copy in
  architecture prose.

Neither point is decision-critical. The normative validations are unambiguous, the positive
complete-byte fixture covers non-default policy and non-null thinking, and zero-write preflight plus
the Work's “every named contradiction” gate makes the migration realizable and reviewable. A
missing direct negative assertion for policy or thinking would be an implementation-review defect,
not an unresolved design authority or a reason the mapping can produce multiple compliant outputs.

### Accepted risk

- The already calibrated two-file migration may durably stop at a mixed marker after a crash, but
  runtime remains closed until deterministic recovery completes. This accepted topology risk is
  unchanged and outside this final mapping-only recheck.
- Web localStorage remains independently recoverable and non-atomic with SQLite. Its failure gates
  stale draft dispatch without invalidating successfully migrated Product truth. This accepted
  authority boundary is unchanged.

## Closed predecessor finding

### B1 — Ambiguous selected-Run canonical transform — closed

The predecessor found that r1.8 did not decide whether migration preserved or replaced legacy
Engine identity, did not normatively map flat model/thinking to a v2 runtime-choice variant, and did
not fully close state and Package nullability. r1.9 now decides every field and forbids normalization:
legacy Engine identity is exact historical truth; model/thinking always becomes `product-model`;
state remains selected; all migrated Package generations remain non-null; and current catalog state
cannot rewrite historical bytes. The fixture must assert the complete canonical output with a
non-`pi` legacy Engine ID, so the previously competing mappings no longer both satisfy the Design.

The legal resolved-truth rule also prevents removal of enforcement from selected intent from
silently erasing or synthesizing execution truth. Required receipt states preserve it; receipt
states that never had it remain legally unresolved. Contradictions fail before either store is
written.

## Advisory observation

- In implementation review, prefer explicit negative fixtures for permission-policy mismatch and
  thinking mismatch rather than relying only on the complete positive bytes and a combined model
  contradiction. This would make the normative per-field consistency rule maximally local to
  diagnose, but it is not required to choose or understand the architecture.

## Exact next decision and options

Human calibration must choose one direction:

1. **Accept this PASS and resume the existing bounded Execute route:** record a linked human PASS,
   then permit Supervisor to issue the separately required `CONTINUE` for the r1.9 Work. The
   implementation candidate must still satisfy all focused migration fixtures and different-actor
   review; this audit supplies no implementation approval.
2. **Request bounded verification strengthening:** require separate permission-policy and thinking
   contradiction fixtures before Execute while preserving all r1.9 product and architecture
   decisions.
3. **Defer** the persistence-dependent external-Engine slice.
4. **Stop** this Bundle.

## Evidence anchors

- Entry: `.omp-flow/tasks/08-06-opencode-external-engine/design.md`, especially lines 699–751 and
  839–850.
- Work map: `.omp-flow/tasks/08-06-opencode-external-engine/work/deliver-truthful-opencode-next-run.md`,
  especially lines 34–46 and 117–147.
- Human repair decision:
  `.omp-flow/tasks/08-06-opencode-external-engine/decisions/cross-store-calibration.md`, especially
  lines 10–45.
- Predecessor audit:
  `.omp-flow/tasks/08-06-opencode-external-engine/qbd/persistence-delta-recheck.md`.
- Stable authority: `architecture/product-state.md`, especially Run selection, transactional
  outbox, receipt certainty and recovery; `architecture/execution.md`, especially post-admission
  execution authority and External Engine Gateway.

## Mechanical handoff

- Verdict: `PASS`
- Risk: `medium / implementation-verification residual`
- Blocking count: `0`
- Actor ID: `persistence_mapping_final_qbd_g2`
- Receipt: `bc7b22683c1f41cbaf69039f74532f99`
- Predecessor receipt: `e3227d89db2c4667a0dab40bb8a9ea23`
- Predecessor output:
  `.omp-flow/tasks/08-06-opencode-external-engine/qbd/persistence-delta-recheck.md`
- Audit output:
  `.omp-flow/tasks/08-06-opencode-external-engine/qbd/persistence-mapping-final-recheck.md`
