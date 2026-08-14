import { z } from 'zod'
import { getOrderTaxRate } from '../../../../shared/order-tax'

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
  const body = await readCrmBody(event, itemSchema)
  const prisma = usePrisma()
  const order = await prisma.serviceOrder.findFirst({
    where: {
      id,
      ...workshopWhere(context)
    }
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró la orden.' })
  }

  const item = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      ...calculateLineItem({
        ...body,
        taxRate: getOrderTaxRate(order.requiresInvoice)
      })
    }
  })
  await recalculateOrder(order.id)

  return item
})
