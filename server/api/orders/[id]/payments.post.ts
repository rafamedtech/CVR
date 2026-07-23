import { z } from 'zod'

const paymentSchema = z.object({
  amount: z.coerce.number().positive('El pago debe ser mayor a cero.'),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'CREDIT', 'OTHER']),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  paidAt: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'ADVISOR', 'CASHIER'])
  const id = getRouterParam(event, 'id')
  const body = await readCrmBody(event, paymentSchema)
  const prisma = usePrisma()
  const order = await prisma.serviceOrder.findFirst({
    where: {
      id,
      ...workshopWhere(context)
    },
    include: { payments: true }
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró la orden.' })
  }

  const alreadyPaid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const balance = Number(order.total) - alreadyPaid

  if (body.amount > balance + 0.01) {
    throw createError({
      statusCode: 400,
      statusMessage: `El pago supera el saldo pendiente de ${balance.toFixed(2)}.`
    })
  }

  return prisma.payment.create({
    data: {
      orderId: order.id,
      amount: body.amount,
      method: body.method,
      reference: body.reference || null,
      notes: body.notes || null,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      recordedById: context.profile.id
    }
  })
})
