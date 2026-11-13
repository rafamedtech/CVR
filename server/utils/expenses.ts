import type { ExpenseAssignmentType } from '../../shared/expense'
import type { CrmRequestContext } from './auth'

// Global expenses follow the same access boundary as consolidated financial data.
export function expenseAccessWhere(context: CrmRequestContext) {
  if (!context.workshopId) {
    requireGlobalReadAccess(context)
    return {}
  }
  return context.isSuperAdmin || context.isReadOnly
    ? { OR: [{ workshopId: context.workshopId }, { workshopId: null }] }
    : { workshopId: context.workshopId }
}

export function resolveExpenseWorkshopId(context: CrmRequestContext, assignmentType: ExpenseAssignmentType) {
  if (assignmentType === 'GLOBAL') {
    requireSuperAdmin(context)
    return null
  }
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  return requireSelectedWorkshop(context)
}

export async function resolveExpenseOrderId(orderId: string, workshopId: string) {
  if (!orderId) return null

  const order = await usePrisma().serviceOrder.findFirst({
    where: { id: orderId, workshopId },
    select: { id: true }
  })

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'La orden seleccionada no pertenece al taller activo.'
    })
  }

  return order.id
}
