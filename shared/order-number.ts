import type { OrderWorkshopType } from './order-assignee'

const prefixByWorkshopType: Partial<Record<OrderWorkshopType, string>> = {
  BODY_SHOP: 'OTP',
  MECHANICAL: 'OTM'
}

export function getOrderNumberPrefix(workshopType?: string | null) {
  return prefixByWorkshopType[workshopType as OrderWorkshopType] ?? 'OT'
}

export function formatOrderNumber(
  workshopType: string | null | undefined,
  year: number,
  sequence: number
) {
  return `${getOrderNumberPrefix(workshopType)}-${year}-${String(sequence).padStart(4, '0')}`
}
