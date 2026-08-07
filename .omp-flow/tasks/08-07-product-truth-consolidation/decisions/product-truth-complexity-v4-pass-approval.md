---
type: "Decision"
title: "Approve the Product-truth complexity v4 measurement Work"
---

# Approve the Product-truth complexity v4 measurement Work

## Human decision

The maintainer's standing instruction is to continue the fastest high-quality repair without
pausing for ordinary implementation choices. Main accepts the independent
[v4 final QbD](../qbd/product-truth-complexity-v4-final-audit.md) at immutable Design checkpoint
`2d8fc8c9fcfff6fec33b433bbb449099bd8826dd`: verdict `PASS`, zero blocker, zero advisory, receipt
`83ebaaf9491b4409b64e929680648174`.

This decision authorizes only the bounded
[Product-truth complexity v4 meter Work](../work/product-truth-complexity-v4.md). Its implementation
must name that Design SHA and QbD receipt, change only the allowed v4 meter/config/test/fixture and
handoff paths, preserve v1/v2/v3 evidence byte-for-byte, run entirely on immutable Git trees and
generated fixtures, and freeze one dedicated commit plus deterministic B0 report.

It does not authorize B1 production work, destructive execution, reading or mutating real
`~/.omnimind`, dependency changes, Campaign promotion or any relaxation of protected exclusions.
A different-actor zero-finding Review of the immutable v4 implementation remains the hard stop
before B1.
