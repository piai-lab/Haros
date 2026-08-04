# QbD 1 human calibration

## Decision

On 2026-08-04 the maintainer accepted the two blocking findings in the first
[QbD 1 audit](../qbd/design-audit.md) and authorized the recommended bounded repair.
The audited Design is therefore not approved for decomposition in its current form.

The repair is limited to these checkpoint boundaries:

1. T1 is an explicitly controlled, disposable, local non-candidate exception. Its runnable donor
   backend may temporarily retain the mixed Pi dependency needed to prove the mechanically moved
   dependency closure. It may not use real user data or credentials, produce a release artifact,
   merge or promote as a production candidate. Asset exclusion and legal provenance remain hard
   requirements at T1; Product Service zero-Pi dependency becomes a T4 production-candidate gate.
2. T2 establishes a real Pi-free Native Host process, authenticated protocol boundary, independent
   Desktop supervision, health model and kill/restart/circuit-breaker evidence. T4 connects Pi
   runtime, Session and Package execution to that same boundary, completes the dispatch fault
   matrix and deletes the old execution authority.

## Governance

- The Pi-native architecture, Product single-writer boundary, typed uncertainty, UI mother,
  rights-safe asset policy, deletion gates and same-SHA candidate verification remain unchanged.
- The repair does not reopen Converge, rights/source research, the product information architecture,
  Package scope, Remote scope, external Engine scope or release scope.
- After the PRD and Design express the repaired boundaries without contradiction, one independent
  scoped QbD 1 re-audit may challenge only the two repaired findings and contradictions introduced
  by that delta. Closed and advisory findings from attempt 1 carry forward.
- A scoped PASS still requires one human calibration before Decompose. It does not substitute for
  the later same-state visual calibration of real UI candidates.
