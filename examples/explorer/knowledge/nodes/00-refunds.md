---
id: refunds
title: Refund processing
type: capability
description: Return money safely, even when requests are retried or providers are slow.
dimensions:
  module:
    - payments
  audience:
    - agent
    - developer
links:
  - relation: governed_by
    target: idempotency#retry-behavior
  - relation: depends_on
    target: payment-ledger
  - relation: explained_by
    target: refund-guide
  - relation: depends_on
    target: webhooks
files:
  - src/refunds.ts

---

## Overview {#overview}

Refunds turn a settled payment into an auditable reversal. The API accepts a payment ID, an amount, and an idempotency key.

A successful response means the request is recorded. Provider settlement can happen later.

## Processing flow {#processing-flow}

1. Validate the payment and refundable balance.
2. Reserve the amount in the payment ledger.
3. Submit the provider request with the original idempotency key.
4. Reconcile the eventual result through a webhook.

## Failure handling {#failure-handling}

Keep an uncertain provider response pending. A timeout must not create a second refund. Use the same key when retrying the request.
