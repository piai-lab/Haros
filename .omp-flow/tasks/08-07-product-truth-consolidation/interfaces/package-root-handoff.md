---
type: "Interface"
title: "Product Service to Native Host Package-root handoff"
---

# Product Service to Native Host Package-root handoff

## Ownership

Product Service Package lifecycle is the sole selector and writer of Package root, stage,
source/trust/current/LKG/quarantine and lease state. Native Host owns native validation/loading and
Package-private runtime state only. Desktop supervises both processes and carries rendezvous secrets;
it does not select or rewrite a Package root.

## Root resolution

Service uses one pure resolver over the already canonical default product home:

```text
lane = dev       -> ~/.omnimind/dev/packages
lane = packaged  -> ~/.omnimind/userdata/packages
```

The result must be absolute, below the canonical home, have a real non-linked lane/package ancestry,
and end in the literal `packages`. A renderer, Run, Engine, environment override or artifact cannot
supply it. Canary and any third lane are outside this checkpoint.

## Authenticated handoff

The closed Native Host protocol version becomes `2`; version `1` is rejected and has no reader,
alias or fallback. `NativeHostClientHello` gains a closed package binding:

```text
packageBinding: {
  lane: "dev" | "packaged"
  root: string
}
```

Desktop supplies Native Host a lane-scoped rendezvous assertion (`dev` or `packaged`) from the same
launch mode used to supervise Product Service, alongside the canonical product home and rendezvous
secret. This assertion does not contain or select a Package root. Service remains the sole root
selector.

Service sends the resolved binding on the authenticated hello before catalog, validation or
execution requests. Both peers independently canonicalize the root and must obtain the same
platform-native absolute string before constructing a proof. The wire parser rejects duplicate JSON
object keys before ordinary JSON decoding, then requires the exact v2 key set and closed lane enum;
old, missing, extra, duplicated or wrong-typed fields are rejected before HMAC verification.

### Canonical bidirectional transcript

Both directions use exactly one `nativeHostBindingTranscriptV2` encoder. It UTF-8 encodes each field
and prefixes it with an unsigned 32-bit big-endian byte length; concatenating the fields below is the
complete HMAC input, with no JSON serialization, path normalization inside the encoder or optional
field omission:

```text
domain              = "omnimind.native-host.package-binding"
protocolVersion     = "2"
direction           = "service" | "host"
serviceInstanceId
hostInstanceId
hostChallenge       = fresh 32-byte base64url challenge for this connection
lane                = "dev" | "packaged"
packageRoot         = exact canonical absolute root
```

On every new socket the Host sends an exact-field `host.binding-challenge` containing protocol
version, Host instance and a cryptographically fresh 32-byte base64url `hostChallenge`. The Host
stores that challenge only in the connection state `awaiting-service-proof`; it is never accepted on
another socket. Service then sends its instance, exact echoed Host fields, binding and
`HMAC-SHA-256(rendezvousSecret, transcript(direction="service", ...))`.

The Host consumes the connection challenge on the first syntactically valid client hello, whether
proof succeeds or fails. It validates launch-lane equality, exact literal root, canonical ancestry
and link/reparse exclusion, constant-time verifies the proof, then atomically compare-and-sets the
process-global lane/root binding. No replay history is needed: an old hello is bound to a challenge
that is neither current nor valid on a new connection, including after Desktop/Host restart even
when the rendezvous secret and Host instance ID are reused. Random challenge collision is treated as
a cryptographic failure bound, not handled by an evicting cache.

`NativeHostServerHello` echoes the exact accepted `packageBinding`, Service instance, Host instance
and Host challenge. Its proof is
`HMAC-SHA-256(rendezvousSecret, transcript(direction="host", ...))`, so the Host proof commits to the
same accepted lane/root. Service requires every echo to equal its sent values and verifies the host
proof in constant time before marking the connection ready.

The binding is process-global and immutable until Host restart, but authenticated connections are
per request in the current client and may coexist when they prove the same lane/root. Concurrent
first hellos use one compare-and-set: exactly one proposed pair wins; a same-pair contender may
complete after observing the installed value, while every different-pair contender is closed before
catalog or Package access. The socket state machine is `awaiting-service-proof -> bound -> one
request`; request frames received, decoded or coalesced in the same read before asynchronous proof,
canonical-path and binding checks finish remain buffered and cannot dispatch. Failure closes the
socket and discards them. A second different binding remains rejected until Host restart.

The bounded handshake errors are `NATIVE_HOST_PROTOCOL_UNSUPPORTED`,
`NATIVE_HOST_HANDSHAKE_INVALID`, `NATIVE_HOST_PROOF_INVALID`, `PACKAGE_ROOT_MISMATCH` and
`PACKAGE_BINDING_ALREADY_ESTABLISHED`. A replay on a fresh connection is intentionally
indistinguishable from another invalid proof. Errors expose no secret or full home path.

Validation and execution accept an artifact only when:

- `stagePath` is a direct child of `<bound-root>/stage`;
- the child basename equals the exact generation;
- manifest, executable and license evidence pass existing digest/type/link checks;
- the Product Run's frozen generation equals the validated generation.

Native Host must not call `join(productHome, "userdata", "packages")`, inspect `state.json`, list a
sibling root, rewrite `stagePath`, or fall back to another generation/root. Service continues to send
the exact artifact and owns all lifecycle transitions.

## Failure behavior and verification

| Fault | Required result |
| --- | --- |
| v1 or missing/extra/duplicate v2 field | parser rejects before proof or catalog/Package read |
| lane/root/protocol/Service/Host/challenge bit changed after proof | Host rejects proof; no binding installed |
| Host echo/binding/proof changed | Service rejects readiness and sends no request |
| old client hello is replayed on a new/restarted connection | fresh Host challenge makes proof invalid; no binding/request |
| dev Service sends userdata root | handshake rejected before catalog/Package read |
| packaged Service sends dev root | handshake rejected before catalog/Package read |
| Service lane differs from Desktop launch lane | handshake rejected before catalog/Package read |
| valid root contains linked ancestry | handshake rejected |
| second different binding while Host lives | connection rejected; original binding unchanged |
| concurrent first bindings | one pair wins atomically; same-pair connection may proceed, different-pair loses before access |
| hello and request are coalesced while binding awaits async checks | request remains undispatched until bound, or is discarded on failure |
| artifact is outside bound `stage` or is a nested child | validation rejected |
| Host restarts | a new authenticated binding is required; no remembered or discovered root |
| Service restarts with same lane/root | new connection binds the same canonical root |
| package missing from bound root but present in sibling lane | selected Engine unavailable; sibling remains unread |

Static verification requires one transcript encoder, protocol version `2`, exact-field/duplicate-key
rejection, zero v1 compatibility branch, zero production occurrence of the current Native Host
hard-coded `userdata/packages/stage` derivation and zero Package lifecycle writes in Native Host.
Unit vectors cover byte-exact transcript encoding. Real multi-process dev and packaged tests cover
tamper, replay across connection and Host restart, old/missing/duplicate fields, Host-proof
commitment, second binding, concurrent first binding, hello+request coalescing, lane/root mismatch
and sibling no-fallback while observing no catalog/Package read before ready and never logging the
user's full home path. A sustained health-monitor test covers the current per-request handshake rate
and proves retained challenge state returns to zero after connections close.

## Provenance

This contract implements the maintainer-calibrated authority in the
[selected synthesis](../research/synthesis.md) and closes the mismatch found by the
[development-store research](../research/development-store-surface.md). It is consumed by the
[PRD](../prd.md) and [Design](../design.md), and incorporates the binding repair selected in the
[QbD 1 repair calibration](../decisions/qbd1-repair-calibration.md).
