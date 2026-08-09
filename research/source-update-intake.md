# Source update intake

> Nature: durable review protocol and taste calibration for maintainer-initiated updates from adopted
> sources. It does not own Product doctrine, architecture, implementation status or adoption truth.
> Actual production adoption remains in the root `README.md` machine block.

## 1. Purpose

OmniMind deliberately learns from exceptional external work. Synara in particular is a high-signal,
technically sophisticated partner source whose contributors repeatedly demonstrate strong product,
interaction and engineering judgment. A difference from current OmniMind architecture is therefore
not evidence that an upstream change is naïve, irrelevant or wrong.

The objective of an update review is not to defend the current codebase. It is to understand the
upstream problem and solution deeply, preserve the strongest idea available, and decide with the
maintainer how that idea should enter OmniMind. Code incompatibility may require semantic
translation; it does not erase the upstream insight.

OmniMind and an adopted source are different products. Review therefore separates three layers:

1. the source code form and local architecture;
2. the mechanism, invariant and failure model carried by that code; and
3. the author's underlying product judgment, interaction taste and intended user outcome.

The first layer may be incompatible while the second or third is excellent. In that case the Agent
must look for an OmniMind-native expression of the same insight instead of either copying the code
literally or dismissing the change. A different implementation counts as absorption only when it
names the preserved intent and proves the equivalent user or engineering guarantee; resemblance in
UI, terminology or happy-path output is not enough.

## 2. Trigger and authority

Source update review is **maintainer initiated only**. Do not schedule it, poll for it, create a
recurring monitor, automatically fetch and compare revisions, open an update PR or modify OmniMind
merely because a newer upstream revision exists.

When the maintainer asks to review, compare, borrow from, update from or absorb Synara or another
adopted source, the active Agent must read, in order:

1. the root `README.md` source-adoption entry;
2. this file;
3. `research/source-review.md` and any source evidence relevant to the changed domains;
4. the architecture owner for every affected OmniMind responsibility; and
5. the current execution/Campaign state only to avoid colliding with active work.

Historical chat memory is not required. This routing and this document carry the durable intent.

Every update has two separate gates:

### Gate A — read-only review and discussion

The maintainer's request authorizes evidence gathering, not product mutation. During this gate:

- resolve the exact adopted revision and exact candidate revision or release;
- verify that the candidate is a descendant of the previous reviewed revision before using an
  incremental range. A moved tag, rewritten history, repository transfer or non-descendant
  candidate must be reported with its merge base and missing/replaced commits; it must not be
  flattened into an apparently empty or ordinary `old..new` review;
- inspect complete commits, surrounding implementation, tests, release notes, dependency changes,
  rights and visible behavior as applicable, including removals, reversions and changed defaults;
- explicitly identify changes to lockfiles, install/build/release scripts, Electron preload or IPC,
  native modules, network egress or telemetry, credentials/auth/permissions, filesystem or process
  containment, persisted schema/migrations/rollback and third-party assets or legal text. These are
  risk escalators, not automatic rejection;
- use a disposable clone or other isolated evidence location when remote discovery is needed;
- do not merge, cherry-pick, patch, reformat or otherwise change the OmniMind worktree;
- do not write a speculative compatibility layer, parallel manifest or update ledger; and
- discuss the findings and proposed intake set with the maintainer.

The Agent must stop after presenting the decision surface. No historical authorization, general
permission to refactor, or enthusiasm for the upstream source substitutes for approval of the
current intake set.

### Gate B — explicit implementation approval

Implementation begins only after the maintainer unambiguously approves the presented update set in
the active discussion, for example “按这个来”, “行，没问题” or an equally clear scoped decision.
Approval authorizes the accepted scope, including substantial refactoring when that is the cleanest
way to preserve the upstream value under OmniMind's current owners. It does not authorize unrelated
changes, silent expansion to other upstream commits or bypassing release/legal obligations.

If the proposal materially changes after approval, return to discussion for the changed portion.

## 3. Taste and burden of proof

Begin with a presumption of competence and value. Synara changes are not generic donor patches to be
filtered defensively; they are expert work to be understood charitably and critically.

For every material upstream change:

1. identify the user or engineering problem it solves;
2. reconstruct the design intent, invariants and interaction taste behind the patch;
3. read its tests and important surrounding code, not only the diff title or changed lines;
4. state the strongest case for adopting it and what OmniMind would lose by ignoring it;
5. distinguish direct code portability from conceptual value;
6. compare it with the current OmniMind owner and real implementation evidence; and
7. preserve the upstream idea, regression case or falsifier even when the exact code cannot enter.

“Different architecture”, “uses the old Provider layer”, “large diff”, “we already changed this
file” and “hard to merge” are not sufficient reasons to dismiss a change. They establish translation
cost, not lack of merit.

Conversely, respect for the source is not permission to transplant a mechanism whose assumptions do
not hold in OmniMind. Before recommending any direct or semantic adoption, identify which source
assumptions remain true, which product differences require another form, and which evidence would
show that the translated result still carries the author's intended value. When that cannot yet be
shown, defer with a concrete trigger instead of guessing or flattening the idea into a superficial
analogy.

Ignoring or dismissing an upstream insight without understanding it carries the highest burden of
proof. Incorporating code or creating an OmniMind-native implementation remains a separate,
conservative production decision. It must show a material user or engineering benefit, fit the
current owner and product priority, identify ongoing ownership and divergence cost, and have a
proportionate executable proof budget. Understanding and retaining an insight does not create an
implementation obligation.

A recommendation to decline code must still name the exact source revision, explain the conflict,
counterexample or unfavorable cost, identify the retained insight, and define any evidence that
would reopen the decision. Prefer **defer with a trigger** or **decline code while retaining the
insight** over an absolute rejection when uncertainty remains, but do not manufacture a Work merely
to avoid saying no.

The maintainer makes the final product and taste decision. The Agent should disagree honestly when
evidence warrants it, but never use architectural vocabulary as a shortcut around understanding
excellent upstream work.

## 4. Review method

Treat release notes, stars and commit subjects as discovery signals only. Review the exact range
from the adopted revision to the candidate revision and group it by stable responsibility rather
than file count.

When a range is too large to understand at commit, mechanism and interaction levels in one bounded
review, freeze and discuss coherent release/responsibility slices. Do not replace source reading
with a shallow repository-wide table. A later slice remains unreviewed; it is not implicitly
declined, deferred or approved.

For each coherent change, choose one provisional disposition:

- **Adopt directly** — the mechanism and authority still match; preserve source provenance and
  verify it in the current product.
- **Translate semantically** — preserve the problem, invariant, interaction and tests while
  implementing them through OmniMind's current Product, Host, system or UI owner.
- **Already covered** — current OmniMind evidence proves an equivalent or stronger behavior; show
  that proof rather than assuming equivalence from similar names.
- **Defer with trigger** — the idea is valuable but lacks a current prerequisite; state the exact
  trigger that reopens it.
- **Decline code, retain insight** — exact code would cause demonstrated harm, but the review keeps
  its problem statement, tests or design lesson available for the relevant owner.

These are review dispositions, not Product enums or permanent public ontology.

The discussion should use one compact table:

| Upstream change | Problem and strongest insight | Current OmniMind owner/evidence | Proposed disposition | Cost or risk | Required proof | Maintainer decision |
| --------------- | ----------------------------- | ------------------------------- | -------------------- | ------------ | -------------- | ------------------- |

The Agent must surface interactions between commits. Do not independently accept two patches whose
combined state restores a competing Runtime, duplicates a writer or silently changes an already
accepted interaction contract.

Upstream removal or reversion of a previously reviewed mechanism is first-class evidence. Compare
it with current OmniMind behavior and the reason for the reversal; do not preserve or delete the
OmniMind mechanism merely to follow upstream chronology.

## 5. Implementation after approval

OmniMind is a semantic descendant, not a branch that blindly tracks upstream text. Whole-repository
merge/rebase is not the default intake mechanism. Use the smallest coherent method that preserves
the accepted value:

- direct port for genuinely owner-compatible mechanisms;
- test-first semantic port when state, process or authority boundaries differ;
- a clean responsibility-level replacement when piecemeal patching would leave two models; or
- deliberate no-code retention when the approved outcome is evidence only.

Translate upstream tests before or with implementation. A donor Turn test may become a Product Run
or Entry identity test; a Provider capability test may become a Native Host catalog/receipt test;
the observable guarantee should survive even when the nouns change.

Do not inject an update into an unrelated dirty candidate or active Work merely because files
overlap. Either wait for a coherent boundary or obtain explicit maintainer approval to expand that
Work. Preserve user changes and do not use update intake to reintroduce deleted donor identity,
Session, orchestration, Provider or Package authority.

The accepted implementation must, in the same atomic change where applicable:

- retain exact upstream URL/revision and any useful patch identity;
- update the existing root source-adoption disclosure rather than create a parallel manifest. A
  selective intake must identify exact upstream commit and source paths, affected OmniMind target
  paths, adoption mode, evidence and rights without implying that the complete upstream release or
  commit was transplanted;
- satisfy license, attribution, notice and redistribution obligations;
- run focused normal/failure/recovery tests plus visual, accessibility or performance proof when
  the observable requires them;
- run the negative authority/identity scans affected by the port; and
- receive independent review proportional to the actual risk.

An intake that touches a risk escalator named in Gate A must add the corresponding security,
privacy, migration/rollback, containment or release proof. Generic typecheck and happy-path UI
evidence cannot close those risks.

Large refactoring is acceptable after approval when it produces the clearest durable implementation.
Timid wrappers, permanent compatibility facades and duplicated state are not forms of respect for
upstream work.

## 6. Current observation and re-entry

Three revisions have different roles and must not be collapsed:

- production-adopted physical baseline: Synara `6aca3dcc505894481430967c2acb762b3dd1b358`, until actual source bytes and the root adoption record change;
- historical reviewed candidate: Synara `v0.6.7`, `be6dcad3f63fa121fbe3180f257ba1ff128696c4`; its accepted/deferred rows remain historical evidence in [`source-review.md` §8](source-review.md#8-maintainer-initiated-synara-v067-intake);
- current maintainer-approved responsibility comparison input: Synara `02c8a6cb9948eba0afc828492764e7236965c61f`, used by the active execution brief to decide Restore source / Keep narrow difference / Delete duplicate. It is not production adoption until implementation and legal/provenance closure update the sole root record.

The maintainer approved two implementation Works: active Workbench mechanism hardening followed by
Product completion-signal alignment. Approval does not mean the full upstream range was adopted;
all other rows remain explicitly deferred, already covered or code-declined with their insight
retained. The root production adoption record changes only for actual reviewed implementation and
legal closure.

The active `02c8a6c…` responsibility reset is already an approved implementation scope; do not route it back through this protocol merely because its production adoption record has not yet changed. A later maintainer-initiated source update must first read the then-current root adoption record and active execution baseline, resolve the requested candidate, and verify ancestry from the exact comparison/review point named there. It must not default to `be6dcad3`, automatically poll beyond `02c8a6c…`, or infer that unimplemented source bytes are already adopted. If a later source change materially alters an approved but unfinished responsibility, return only that changed portion to Gate A.
