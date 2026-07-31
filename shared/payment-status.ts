export type PaymentStatus = 'NO_PAYMENTS' | 'PARTIALLY_PAID' | 'PAID'

export function calculatePaymentStatus(
  total: number,
  paid: number,
  paymentCount: number
): PaymentStatus {
  if (paymentCount === 0) return 'NO_PAYMENTS'
  const balanceInCents = Math.round(total * 100) - Math.round(paid * 100)
  return balanceInCents > 0 ? 'PARTIALLY_PAID' : 'PAID'
}
