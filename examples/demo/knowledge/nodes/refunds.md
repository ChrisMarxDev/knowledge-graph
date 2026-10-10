---
id: refunds
title: Refunds
type: capability
description: Refunds return a payment and must tolerate repeated requests.
dimensions:
  module: [server, web]
  discipline: [engineering, design]
links:
  - relation: governed_by
    target: refund-idempotency#retry-behavior
files: []
---

# Refunds

Refunds connect the customer interface to payment processing.

## User experience {#user-experience}

Show the refund state and let the customer recover from a network failure.

## Dependencies {#dependencies}

Read the idempotency rule before changing retry behavior.
