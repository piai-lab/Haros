---
type: "Implementation Handoff"
title: "Authorized runnable source closure — final identity and structure correction"
work: "../work/transplant-runnable-source-closure.md"
status: "DONE"
revision: "handoff-transplant-runnable-source-closure-20260805-r5"
actor_id: "final_identity_structure_closure_implementer_r2"
dispatch_receipt: "bbff5b24c549476aa094ad39d79c7d79"
predecessor_receipt: "7240924c8ea0459b8a5aeff247c67b36"
predecessor_review: "../reviews/transplant-runnable-source-closure.md"
---

# Authorized runnable source closure

## Current outcome

The bounded T1 identity/structure correction is implemented and ready for a new independent review. Production
identity scanning is strict, source structure has zero findings without a debt baseline, the existing first-party
OmniMind icon is the locked current icon, and AppSnap uses bridge terminology end to end. This handoff does not
promote a Campaign claim, commit, publish, or alter runtime/session records.

Root quality is currently red only at the separately owned source-closure disposition check: the checker expects
`2,250` present and `20` removed adapted paths but observes `1,499` present and `771` removed. No source-closure
constant or disposition record was changed by this correction.

## Identity and structure truth

`scripts/identity.mjs` permits historical product/source identity only in these four evidence zones, exactly:

1. `README.md`
2. root `AGENTS.md`
3. `research/**`
4. `.omp-flow/tasks/**`

All other authored or generated production surfaces remain subject to the identity deny rules. Evidence exemptions
do not apply to product code, tests, comments, diagnostics, build metadata, or generated Web/Service output.

`scripts/check-identity.mjs` now treats every structure finding as a hard failure. There is no structure allowlist,
debt count, digest, or compatibility path; the current result is `0` findings. Thirty offending paths were renamed
to stable responsibility names and their imports, exports, configs, and tests moved with them. Old names have no
alias, wrapper, or dual export.

## Locked icon

The existing first-party OmniMind light/dark icon is the accepted and locked current identity asset. It drives the
Web and Desktop first-party surfaces; there is no deferred replacement or palette obligation in this Work.

| Asset | SHA-256                                                            |
| ----- | ------------------------------------------------------------------ |
| light | `c7f97d279356a6cf35b6eb8583b93449fd3082cb4e261c6f3fd9724fb69dd7aa` |
| dark  | `469171d55f39005f4eef1e1783105460b15c37aa0f392b5d184bcf1d4bd6e560` |

The authorized glyph corpus remains byte- and filename-exact: `1,979` line glyphs plus `2,035` fill glyphs,
`4,014` total.

## AppSnap terminology closure

AppSnap production code, native protocol code, comments, diagnostics, user-facing error copy, and tests consistently
name the executable responsibility as the bridge. The unexpected-stop and catch-all protocol codes are
`bridge-stopped` and `bridge_failed`; the former names are absent and no compatibility alias is registered. The macOS
bundle directory `Contents/Helpers` remains unchanged because it is the platform-defined packaging location, not an
AppSnap responsibility name.

## Changed responsibility groups

- Identity gates: `scripts/identity.mjs`, `scripts/check-identity.mjs`, and focused quality tests.
- Desktop: AppSnap bridge/supervisor, browser host, storage upgrade, and their imports/configs/tests.
- Service: authentication, checkpoint reference/workspace resolution, dev-server supervision, terminal supervision,
  and their imports/tests.
- Web: create-action/dialog/hook names, storage upgrade, split style/platform/identifier utilities, and consumers/tests.
- Contracts: `browserToolContract.ts` plus exports and consumers.
- This review repair changed exactly this sole handoff plus
  `apps/desktop/{scripts/build-appsnap-bridge.mjs,src/appSnapSupervisor.ts,src/appSnapSupervisor.test.ts}`,
  `apps/desktop/native/appsnap/{AppSnapProtocol.swift,ExternalTriggerListener.swift,OptionChordMonitor.swift,main.swift}`,
  and `apps/web/src/components/AppSnapCoordinator.tsx`.

## Verification

The following results are from the current working tree. Focused reruns for this review repair are recorded before
handoff delivery; earlier closure-wide gates were also rerun after the identity/structure implementation.

| Check                             | Result                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `bun run check:identity`          | PASS — `5,865` source files, `17,149` generated files, structure `0`                            |
| `bun run typecheck`               | PASS — `7/7` workspace tasks                                                                    |
| `bun run build`                   | PASS — `5/5` workspace tasks; existing `bun:sqlite` external warning only                       |
| Desktop AppSnap tests             | PASS — `1` file / `18` tests                                                                    |
| Service focused tests             | PASS — `5` files / `72` tests                                                                   |
| Web AppSnap tests                 | PASS — `3` files / `20` tests                                                                   |
| Contracts affected test           | PASS — `1` file / `1` test                                                                      |
| AppSnap Swift bridge build        | PASS — native sources compiled for current architecture and strict codesign verification passed |
| Identity/structure focused subset | PASS — `8/8` tests                                                                              |
| Glyph corpus gate                 | PASS — `4,014` glyphs                                                                           |
| Legal gate                        | PASS — `230` components                                                                         |
| Formatter check                   | PASS — `337` files                                                                              |
| Root quality                      | FAIL — source-closure only: expected `2,250/20`, observed `1,499/771`                           |

## Decisions and caveats

- Source-closure constants and disposition records were deliberately left untouched; their correction belongs to
  the separately assigned source-closure owner.
- The quality failure above is the only known unproven done condition for the wider T1 work. The bounded
  identity/structure/AppSnap correction is otherwise verified but is not independent review.
- No staged changes, commit, push, merge, release action, or external side effect is part of this handoff.

## Essential immutable evidence

| Evidence                            | Object                                     |
| ----------------------------------- | ------------------------------------------ |
| Repository checkpoint containing T0 | `2445acb987e443b44b7dc819de3de44c3d68b391` |
| Historical runnable source tree     | `630f17e61abc478114bf83c1d740977c9f68b910` |
| Fixed upstream revision             | `6aca3dcc505894481430967c2acb762b3dd1b358` |
| Selective intake checkpoint         | `be6dcad3f63fa121fbe3180f257ba1ff128696c4` |

The authoritative adoption/source evidence remains in the root `README.md`, `research/source-review.md`, and the
linked Work Concept. Earlier handoff prose is superseded by this document; Git objects retain the detailed history.
