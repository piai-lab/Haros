# QbD 2 approval

## Decision

The maintainer's [QbD 2 calibration](qbd-2-calibration.md) explicitly authorized immediate Execute
after a scoped `PASS`. The [scoped QbD 2 recheck](../qbd/work-map-audit-recheck.md) returned `PASS`,
closed WM-01 and found no new material issue. The condition is therefore satisfied and the approved
eight-Work map may enter Execute without another design or evidence audit.

## Execution boundary

- Execute the eight Works in the authored order with one implementer handoff and a different-actor
  independent review for each current Work revision.
- Sequential ownership transfers are binding; overlapping root, Web, Service, Desktop, contracts
  and Host paths may not be edited by parallel Works.
- `architecture/execution.md` must be updated and reviewed inside the Host boundary Work before
  `apps/native-host` is created.
- A failed Work falsifier, review or visual calibration returns to that Work. It does not authorize
  compatibility tracks, weakened proof, skipped deletion or a broadened final allowlist.
- Intermediate checkpoints remain non-candidate. Campaign claims remain producer-limited until
  independent Campaign verification.
