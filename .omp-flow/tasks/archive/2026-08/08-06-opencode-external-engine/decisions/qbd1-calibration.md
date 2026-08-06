---
type: "Decision"
title: "Calibrate QbD 1 repair"
---

# Calibrate QbD 1 repair

## Human decision

The maintainer recorded `REPAIR` in contract amendment
`omnimind-external-engine-20260806-r1.4` for the independent
[QbD 1 audit](../qbd/design-audit.md). This is the human calibration required by the Bundle; it is
not inferred from the audit verdict or runtime state.

## Binding repair

1. The v1-to-v2 Product Store migration inventories and transactionally transcodes every affected
   schema-version-bearing durable JSON value, including submit-admission exact-byte identity and all
   24 current mutation request/response families. Reopen retries must return the migrated original
   v2 result without reapplying effects. Any malformed, unsupported or inconsistent row rolls back
   the whole migration and preserves a recoverable schema-1 Store.
2. The frozen post-repair candidate must run exactly one smallest real Pi journey through default
   selection, Product v2 admission, the composed gateway, real Native Host accepted-operation
   reference, typed visible stream/final and settled receipt, with OpenCode invocations zero.
3. Any later admitted different-Engine Entry forces lineage divergence, regardless of whether it
   produced a binding.
4. The no-ACK OpenCode path may record only `local-write` before prompt-correlated evidence; it may
   not use an acceptance-ACK boundary.
5. Scratch ownership, `0700` mode, no-symlink/path checks and deterministic cleanup are privacy
   hygiene, never a sandbox claim.
6. OpenCode's locked `approval-required` Product policy, ACP ask rejection, OpenCode's own
   allow/deny rules and `unverified` enforcement remain separate in state and copy.

The repaired [Design](../design.md) incorporates every item above. No second QbD 1 is requested for
these unchanged findings. The maintainer authorizes Decompose followed by QbD 2; Execute remains
forbidden until QbD 2 passes.

## Stop condition retained

If implementation inventory discovers an additional durable schema owner outside the bounded
Product submit/mutation/Queue/Run/receipt/outbox path, or the concrete transaction cannot preserve
atomic rollback without a new product choice, work returns to Main rather than silently omitting the
owner or creating a generic migration framework.
