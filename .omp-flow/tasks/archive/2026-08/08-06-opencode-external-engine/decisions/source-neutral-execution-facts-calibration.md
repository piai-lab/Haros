---
type: "Decision"
title: "Authorize source-neutral Product execution facts"
---

# Authorize source-neutral Product execution facts

## Human decision

For run `omnimind-external-engine-20260806-r1.9 / 2`, amendment r1.10 authorizes the
source-neutral `ProductExecutionFact`, `ProductExecutionSnapshot` and `ProductExecutionUpdate`
boundary already specified by the accepted Design. The former Product-edge dependency on
`NativeHostRuntimeFact` cannot represent the evidence-backed no-ACK path without fabricating an
operation reference and is replaced, not aliased.

## Binding implementation truth

- Product-facing ordering is `engineSequence` / `engine_sequence` only.
- OpenCode's first uniquely correlated fact atomically establishes observed-delivery evidence,
  Engine binding and resolved selection while applying that same fact. It never receives or
  fabricates an accepted-operation reference.
- The closed visible fact set includes the Design's minimal plan and permission request/rejection
  facts. Permission rejection states `approval-ui-unavailable`; it does not promote policy,
  enforcement, acceptance or cancellation authority.
- Pi facts and snapshots are adapted at the Service edge. Pi retains its real accepted-operation
  reference, ordering, controls, reconciliation, Package lifecycle and recovery semantics.
- Raw ACP payloads, global diagnostics, hidden reasoning, credentials/config and unrecognized
  fields remain outside Product state.

This is a bounded correction within the same Work and implementation operation. It does not reopen
QbD or authorize a generic Engine/event framework. Candidate `35c9a1a0a5c64b4bbf303a806ac6dc6ee53dc711`
is superseded and its affected evidence cannot advance.
