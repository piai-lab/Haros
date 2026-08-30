# Source Intake

`source-adoptions.json` is the sole machine-readable record for source retained from outside this
repository. It owns the exact origin, revision, rights, adopted paths, artifact digests, local
differences, and update policy for every adopted source.

## Admission requirements

An adoption or update is complete only when it records and verifies:

1. an immutable source revision or artifact identity;
2. redistribution rights and every required legal text;
3. the exact source and shipped paths;
4. deterministic artifact and patch digests where generated or patched bytes are involved;
5. the narrow behavioral seam owned by Haros;
6. retained upstream tests plus focused Haros lifecycle tests;
7. registration and state boundaries, including proof that source presence does not create ambient
   runtime activation; and
8. a practical update, replacement, and deletion boundary.

Source code, shipped bytes, runtime registration, and product presentation are separate claims.
Evidence for one does not establish the others.

## Update rule

Updates are maintainer-triggered and pinned. Review the exact candidate before changing production
bytes. Prefer removing a local patch when the adopted source exposes an equivalent stable seam.
Stop when an update would require a second product store, registry, authority, compatibility path,
or ambient lifecycle.

Third-party identities belong in the adoption record, required legal files, functional selectors,
and diagnostics only. They do not become Haros product identity or normal repository narrative.
