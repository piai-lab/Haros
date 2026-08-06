---
type: "Research"
title: "Synthesize the OpenCode checkpoint boundary"
---

# Synthesize the OpenCode checkpoint boundary

## Decision

Pause before Design and escalate one structural protocol/owner falsifier. The exact selected
OpenCode `1.14.40` ACP v1 path is real and locally usable, but it cannot satisfy the current strict
acceptance-authority contract without changing the owner wording or fabricating evidence.

## Evidence joined across both research Concepts

The [OpenCode ACP research](opencode-acp-boundary.md) binds the installed arm64 binary, version,
digest, release/tag, license and exact ACP implementation. Real probes proved initialization,
dynamic Session/model/mode facts, prompt-specific stream, final settlement, restart load/resume and
cancel behavior. They also proved the absence of a prompt acceptance ACK or operation ID. Before a
prompt-specific Engine fact or response, disconnect is `delivery_unknown`; after such a fact and
before final settlement, disconnect is `outcome_unknown`. Neither state is replayable. A cancel
write proves only `abort_requested`, because the real Engine can still return `end_turn`.

The [Product gateway research](product-gateway-seam.md) proves the existing Product admission,
transactional outbox, typed receipts and no-replay recovery are the correct reusable authority.
It also identifies the bounded implementation seam: one Engine-addressed Product gateway composing
the existing Pi Native Host boundary with one concrete OpenCode boundary, plus exact Engine-scoped
catalog, lineage, control and recovery. No duplicate Product runtime or generic Engine framework is
needed.

The conflict is therefore not architectural feasibility. It is the acceptance claim in
`architecture/execution.md:45-49`: only an Engine-accepted operation reference currently proves
authority transfer. OpenCode ACP has no such reference. Promoting stdio write, process liveness,
Session creation, a scheduled command update or the first stream fact to that strict accepted
reference would be false.

## Bounded owner choice

Recommendation: preserve the locked Engine and checkpoint, but amend the execution owner to admit a
named conservative no-ACK external protocol class. For that class, Product records the local send
boundary without claiming acceptance; the first prompt-correlated Engine fact proves only observed
delivery; a correlated final/error response settles the Run; ambiguous pre-observation disconnect
is `delivery_unknown`; ambiguous post-observation disconnect is `outcome_unknown`; both prohibit
automatic replay and fallback. This keeps the user-visible truth while accepting that authority
transfer cannot be proven at a separate ACK boundary on this exact protocol.

Alternatives are:

1. Keep the strict accepted-operation-reference owner unchanged and declare OpenCode `1.14.40`
   unsupported for this F-13 checkpoint. That ends the selected vertical slice without production
   integration.
2. Select a different exact Engine/protocol artifact with a real acceptance reference. That reopens
   the maintainer's locked product choice and requires new source/process evidence.

The recommendation is a real product/owner decision, not a low-risk implementation inference.
Until Main explicitly selects one alternative and Supervisor issues a continuation, the Executor
must not enter Design, edit product owners or production code, create implementation Work, run a
second live prompt, or weaken the acceptance claim locally inside this Bundle.

## Still locked under the recommendation

- Pi remains the bundled-native default and Gold Path.
- OpenCode stays user-installed, external and authoritative for its auth, Session, models, modes,
  upgrade and private execution state.
- Missing/auth-required/incompatible/unavailable OpenCode preserves the exact selection and input;
  Pi dispatch count remains zero.
- Permission enforcement remains `unverified` until a real deny-side-effect path is proved; ACP and
  process isolation are not a sandbox.
- Cancel is request-only unless the Engine supplies a confirmation; late facts and settlement remain
  authoritative.
- Unknown delivery/outcome remains one attempt, zero automatic replay and zero fallback.
