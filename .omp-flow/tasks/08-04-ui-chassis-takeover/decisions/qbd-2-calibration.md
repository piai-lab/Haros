# QbD 2 human calibration

## Decision

On 2026-08-04 the maintainer accepted the sole material finding in the first
[QbD 2 audit](../qbd/work-map-audit.md) and authorized its recommended minimal repair. The current
Work Map is not authorized for Execute until that repair receives a scoped `PASS`.

The maintainer also explicitly authorized immediate transition to Execute when the scoped recheck
passes. This is a conditional human calibration, not an inference from earlier product discussion.

## Authorized repair

- Update only the existing [Host boundary Work](../work/establish-isolated-host-boundary.md) and
  the [Work Map](../work/index.md) navigation/ownership text required to keep them consistent.
- Add `architecture/execution.md` to that Work's exact allowed paths.
- Make confirmation of `apps/native-host` as the physical executable workspace for the already
  approved isolated Native Host responsibility the first implementation step, before creating the
  production path.
- Limit the architecture-owner change to physical placement, build target and the already approved
  Desktop supervision / Product Service client relationship. It must not introduce a new product
  object, process authority or topology direction.
- Require the handoff and independent review to prove that the durable Execution owner, actual
  target, packaged process tree and T2-to-T4 in-place continuity agree.

No new Work, QbD 1 reopening, source/rights research, product direction, Package scope, Remote scope,
external Engine scope or release scope is authorized by this calibration. A scoped QbD 2 recheck may
challenge WM-01 and contradictions introduced by this delta; all other closed findings carry
forward.
