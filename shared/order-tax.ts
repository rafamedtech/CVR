export type OrderTaxRate = 0 | 8

export function getOrderTaxRate(requiresInvoice: boolean): OrderTaxRate {
  return requiresInvoice ? 8 : 0
}
