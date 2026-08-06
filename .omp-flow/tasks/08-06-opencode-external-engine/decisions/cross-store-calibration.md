---
type: "Decision"
title: "Calibrate Product selection persistence owners"
---

# Calibrate Product selection persistence owners

## Human decisions

The maintainer's r1.6/r1.7 calibrations closed the exhaustive Product-selection inventory and
accepted Web localStorage as an independent authority. The delta audit then proved Product and
Automation use separate SQLite files and found a Run codec contradiction. The r1.8 calibration
selects a startup-only crash-recoverable two-store coordinator and the exact
`ProductSelectedRuntime` source type. The r1.9 calibration supplies its normative preserve-not-
normalize mapping and cross-row consistency rules. These decisions repair the blocked
[implementation handoff](../handoffs/deliver-truthful-opencode-next-run.md); none authorizes a
distributed transaction, table relocation or product redesign.

## Binding boundary

- A config-first startup coordinator owns both SQLite migration windows before normal owners open.
  It performs zero-write two-file preflight, then fixed-order per-file transactions whose data and
  matching `selection-schema-v2` marker commit together. Mixed markers block runtime and resume
  deterministically; this is never described as cross-file atomicity or full rollback.
- Product Run selection is decoded as the production `ProductSelectedRuntime`. Legacy Engine ID,
  model/thinking, policy, target and non-null Package generation are preserved exactly; flat model
  fields become `product-model`. Legacy enforcement is omitted from v2 selected intent but must
  match and remain in independently resolved receipt truth when that receipt state requires it.
  Queue and Automation definition selection remain `ProductRequestedSelection`.
- Automation definition and Run permission-snapshot selections migrate without changing identity,
  schedule, enabled state, permission semantics or due-run behavior.
- Web drafts use an explicit v2 key/schema. Both inventoried selection paths migrate entirely before
  hydration by writing canonical v2, rereading/validating it, then cleaning v1. v1 is never
  overwritten and remains recoverable on failure.
- SQLite and localStorage commit independently. Web failure disables stale draft hydration/dispatch
  with recovery-required truth but cannot corrupt or hide valid Product/SQLite state.
- Product admission rejects stale/protocol-v1 selection and invokes neither Engine.
- No default/reset/fallback, permanent dual read, generic migration framework, cross-store atomicity
  claim or piecemeal owner normalization is allowed.

## Gate

One final mapping-only recheck in the existing delta lineage reviews the normative transform,
complete canonical fixture and cross-row contradiction matrix. It preserves the closed topology,
Web and Automation decisions. Execute remains paused until that recheck passes and Supervisor
issues a new CONTINUE.
