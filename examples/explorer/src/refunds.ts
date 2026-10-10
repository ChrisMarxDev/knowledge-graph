// Illustrative source file for the knowledge explorer demo.
export type Refund = { paymentId: string; amount: number; idempotencyKey: string };

export function validateRefund(refund: Refund) {
  if (!refund.idempotencyKey.trim()) throw new Error("An idempotency key is required");
  if (!Number.isFinite(refund.amount) || refund.amount <= 0) {
    throw new Error("Refund amount must be positive");
  }
  return refund;
}
