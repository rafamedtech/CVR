import { calculatePaymentStatus } from '../../../../../shared/payment-status'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const orderId = getRouterParam(event, 'id')
  const paymentId = getRouterParam(event, 'paymentId')

  if (!orderId || !paymentId) {
    throw createError({ statusCode: 400, statusMessage: 'Pago inválido.' })
  }

  const prisma = usePrisma()
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      orderId,
      order: workshopWhere(context)
    },
    include: {
      order: true
    }
  })

  if (!payment) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el pago.' })
  }

  return prisma.$transaction(async (transaction) => {
    const deletedPayment = await transaction.payment.delete({
      where: { id: payment.id }
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

    return deletedPayment
  })
})
