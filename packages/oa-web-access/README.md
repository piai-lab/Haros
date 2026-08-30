# @harnessos/oa-web-access

Private workspace component for OA web access. It is composed explicitly when an OA Session starts
and is not registered in other Engines.

This package owns search and fetch routing, bounded result storage, source projection, and its
credential-blind settings contract. Haros owns the Timeline presentation and Session lifecycle;
HostGateway remains the authority for local system capabilities.

The package does not expose an npm release, install command, global state root, or ambient runtime
registration. It never reads or synchronizes another Engine's private state.

Exact source, revision, rights, retained legal text, local differences, and the update/delete
boundary are recorded once in [`source-adoptions.json`](../../source-adoptions.json).
