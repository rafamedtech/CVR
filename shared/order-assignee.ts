export type OrderWorkshopType = 'BODY_SHOP' | 'MECHANICAL' | 'PAINT_STORE'

const defaultAssigneeByWorkshopType: Partial<Record<OrderWorkshopType, string>> = {
  BODY_SHOP: 'Paulo',
  MECHANICAL: 'Javier'
}

export function getDefaultOrderAssigneeName(workshopType?: string | null) {
  return defaultAssigneeByWorkshopType[workshopType as OrderWorkshopType] ?? null
}
