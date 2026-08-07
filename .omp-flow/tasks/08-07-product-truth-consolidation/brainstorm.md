---
type: "Brainstorm"
title: "Brainstorm: Consolidate Product truth before Remote"
---

# Brainstorm: Consolidate Product truth before Remote

The observable problem is not merely that `ProductControlPlane` is large. OmniMind has no public
release or external compatibility obligation, yet the current production path contains development-
era schema migration and cross-store recovery machinery that would become permanent authority if
the first public baseline were not chosen deliberately.

The first-principles anchor is now: discard the explicitly authorized pre-baseline development state
under the canonical default home, replace all unshipped compatibility with one first-public schema,
then split the Product control plane along stable responsibilities. The principal contradiction is
no longer old-data recoverability versus simplicity; the maintainer deliberately resolves it in
favor of a clean public baseline. The remaining safety problem is target precision: deletion must
never escape the validated default home or consume credentials, Package/Engine state, attachments,
external resources, user workspaces, Git or global configuration.

The irreducible outcome is a directly rebuilt first-public generation where startup recognizes only
the intended canonical schemas, removed compatibility has no runtime caller,
`ProductControlPlane` delegates to smaller stable owners without a second state machine, and both
production line count and dependency/concept complexity materially decrease. An imprecise target,
active owner, unexpected path/type/link, discovery of a real public consumer, or duplicated
transaction authority stops construction.

The strongest counter-hypothesis is that the migration layer already represents necessary durable
recovery and the monolith is an honest transaction boundary; deleting or splitting it would merely
move complexity and weaken atomicity. The linked research questions must actively try to prove that
counter-case before any design is selected.

The maintainer has already authorized rapid autonomous continuation toward the project goal. No
additional product-value choice is currently required; repository evidence will determine whether
the anchor is confirmed, revised, or rejected.

Research found that the observed default development stores are older than the current legacy
coordinator can decode and found no public OmniMind pre-baseline consumer. The maintainer then made
an explicit destructive calibration that supersedes the research recommendation to back up those
bytes: the complete root set is the default `~/.omnimind` only, all pre-baseline/old development data
there may be deleted, and no backup, migration, restore or long-term compatibility is required.

The strongest counter-case is irreversible loss of old local Product/Automation/draft history and
the impossibility of recovering it after deletion. The maintainer explicitly accepts that
consequence to avoid shipping false compatibility and requested direct execution. This acceptance
does not authorize broad home deletion. No recursive discovery or override root is allowed; the
implementation must positively classify only known legacy state and rebuild new stores separately.

Research also rejects object/table/Engine repository splits: compound Product transactions remain
under one State Store authority, while Engine effects and volatile handles move to one Coordinator
behind a thin facade.

The maintainer additionally fixes Package-root authority: Product Service Package lifecycle is the
only owner. The `dev` lane resolves `~/.omnimind/dev/packages`; the packaged lane resolves
`~/.omnimind/userdata/packages`. Service passes the current lane's canonical Package root explicitly
to Native Host, which may validate and load but may neither hard-code nor independently select
`userdata/packages/stage`. Exact duplicate or obsolete legacy Package state under the default home
may be deleted and rebuilt under this rule; no dual-root compatibility remains.

- [Development store and backup surface](research/development-store-surface.md)
- [Unshipped compatibility inventory](research/unshipped-compatibility.md)
- [Product control-plane responsibility map](research/product-control-plane-map.md)
- [Selected synthesis](research/synthesis.md)
