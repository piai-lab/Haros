---
type: "QbD 1 Audit"
title: "Direct first-public Product truth — repair audit"
---

# Direct first-public Product truth — repaired QbD 1

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`design.md`](../design.md)
- Audit output: `qbd/design-repair-audit.md`
- Bounded objective: fresh independent challenge of the repaired protected-fact deletion guard,
  Native Host v2 Package-root binding, read-only inspection boundary and frozen B0/B1/C reduction
  gate, carrying forward the accepted destructive scope and closed g50 observation.
- Actor ID: `product_truth_qbd1_a2`
- Dispatch receipt: `fcba6d607f004862adb1175fbfbf5356`
- Predecessor receipt: `5f0b29d88aef42a79ebb86d794520fb1`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation`

## Verdict

**PASS**

- Risk: **medium — implementation-sensitive and intentionally destructive, with fail-closed design
  boundaries**
- Decision-critical blocking findings: **0**
- Advisory observations: **3**

The repaired Design closes both decision-critical findings from the first audit. Whole-file
deletion now requires an exact fixture identity followed by a closed protected-fact absence proof;
the Native Host binding is now a Host-challenged, bidirectionally authenticated v2 transcript with
pre-read state-machine gates. `inspect` has no source or lock mutation authority, and the complexity
claim is tied to one fixed measurement universe plus an immutable implementation-produced B1 stop.
No unresolved authorization, data-loss, replay or unrealizable-core-path consequence remains in the
current design scope.

## Decision context and evidence separation

### Confirmed evidence

1. The maintainer selected repair option 1 without broadening destructive authority. Credentials,
   current first-public state, current canonical Package generation and lease/LKG facts, Pi-private
   state, attachment files and protected metadata, external targets, user workspaces, Git, global
   configuration, other homes and unknown paths remain excluded
   ([`qbd1-repair-calibration.md`](../decisions/qbd1-repair-calibration.md), Human decision and
   Required repair).
2. A retired database is not deletable from filename, marker or approximate shape. Exact normalized
   DDL fingerprint and fixture identity select the only permitted protected-fact registry entry;
   unknown identity stops before a protected query
   ([`direct-first-public-baseline.md`](../decisions/direct-first-public-baseline.md), Positively
   classified destructive inputs; [`design.md`](../design.md), Database classifier).
3. Every Product fixture validates Run/receipt/outbox identity, exact receipt decoding, Package
   generation and Package-activity closure. Nonterminal Package Runs, including Product-v2 `sent`,
   are active; `delivery_unknown` and `outcome_unknown` are independently blocking. Every service
   fixture counts attachment/cleanup metadata, pairing credentials, auth-session identity and
   global configuration. Missing tables, undecodable values, cardinality/state contradictions or
   nonzero protected counts block the entire apply
   ([`direct-first-public-rebuild.md`](../interfaces/direct-first-public-rebuild.md), Protected-fact
   preflight).
4. The protected reader operates only after exact fixture selection, on the ephemeral copy, and may
   expose only aggregate count/presence plus a bounded code. The protected-class codes are
   single-purpose; unknown database identity remains `DATABASE_FINGERPRINT_UNKNOWN`, while the two
   generic guard codes describe only decode or closure failure and cannot authorize deletion. Query
   spies reject undeclared tables/columns and outputs reject row values, identifiers, JSON,
   generations, credentials and paths
   ([`prd.md`](../prd.md), R2; [`direct-first-public-rebuild.md`](../interfaces/direct-first-public-rebuild.md),
   Protected-fact preflight).
5. Native Host v2 uses a single length-prefixed transcript containing domain, protocol version,
   direction, Service instance, Host instance, a fresh socket-bound Host challenge, lane and the
   exact canonical root. Service and Host proofs use opposite directions over the same binding, and
   Service verifies every Host echo and proof before sending a request
   ([`package-root-handoff.md`](../interfaces/package-root-handoff.md), Canonical bidirectional
   transcript).
6. The Host issues the first challenge, consumes it on the first syntactically valid hello, rejects
   closed-shape/version/proof/lane/root faults, and atomically installs one immutable process binding.
   Fresh per-connection challenges remove the need for replay history; concurrent different-pair
   bindings lose the compare-and-set, same-pair connections do not install a second binding, and
   coalesced request bytes remain buffered until binding succeeds
   ([`package-root-handoff.md`](../interfaces/package-root-handoff.md), Authenticated handoff and
   Failure behavior; [`design.md`](../design.md), Package-root flow).
7. Desktop contributes only canonical product home, secret and launch-lane assertion; Service alone
   selects the root. Host defers Package/catalog access, validates the binding against Desktop's lane
   and the canonical lane child, accepts only direct stage children, and has no v1, sibling-root or
   discovery fallback ([`design.md`](../design.md), Package-root flow and Fault matrix).
8. `inspect` observes lifecycle/profile locks without creating, acquiring, reaping, renaming or
   removing them and writes only removable private scratch outside source/profile roots. `apply`
   alone mutates locks, acquires them in a fixed order, repeats the complete inspection from fresh
   bytes while holding them, and reaches destructive writes only after acquisition/reap/helper and
   scratch-cleanup success
   ([`direct-first-public-rebuild.md`](../interfaces/direct-first-public-rebuild.md), Operator surface,
   Inspection contract and Apply exclusivity).
9. `product-truth-complexity-v1` fixes extensions, roots, exact additional files, exclusions, import
   closure and semantic counters for B0, B1 and C. B0 is immutable; B1 must be a dedicated clean,
   green, compatibility-deleted but unsplit commit whose full SHA and clean metric output are
   checked in before any split assignment; C is the later frozen candidate. The split gate is
   conjunctive and cannot substitute B0, a branch, dirty tree or reconstructed patch for B1
   ([`design.md`](../design.md), Complexity measurement and gates).
10. The earlier Pi single-chat/gateway concern is closed by the recorded same-SHA g50 literal
    Pi/OpenCode gateway evidence and observed sibling counters. No new contradictory evidence is
    linked by this repair, so it is correctly outside this audit
    ([`qbd1-repair-calibration.md`](../decisions/qbd1-repair-calibration.md), Closed observation).

### Assumptions used

- The checked-in fixture registry will enumerate every fingerprint already fixed by the baseline
  decision; an absent registry entry is a blocker, not an implementation choice.
- “User workspace” and “external ResourceRef target” mean the external authorities and bytes the
  Product references. Product-owned pre-baseline Workspace/ResourceRef history is within the
  accepted Product-history loss, and the tool never follows those references. This matches Product
  State's authority distinction and the repaired Design's explicit treatment.
- The v1 measurement script evaluates immutable Git trees with the frozen script/config even though
  that script did not exist at B0. The later tool revision is the measurement instrument, not an
  assertion that its bytes were present in the B0 tree.

### Strongest counter-evidence

- Whole-file deletion still destroys all authorized Product/Automation history in a matched file.
  That consequence is real and irreversible, but the repair no longer treats file identity as proof
  that protected co-resident facts are absent: the separate fixture-selected preflight must establish
  that absence or stop.
- The Host keeps an immutable process-global binding while the current client opens authenticated
  connections per request. That creates many short-lived challenges, but it does not require a
  replay cache: challenge state is socket-local, discarded on close, and the verification plan
  explicitly measures return to zero at sustained current request rate. Live socket resource limits
  remain an implementation concern, not replay authorization state.
- Physical LOC and import metrics can never alone prove good architecture. Here they are not alone:
  B1 prevents compatibility deletion from hiding split overhead, the exact path/import universe is
  candidate-independent, and zero-writer/one-connection/no-cycle/API/table/state-machine gates plus
  transaction and process tests constrain semantic gaming.
- A profile helper or SQLite inspection implementation could accidentally write outside the declared
  allowlist. The Design does not accept that behavior: source/exclusion hashes and write spies make
  it a failed candidate, while `inspect` lacks helper/lock mutation authority altogether.

### Accepted risk

The maintainer continues to accept irreversible loss of positively classified pre-baseline
Product, Automation/service and exact legacy Web-draft bytes under canonical default
`~/.omnimind`, with no backup, conversion, restore or retained reader. The authorization does not
extend to protected facts or excluded targets; the repaired guard stops rather than treating
uncertainty as acceptance.

## Decision-critical findings

None.

### Closure of prior B1 — protected co-resident facts

**Closed.** Exact file identity is now necessary but insufficient. A fixture-specific aggregate
preflight proves protected-class absence and full Run/receipt/outbox/activity closure before any
whole-file deletion. Unknown identity, incomplete fixture coverage, decode/cardinality/state
contradiction, active Package lease, uncertain Run, attachment metadata, credential, auth identity
or global configuration all yield zero deletion. This directly repairs the earlier cause and removes
its unauthorized-loss consequence.

### Closure of prior B2 — authenticated Package binding

**Closed.** The binding is no longer mutable data beside a peer proof. Both directions authenticate
one canonical transcript that includes version, both process instances, a fresh Host-first
single-use challenge and the canonical lane/root. Exact parsing, Host commitment, Desktop lane
validation, atomic first-binding installation and the pre-dispatch socket state machine reject old,
missing, duplicate, tampered, replayed, second-different, concurrent-different and mismatched
bindings before catalog or Package access. Socket-local challenge disposal avoids unbounded replay
history, and buffered coalesced frames close the prior request race.

## Advisory observations and residual risk

1. The implementation handoff should show the fingerprint-to-registry inventory as an exact
   bijection, not merely green positive fixtures. This is already required by the unknown-registry
   blocker and query-spy plan; the observation highlights the evidence shape and does not add a new
   design condition.
2. The apply profile-helper proof should retain a whole-profile write trace in addition to hashes of
   named exclusions, because merely opening a browser profile can create incidental state. Any such
   write outside invocation-owned locks and the exact legacy keys must fail the candidate under the
   existing allowlist contract.
3. The B1 handoff should make the “unsplit” assertion mechanically visible by reporting zero
   production Store/Coordinator extraction symbols/files at B1 and should bind the evidence-recording
   commit separately from the immutable B1 SHA. Padding or pre-extraction at B1 would violate the
   existing gate, not create a valid easier baseline.

Residual implementation risk remains material because deletion is unrecoverable and the handshake
loads executable Package code. The planned generated-home kill matrix, exact fixture/query spies,
real concurrent process tests, challenge-state counter, write traces and immutable B0/B1/C artifacts
are therefore required before implementation acceptance. Their failure is fail-closed and does not
invalidate the realizability of the design.

## Exact next human decision

This model `PASS` does not itself authorize transition. The linked human calibration already states
the conditional direction; the maintainer must record which of these options applies:

1. **Accept PASS and activate the recorded option-1 transition:** proceed to decomposition, with
   direct-first-public/B1, Package transcript/root, and later responsibility-split ordering preserved.
2. **Request advisory tightening before decomposition:** incorporate one or more observations above
   without changing the accepted destructive boundary or reopening the closed g50 direction.
3. **Defer or stop** this checkpoint.

There is no unresolved FAIL or decision-critical `NEEDS_EVIDENCE` requiring repair, removal/safe
degradation or scope deferral.
