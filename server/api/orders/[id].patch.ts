import { z } from 'zod'
import { getOrderTaxRate } from '../../../shared/order-tax'

const lineItemSchema = z.object({
  type: z.enum(['SERVICE', 'PART', 'LABOR', 'OTHER']),
  description: z.string().trim().min(2, 'Describe el concepto.').max(250),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  exchangeRate: z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.').default(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().default(0),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0)
})

const updateOrderSchema = z.object({
  status: z.enum(['ESTIMATE', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  requiresInvoice: z.boolean().optional(),
  complaint: z.string().trim().min(3).max(2000).optional(),
  diagnosis: z.string().trim().max(2000).optional().nullable(),
  intakeNotes: z.string().trim().max(2000).optional().nullable(),
  internalNotes: z.string().trim().max(2000).optional().nullable(),
  mileageIn: z.coerce.number().int().nonnegative().optional().nullable(),
  fuelLevelIn: z.coerce.number().int().min(0).max(100).optional().nullable(),
  createdAt: z.string().datetime({ local: true }).optional(),
  promisedAt: z.string().optional().nullable(),
  assignedToId: z.union([z.uuid(), z.literal('')]).optional().nullable(),
  items: z.array(lineItemSchema).optional()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const id = getRouterParam(event, 'id')
  const body = await readCrmBody(event, updateOrderSchema)
  const prisma = usePrisma()

  const order = await prisma.serviceOrder.findFirst({
    where: {
      id,
      ...workshopWhere(context),
      ...assignedOrderWhere(context)
    }
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró la orden.' })
  }

  if (body.assignedToId) {
    const member = await prisma.workshopMember.findUnique({
      where: {
        profileId_workshopId: {
          profileId: body.assignedToId,
          workshopId: order.workshopId
        }
      }
    })
    if (!member) {
      throw createError({ statusCode: 400, statusMessage: 'El usuario no pertenece a este taller.' })
    }
  }

  const now = new Date()
  const statusDates = body.status
    ? {
        ...(body.status === 'APPROVED' && !order.approvedAt ? { approvedAt: now } : {}),
        ...(body.status === 'IN_PROGRESS' && !order.startedAt ? { startedAt: now } : {}),
        ...(body.status === 'READY' && !order.completedAt ? { completedAt: now } : {}),
        ...(body.status === 'DELIVERED' && !order.deliveredAt ? { deliveredAt: now } : {})
      }
    : {}

  const shouldRecalculateItems = body.items !== undefined
    || (body.requiresInvoice !== undefined && body.requiresInvoice !== order.requiresInvoice)
  const itemInputs = body.items ?? (shouldRecalculateItems
    ? await prisma.orderItem.findMany({ where: { orderId: order.id } })
    : undefined)
  const taxRate = getOrderTaxRate(body.requiresInvoice ?? order.requiresInvoice)
  const calculatedItems = itemInputs?.map(item => calculateLineItem({
    type: item.type,
    description: item.description,
    currency: item.currency,
    exchangeRate: Number(item.exchangeRate),
    quantity: Number(item.quantity),
    unitCost: Number(item.unitCost),
    unitPrice: Number(item.unitPrice),
    discount: Number(item.discount),
    taxRate
  }))
  const totals = calculatedItems ? calculateOrderTotals(calculatedItems) : undefined

  const updatedOrder = await prisma.serviceOrder.update({
    where: { id: order.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.priority ? { priority: body.priority } : {}),
      ...(body.requiresInvoice !== undefined ? { requiresInvoice: body.requiresInvoice } : {}),
      ...(body.complaint !== undefined ? { complaint: body.complaint } : {}),
      ...(body.diagnosis !== undefined ? { diagnosis: body.diagnosis || null } : {}),
      ...(body.intakeNotes !== undefined ? { intakeNotes: body.intakeNotes || null } : {}),
      ...(body.internalNotes !== undefined ? { internalNotes: body.internalNotes || null } : {}),
      ...(body.mileageIn !== undefined ? { mileageIn: body.mileageIn } : {}),
      ...(body.fuelLevelIn !== undefined ? { fuelLevelIn: body.fuelLevelIn } : {}),
      ...(body.createdAt !== undefined ? { createdAt: new Date(body.createdAt) } : {}),
      ...(body.promisedAt !== undefined ? { promisedAt: body.promisedAt ? new Date(body.promisedAt) : null } : {}),
      ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId || null } : {}),
      ...(calculatedItems && totals
        ? {
            ...totals,
            items: {
              deleteMany: {},
              create: calculatedItems
            }
          }
        : {}),
      ...statusDates
    }
  })

  return calculatedItems ? recalculateOrder(order.id) : updatedOrder
})
