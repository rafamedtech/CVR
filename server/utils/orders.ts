import type { Payment, Profile, ServiceOrder, Vehicle, Customer, Workshop } from '../../generated/prisma/client'
import { calculatePaymentStatus } from '../../shared/payment-status'

export interface LineItemInput {
  type: 'SERVICE' | 'PART' | 'LABOR' | 'OTHER'
  description: string
  quantity: number
  unitCost: number
  unitPrice: number
  discount?: number
  taxRate?: number
}

export function calculateLineItem(item: LineItemInput) {
  const quantity = Number(item.quantity)
  const unitCost = Number(item.unitCost)
  const unitPrice = Number(item.unitPrice)
  const discount = Number(item.discount ?? 0)
  const taxRate = Number(item.taxRate ?? 16)
  const subtotal = Math.max(0, quantity * unitPrice - discount)
  const taxTotal = subtotal * (taxRate / 100)

  return {
    type: item.type,
    description: item.description.trim(),
    quantity,
    unitCost,
    unitPrice,
    discount,
    taxRate,
    subtotal,
    taxTotal,
    total: subtotal + taxTotal,
    totalCost: quantity * unitCost
  }
}

export async function recalculateOrder(orderId: string) {
  const prisma = usePrisma()
  const [items, payments] = await Promise.all([
    prisma.orderItem.findMany({ where: { orderId } }),
    prisma.payment.findMany({
      where: { orderId },
      select: { amount: true }
    })
  ])
  const totals = items.reduce((result, item) => ({
    subtotal: result.subtotal + Number(item.subtotal),
    discountTotal: result.discountTotal + Number(item.discount),
    taxTotal: result.taxTotal + Number(item.taxTotal),
    total: result.total + Number(item.total)
  }), {
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    total: 0
  })
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)

  return prisma.serviceOrder.update({
    where: { id: orderId },
    data: {
      ...totals,
      paymentStatus: calculatePaymentStatus(totals.total, paid, payments.length)
    }
  })
}

type OrderForList = ServiceOrder & {
  workshop: Workshop
  customer: Customer
  vehicle: Vehicle
  assignedTo: Profile | null
  payments: Payment[]
}

export function serializeOrderListItem(order: OrderForList) {
  const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const total = Number(order.total)

  return {
    id: order.id,
    workshopId: order.workshopId,
    workshopName: order.workshop.name,
    customerId: order.customerId,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    priority: order.priority,
    customerName: order.customer.fullName,
    customerPhone: order.customer.phone,
    vehicleLabel: `${order.vehicle.make} ${order.vehicle.model} ${order.vehicle.year}`,
    licensePlate: order.vehicle.licensePlate ?? 'Sin placas',
    assignedToName: order.assignedTo?.fullName ?? null,
    total,
    paid,
    balance: Math.max(0, total - paid),
    promisedAt: order.promisedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString()
  }
}
