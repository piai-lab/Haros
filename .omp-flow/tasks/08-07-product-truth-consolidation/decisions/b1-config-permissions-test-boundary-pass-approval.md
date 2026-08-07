---
type: "Decision"
title: "Approve B1 Service permissions test boundary repair"
---

# Approve B1 Service permissions test boundary repair

## Human calibration applied

The maintainer's standing direction for this Bundle is to continue aggressively, delete the old
unshipped schema/repair surface, and not pause again for ordinary bounded implementation choices.
That direction selects option 1 from the scoped
[`PASS` audit](../qbd/b1-config-permissions-test-boundary-repair-audit.md): accept the single-path
repair and restart B1 without restoring a retired Service database expectation.

The authority remains exactly the linked
[`calibration`](b1-config-permissions-test-boundary-repair-calibration.md):
`apps/service/src/config.permissions.test.ts` may remove the retired seed and legacy chmod
expectation, retain all current permission/link assertions, and add a generated-temp fail-closed
zero-mutation proof. No production path, startup deletion, migration, tool invocation or broader
test owner is added.

## Transition

The scoped QbD 2 verdict is accepted with zero blocking findings and zero advisories. B1 may resume
at implementation on the repaired Work revision. Every carried destructive, interruption,
strict-generation, compatibility-scan, frozen-meter, immutable-SHA and accepted-handoff condition
remains open until proven by the implementation candidate and a different-actor review.
