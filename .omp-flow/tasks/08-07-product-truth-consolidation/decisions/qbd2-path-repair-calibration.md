---
type: "Decision"
title: "QbD 2 path-boundary repair calibration"
---

# QbD 2 path-boundary repair calibration

## Human calibration applied

The maintainer has already directed this checkpoint to proceed aggressively, to repair blockers
instead of retaining compatibility, and not to pause again for ordinary implementation choices.
The first [QbD 2 audit](../qbd/work-map-audit.md) found two exact path-ownership defects rather than
a new product, destructive-risk or protocol decision. The standing human direction therefore
selects the audit's option 1: repair the Work boundaries exactly, retain the approved scope and
submit the changed map to a different-actor audit. Neither finding is accepted as residual risk.

## Required repair

1. Add `apps/service/src/opencode/liveJourneyProbe.ts` to the B1 boundary solely to consume the new
   canonical Product database resolver/path, and require its focused check before immutable B1.
2. Replace the nonexistent Native Host health path with
   `apps/service/src/product/health/nativeHostHealthMonitor.ts`; explicitly own
   `apps/service/src/native-host/liveJourneyProbe.ts` and
   `apps/service/src/native-host/packageCrashProbe.ts` for v2 binding construction, bounded
   readiness/error semantics and required process evidence.
3. Make the safe default ordering literal: accepted B1, then accepted Native Host binding, then
   execution leaf, Store and final Coordinator/facade C. No shared-tree overlap is inferred.
4. Tighten any remaining Store composition/probe wording to exact existing paths before assignment
   where repository evidence makes them known; an unknown required path still returns for map
   repair rather than expanding an implementer's authority.

The repair does not change A1-A15, the deletion boundary, QbD 1 PASS, protocol v2, B1 meaning,
complexity universe, g50 evidence or the prohibition on migration/backup/restore/compatibility.
