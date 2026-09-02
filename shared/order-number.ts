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

export function getNextOrderNumberSequence(
  orderNumbers: Iterable<string>,
  workshopType: string | null | undefined,
  year: number
) {
  const namespace = `${getOrderNumberPrefix(workshopType)}-${year}-`
  let highestSequence = 0

  for (const orderNumber of orderNumbers) {
    if (!orderNumber.startsWith(namespace)) continue

    const sequenceText = orderNumber.slice(namespace.length)
    if (!/^\d+$/.test(sequenceText)) continue

    const sequence = Number(sequenceText)
    if (Number.isSafeInteger(sequence)) {
      highestSequence = Math.max(highestSequence, sequence)
    }
  }

  return highestSequence + 1
}
