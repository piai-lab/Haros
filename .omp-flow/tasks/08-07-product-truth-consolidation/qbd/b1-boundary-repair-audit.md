---
type: "QbD 2 Audit"
title: "Direct first-public B1 boundary-repair audit"
---

# Direct first-public B1 boundary-repair QbD 2

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Audit output: `qbd/b1-boundary-repair-audit.md`
- Bounded objective: fresh scoped QbD 2 audit only of the implementation-discovered B1 boundary
  repair: verify the nine exact production/test path additions are necessary and sufficient for the
  already-approved storage-upgrade, `appshot` and retired Product-filename compatibility deletion;
  verify their narrow purposes, existence, scope-aware residue classification and non-effect on B1
  atomicity, A1-A15, destructive authority, Native Host sequencing and prior QbD decisions.
- Actor ID: `product_truth_qbd2_a3`
- Dispatch receipt: `7591261a3e7c494298fabc7c75bb9d1e`
- Predecessor receipt: `368a8b52e7624f4ea175c9b20078940d`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation/work`

## Verdict

**PASS**

- Risk: **medium — the carried B1 operation is intentionally destructive and
  implementation-sensitive, while this repair only closes exact code-ownership gaps**
- Decision-critical blocking findings: **0**
- Advisory observations: **0**

The nine added production/test paths are necessary and sufficient for the currently evidenced
boundary-external residues of the three already-approved compatibility surfaces. Every path exists,
has one narrow deletion or canonical-path purpose and is coupled to a focused check or structural
scan. The remaining matching production/test occurrences are already owned by the original B1
boundary or the previously approved OpenCode path repair. No additional required path, new
authority, changed ordering or weakened done condition was found.

This is a pre-implementation realizability audit. Existing compatibility bytes and literals in the
current tree are expected implementation inputs. Their removal and the focused green evidence remain
requirements of the B1 handoff; their expected pre-implementation presence is not a
decision-critical evidence gap.

## Decision context and evidence separation

### Confirmed evidence

1. The human calibration records a clean stop before product code changed and selects an exact Work
   boundary repair for already-approved compatibility deletion, without changing B1 meaning,
   A1-A15, the destructive scope, protocol v2, g50 or prior QbD decisions
   ([`b1-boundary-repair-calibration.md`](../decisions/b1-boundary-repair-calibration.md)).
2. All nine exact added production/test paths exist in the repository. Their current residue and
   minimum owned purpose are:

   | Path | Current boundary-external residue | Narrow B1 purpose |
   | --- | --- | --- |
   | `packages/contracts/src/ipc.ts` | `OmniMindStorageSnapshot` and `DesktopBridge.storageUpgrade` | delete only the retired shared API/type exposure |
   | `apps/desktop/src/ipcChannels.ts` | storage-migration read/ack channel constants | delete only the retired channels |
   | `apps/desktop/src/preload.ts` | `storageUpgrade` renderer bridge | delete only the preload exposure |
   | `apps/web/src/lib/composerImageSource.ts` | accepts `appshot` and normalizes it to `appsnap` | reject/remove only legacy discriminator handling while retaining current `appsnap` |
   | `apps/web/src/lib/composerImageSource.test.ts` | asserts former-discriminator migration | replace/remove only the compatibility assertion and prove current behavior |
   | `apps/web/src/components/chat/ComposerImageAttachmentChip.tsx` | legacy `appshot` rendering comment | remove only the compatibility comment; presentation behavior remains current |
   | `apps/web/src/components/chat/ComposerImageAttachmentChip.test.tsx` | legacy `appshot` fixture and rendering case | remove only that fixture/case and retain current chip proof |
   | `apps/web/src/settingsSearchIndex.ts` | `appshot` search keyword alias | remove only the retired search alias |
   | `apps/service/src/native-host/executionBoundary.test.ts` | literal `product-state-v1.sqlite` fixture path | consume the canonical Product database resolver/constant without changing test intent or Native Host production behavior |

3. A repository-wide classified scan of the storage-upgrade family found no other unowned
   production/test consumer. `apps/desktop/src/main.ts`, deletion of
   `desktopStorageUpgrade*`/`desktopUserDataProfile*`, and deletion of Web
   `storageOriginUpgrade*` were already in B1; the three new contract/channel/preload paths close the
   remaining public and renderer-facing surface.
4. A case-insensitive repository scan of `appshot` found seven production/test paths. The original
   B1 boundary already owns `composerDraftDomain.ts`, `composerDraftStore.ts` and their focused tests,
   including `composerDraftStore.attachments.test.ts`. The five new Web paths above cover every
   remaining helper, focused-test, presentation and search occurrence. The repaired done condition
   requires `appsnap` to remain the sole current discriminator and forbids comments, fixtures and
   string/search aliases, so deletion cannot be certified by removing only the runtime decoder.
5. A repository scan of the exact retired Product filename found four current production/test
   owners relevant to B1: `ProductControlPlane.ts` and the selection-coordinator test are inside the
   original boundary; `apps/service/src/opencode/liveJourneyProbe.ts` is inside the prior approved
   QbD 2 path repair; the added Native Host execution-boundary test is the only remaining
   boundary-external occurrence. Normal Native Host production composition already consumes
   `PRODUCT_DATABASE_FILENAME`, so the repair changes no Native Host production path or protocol.
6. The repaired Work explicitly distinguishes forbidden runtime compatibility from exact retired
   names under future `scripts/product-truth/**`. That directory is absent before implementation,
   as expected. Future occurrences are allowed only as closed destructive target identities or
   their matching tool fixtures/assertions, must be enumerated separately, and may not act as a
   decoder, normal-startup alias, fallback or old-row conversion path. Any unclassified occurrence
   or new outside-path need stops for map repair
   ([`direct-first-public-b1.md`](../work/direct-first-public-b1.md), Done conditions and
   Verification; [`direct-first-public-rebuild.md`](../interfaces/direct-first-public-rebuild.md),
   Apply contract and allowlist).
7. The repair changes only B1's useful link, allowed-path list, compatibility done condition and
   focused verification, plus explanatory Work-map routing. The B1 Objective, indivisible clean
   commit, later evidence commit, zero extraction surface and expected handoff are unchanged. The
   Work-map acceptance table remains A1-A15-complete and unchanged
   ([`direct-first-public-b1.md`](../work/direct-first-public-b1.md);
   [`work/index.md`](../work/index.md), Hard ordering and Acceptance coverage).
8. Destructive authority is unchanged: only positively classified retired database bundles, exact
   v1/v2 Web keys, invocation-owned locks and positively classified disposable Package stage
   children under the exact default home may be mutated. The nine added paths delete code/API/test
   compatibility or correct a test fixture; none adds an apply target, decoder, backup, restore,
   startup cleanup or broader filesystem authority
   ([`direct-first-public-baseline.md`](../decisions/direct-first-public-baseline.md), Positively
   classified destructive inputs; [`direct-first-public-rebuild.md`](../interfaces/direct-first-public-rebuild.md),
   Apply contract and allowlist).
9. Native Host ordering remains literal and unchanged: accepted B1 → accepted Native Host → accepted
   execution leaf → accepted Product State Store → Coordinator/facade C. The added Native Host path
   is a B1 test fixture correction only; the Work prohibits production behavior, protocol and test
   intent changes, and the index states that the addition creates no parallel Work
   ([`work/index.md`](../work/index.md), Hard ordering).
10. Prior QbD 2 remains carried forward. Its B1 OpenCode and Native Host client findings are closed,
    its exact ordering and Store-boundary advisories remain closed, and its medium residual risk is
    unchanged. The QbD 1 fingerprint bijection, whole-profile write trace and mechanically unsplit
    B1 evidence shapes remain hard B1 done conditions
    ([`work-map-repair-audit.md`](work-map-repair-audit.md);
    [`qbd1-pass-approval.md`](../decisions/qbd1-pass-approval.md);
    [`qbd2-pass-approval.md`](../decisions/qbd2-pass-approval.md)).

### Assumptions used

- The allowed path list is an enforceable authorization boundary, not an illustrative inventory;
  the explicit outside-path stop and required scope-aware scan are enforced by implementation and
  independent review.
- “Their focused tests” in the original Web boundary includes the existing focused test files for
  the listed composer owners. This is supported by the current `appshot` occurrence in
  `composerDraftStore.attachments.test.ts` and by the Work's requirement to remove fixtures as well
  as runtime acceptance.
- Tool fixtures/assertions that contain a retired filename represent the same closed destructive
  target identity; they do not create an additional accepted runtime identity. Any other use is
  forbidden by the repaired done condition.

### Strongest counter-evidence

- The current tree still contains all compatibility inputs, including the storage bridge,
  `appshot` acceptance and retired Product filename. That would fail a completed B1 handoff, but it
  does not invalidate this pre-implementation map: each occurrence now has an exact owner and a
  zero-residue or canonical-path proof before the immutable B1 commit.
- `composerDraftStore.attachments.test.ts` contains an `appshot` fixture but is not one of the nine
  additions. It is not a tenth gap: `composerDraftStore.ts` and its focused tests were already in the
  B1 boundary, and the fixture directly tests that owner.
- The Native Host execution-boundary test imports the current Product facade rather than a separate
  database-path module. The repaired boundary permits only replacing its retired literal with the
  canonical resolver/constant created inside the already-owned Product surface. If implementation
  instead requires a Native Host production edit, the outside-path stop applies; the current
  production composition already uses `PRODUCT_DATABASE_FILENAME`, so no such need is evidenced.
- `scripts/product-truth/**` cannot yet be scanned for final permitted literals because it is a B1
  output. This is verification intentionally assigned to implementation, not missing evidence that
  prevents judging the map: the Work gives an exhaustive permitted classification, requires every
  occurrence to be recorded and rejects unclassified uses.

### Accepted risk

The carried accepted risk remains the intentional, unrecoverable loss of positively classified
pre-baseline Product, Automation/service and exact legacy Web-draft bytes under canonical default
`~/.omnimind`. Protected facts and every excluded target remain outside that authorization and fail
closed. Residual implementation risk remains medium: exact path/reparse and WAL classification,
profile/process races, incidental writes, interruption points, first-public transaction boundaries,
scope-aware scan accuracy and current behavior preservation still require the B1 evidence. The nine
path additions neither broaden nor mitigate that accepted destructive risk.

## Prior finding closure

### Prior QbD 2 B1 — immutable B1 excluded the OpenCode Product-database consumer

**Remains closed.** The OpenCode production probe remains explicitly owned by B1 for the canonical
Product-path correction and focused proof. This repair adds only the separately discovered Native
Host test fixture occurrence.

### Prior QbD 2 B2 — Native Host Work omitted or misnamed required v2 production clients

**Remains closed.** The Native Host Work's production client ownership is unchanged. The new B1 path
is a test-only canonical Product-database correction and expressly cannot modify Native Host
production behavior or protocol.

### Prior advisories — literal ordering and exact Store composition/probe boundaries

**Remain closed.** The accepted-handoff sequence and later Work boundaries are unchanged. The B1
repair creates no concurrent Work, extraction scaffold, second database authority or later-Work
path ownership.

## Decision-critical findings

None.

## Advisory observations and residual risk

No new advisory is required for this scoped repair. Implementation and review must enforce the
written stop: a tenth required path, an unclassified retired literal, any retained runtime/API/test
compatibility, changed Native Host semantics, changed B1 instrument/SHA rules or destructive-target
expansion rejects the B1 handoff rather than silently enlarging authority.

The absence of implementation evidence before implementation is not a blocker. Residual risk stays
medium until the immutable B1 commit and its required classified scans, focused tests, destructive
guards and isolated-process proofs exist.

## Exact next human decision

This model `PASS` authorizes no transition by itself. The maintainer must link one of these
calibrations:

1. **Accept PASS and restart B1 from the clean checkpoint:** authorize only the repaired B1 boundary
   and retain the existing accepted-handoff sequence and all implementation/review stops.
2. **Request bounded tightening before restart:** change only a named path purpose, classified-scan
   rule or verification condition while preserving the approved PRD, destructive authority and
   prior QbD decisions.
3. **Defer or stop** this checkpoint.

There is no unresolved `FAIL` or decision-critical `NEEDS_EVIDENCE`. The original scope must not be
broadened beyond the exact repaired boundary without a new human decision.
