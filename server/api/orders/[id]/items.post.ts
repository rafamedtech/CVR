import { z } from 'zod'
import { taxRateSchema } from '../../../utils/tax'

const itemSchema = z.object({
  type: z.enum(['SERVICE', 'PART', 'LABOR', 'OTHER']),
  description: z.string().trim().min(2, 'Describe el concepto.').max(250),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().default(0),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  taxRate: taxRateSchema.optional()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'ADVISOR'])
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

  const workshop = await prisma.workshop.findUnique({
    where: { id: order.workshopId },
    select: { taxRate: true }
  })
  const defaultTaxRate = Number(workshop?.taxRate ?? 16)

  const item = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      ...calculateLineItem({
        ...body,
        taxRate: body.taxRate ?? defaultTaxRate
      })
    }
  })
  await recalculateOrder(order.id)

  return item
})
