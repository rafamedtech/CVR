import { calculatePaymentStatus } from '../../../../shared/payment-status'
import { paymentMutationSchema } from '../../../../shared/payment'
import { convertToMxn, normalizeExchangeRate } from '../../../../shared/currency'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const id = getRouterParam(event, 'id')
  const body = await readCrmBody(event, paymentMutationSchema)
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

  const alreadyPaid = order.payments.reduce((sum, payment) => sum + Number(payment.amountMxn), 0)
  const balance = Number(order.total) - alreadyPaid
  const exchangeRate = normalizeExchangeRate(body.currency, body.exchangeRate)
  const amountMxn = convertToMxn(body.amount, body.currency, exchangeRate)

  if (amountMxn > balance + 0.01) {
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
        amountMxn,
        currency: body.currency,
        exchangeRate,
        method: body.method,
        reference: body.reference || null,
        notes: body.notes || null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        recordedById: context.profile.id
      }
    })
    const payments = await transaction.payment.findMany({
      where: { orderId: order.id },
      select: { amountMxn: true }
    })
    const paid = payments.reduce((sum, current) => sum + Number(current.amountMxn), 0)

    await transaction.serviceOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: calculatePaymentStatus(Number(order.total), paid, payments.length)
      }
    })

    return payment
  })
})
