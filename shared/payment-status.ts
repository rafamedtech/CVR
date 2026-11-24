import { binaryBalanceInCents } from '@rafamedtech/nuxt-shared/utils'

export type PaymentStatus = 'NO_PAYMENTS' | 'PARTIALLY_PAID' | 'PAID'

export function calculatePaymentStatus(
  total: number,
  paid: number,
  paymentCount: number
): PaymentStatus {
  if (paymentCount === 0) return 'NO_PAYMENTS'
  const balanceInCents = binaryBalanceInCents(total, paid)
  return balanceInCents > 0 ? 'PARTIALLY_PAID' : 'PAID'
}
