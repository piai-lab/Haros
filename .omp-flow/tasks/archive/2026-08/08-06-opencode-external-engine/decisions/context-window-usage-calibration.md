---
type: "Decision"
title: "Represent OpenCode context-window usage truthfully"
---

# Represent OpenCode context-window usage truthfully

## Human decision

Amendment r1.11 selects a separate closed `context.usage` Product fact for the exact OpenCode
1.14.40 ACP `usage_update` shape. It carries only the exact non-negative integer `used` and `size`
values. It does not import `cost`, synthesize token-detail fields or merge with Pi token usage.

Malformed, missing, fractional, negative or non-finite values fail the existing closed Engine
boundary without coercion or partial Activity. Pi retains its exact input/output/cache/total usage
semantics and display. This is a bounded correction in the same Work and operation; candidate
`f7ead472c2e893b2c60a67ad10a65b3e6208da5d` is superseded.
