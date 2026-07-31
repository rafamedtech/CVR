import { z } from 'zod'
import { calculatePaymentStatus } from '../../../../shared/payment-status'

const paymentSchema = z.object({
  amount: z.coerce.number().positive('El pago debe ser mayor a cero.'),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'CREDIT', 'OTHER']),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  paidAt: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
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

  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.create({
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
    const payments = await transaction.payment.findMany({
      where: { orderId: order.id },
      select: { amount: true }
    })
    const paid = payments.reduce((sum, current) => sum + Number(current.amount), 0)

    await transaction.serviceOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: calculatePaymentStatus(Number(order.total), paid, payments.length)
      }
    })

    return payment
  })
})
