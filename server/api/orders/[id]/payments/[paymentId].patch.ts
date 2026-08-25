import { convertToMxn, normalizeExchangeRate } from '../../../../../shared/currency'
import { paymentMutationSchema } from '../../../../../shared/payment'
import { calculatePaymentStatus } from '../../../../../shared/payment-status'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const orderId = getRouterParam(event, 'id')
  const paymentId = getRouterParam(event, 'paymentId')

  if (!orderId || !paymentId) {
    throw createError({ statusCode: 400, statusMessage: 'Pago inválido.' })
  }

  const body = await readCrmBody(event, paymentMutationSchema)
  const prisma = usePrisma()
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      orderId,
      order: workshopWhere(context)
    },
    include: {
      order: {
        include: { payments: true }
      }
    }
  })

  if (!payment) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el pago.' })
  }

  const paidWithoutCurrent = payment.order.payments
    .filter(current => current.id !== payment.id)
    .reduce((sum, current) => sum + Number(current.amountMxn), 0)
  const available = Number(payment.order.total) - paidWithoutCurrent
  const exchangeRate = normalizeExchangeRate(body.currency, body.exchangeRate)
  const amountMxn = convertToMxn(body.amount, body.currency, exchangeRate)

  if (amountMxn > available + 0.01) {
    throw createError({
      statusCode: 400,
      statusMessage: `El pago supera el importe disponible de ${available.toFixed(2)}.`
    })
  }

  return prisma.$transaction(async (transaction) => {
    const updatedPayment = await transaction.payment.update({
      where: { id: payment.id },
      data: {
        amount: body.amount,
        amountMxn,
        currency: body.currency,
        exchangeRate,
        method: body.method,
        reference: body.reference || null,
        notes: body.notes || null,
        paidAt: body.paidAt ? new Date(body.paidAt) : payment.paidAt
      }
    })
    const payments = await transaction.payment.findMany({
      where: { orderId: payment.orderId },
      select: { amountMxn: true }
    })
    const paid = payments.reduce((sum, current) => sum + Number(current.amountMxn), 0)

    await transaction.serviceOrder.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: calculatePaymentStatus(Number(payment.order.total), paid, payments.length)
      }
    })

    return updatedPayment
  })
})
