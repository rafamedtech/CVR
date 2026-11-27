import { z } from 'zod'
import { getOrderTaxRate } from '../../../../../shared/order-tax'

const itemSchema = z.object({
  type: z.enum(['SERVICE', 'PART', 'LABOR', 'OTHER']),
  description: z.string().trim().min(2, 'Describe el concepto.').max(250),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  exchangeRate: z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.').default(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().default(0),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0)
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const body = await readCrmBody(event, itemSchema)
  const prisma = usePrisma()

  const item = await prisma.orderItem.findFirst({
    where: {
      id: itemId,
      orderId: id,
      order: workshopWhere(context)
    },
    include: {
      order: {
        select: { requiresInvoice: true, workshopId: true }
      }
    }
  })

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el concepto.' })
  }

  const { order } = item
  const updatedItem = await prisma.$transaction(async (transaction) => {
    const previous = await lockForAudit(transaction, 'order_item', item.id, () => transaction.orderItem.findUnique({ where: { id: item.id } }))
    const updated = await transaction.orderItem.update({
      where: { id: item.id },
      data: calculateLineItem({
        ...body,
        taxRate: getOrderTaxRate(order.requiresInvoice)
      })
    })
    await recordAudit(transaction, context, {
      entityType: 'order_item',
      entityId: item.id,
      action: 'update',
      workshopId: order.workshopId,
      snapshot: previous,
      changes: updated,
      source: { type: 'service_order', id: item.orderId }
    })
    return updated
  })
  await recalculateOrder(item.orderId)

  return updatedItem
})
