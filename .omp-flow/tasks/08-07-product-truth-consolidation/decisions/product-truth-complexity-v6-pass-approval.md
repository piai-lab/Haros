---
type: "Decision"
title: "Approve the Product-truth complexity v6 measurement Work"
---

# Approve the Product-truth complexity v6 measurement Work

## Human decision

The maintainer's standing instruction is to continue the fastest high-quality repair without
pausing for ordinary implementation choices. Main accepts the independent
[v6 QbD](../qbd/product-truth-complexity-v6-audit.md) at immutable Design checkpoint
`a8b4d52af33912258e13ab5d949629829b8f23f9`: verdict `PASS`, zero blocker, zero advisory, receipt
`89ea2e8e721d4f49abb3b28fbd2297b2`.

This decision authorizes only the bounded
[Product-truth complexity v6 meter Work](../work/product-truth-complexity-v6.md). Its implementation
must name that Design SHA and QbD receipt, change only the allowed v6 meter/config/test/fixture and
handoff paths, preserve v1-v5 evidence byte-for-byte, run entirely on immutable Git trees and
generated fixtures, and freeze one dedicated commit plus deterministic B0 report.

It does not authorize B1 production work, destructive execution, reading or mutating real
`~/.omnimind`, dependency changes, Campaign promotion or any relaxation of protected exclusions.
A different-actor zero-finding Review of the immutable v6 implementation remains the hard stop
before B1.
