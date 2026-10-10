---
id: refund-idempotency
title: Refund idempotency
type: rule
description: Repeated refund requests use the same key and do not create duplicate refunds.
dimensions:
  module: [server]
  discipline: [engineering]
links: []
files: []
---

# Refund idempotency

This is example project guidance, not a verified statement about an implementation.

## Retry behavior {#retry-behavior}

Reuse an idempotency key for retries of the same refund operation.
Return the outcome of the first successful operation for subsequent attempts.

## Failure handling {#failure-handling}

A timeout does not establish that a refund failed. Check the previous operation
before creating a new request.
