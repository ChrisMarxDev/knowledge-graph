---
id: idempotency
title: Idempotent requests
type: rule
description: One request intent must produce at most one financial effect.
dimensions:
  module:
    - payments
    - platform
  audience:
    - agent
    - developer
links:
  - relation: informs
    target: retry-policy
  - relation: explained_by
    target: refund-guide
files:
  - src/refunds.ts

---

## Contract {#contract}

Use a caller-supplied idempotency key for operations with financial effects. Store the key and canonical request before contacting a provider.

## Retry behavior {#retry-behavior}

A retry with the same key and payload returns the existing operation. Reusing the key with a different payload is an error.

Do not generate a fresh key after a network timeout.

## Scope {#scope}

Keys are scoped to the project and operation type. Never return another project’s response.
