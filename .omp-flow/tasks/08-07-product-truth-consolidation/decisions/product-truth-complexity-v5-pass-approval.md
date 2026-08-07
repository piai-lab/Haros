---
type: "Decision"
title: "Approve the Product-truth complexity v5 measurement Work"
---

# Approve the Product-truth complexity v5 measurement Work

## Human decision

The maintainer's standing instruction is to continue the fastest high-quality repair without
pausing for ordinary implementation choices. Main accepts the independent
[v5 final QbD](../qbd/product-truth-complexity-v5-final-audit.md) at immutable Design checkpoint
`9d065923b8bd6a8d3748e1439d661ed217e36c5a`: verdict `PASS`, zero blocker, zero advisory, receipt
`b68d007c81c745a7ae3ca36d62ec303c`.

This decision authorizes only the bounded
[Product-truth complexity v5 meter Work](../work/product-truth-complexity-v5.md). Its implementation
must name that Design SHA and QbD receipt, change only the allowed v5 meter/config/test/fixture and
handoff paths, preserve v1-v4 evidence byte-for-byte, run entirely on immutable Git trees and
generated fixtures, and freeze one dedicated commit plus deterministic B0 report.

It does not authorize B1 production work, destructive execution, reading or mutating real
`~/.omnimind`, dependency changes, Campaign promotion or any relaxation of protected exclusions.
A different-actor zero-finding Review of the immutable v5 implementation remains the hard stop
before B1.
