import { isPositiveAmount } from '@rafamedtech/nuxt-shared/utils'
import { z } from 'zod'

export const expenseMutationSchema = z.object({
  category: z.enum(['RENT', 'PAYROLL', 'UTILITIES', 'SUPPLIES', 'MAINTENANCE', 'MARKETING', 'TAXES', 'FUEL', 'OTHER']),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'CREDIT', 'OTHER']),
  description: z.string().trim().min(2, 'Describe el gasto.').max(250),
  vendor: z.string().trim().max(120).optional(),
  amount: z.coerce.number().refine(isPositiveAmount, 'El importe debe ser mayor a cero.'),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  exchangeRate: z.coerce.number().refine(isPositiveAmount, 'El tipo de cambio debe ser mayor a cero.').default(1),
  expenseDate: z.string().min(1, 'Selecciona la fecha.'),
  assignmentType: z.enum(['GLOBAL', 'WORKSHOP', 'ORDER', 'FREIGHT']),
  orderId: z.union([
    z.uuid('Selecciona una orden de trabajo válida.'),
    z.literal('')
  ]),
  // Costo directo de un flete de Transporte (CVR-03).
  freightId: z.union([
    z.uuid('Selecciona un flete válido.'),
    z.literal('')
  ]).default(''),
  notes: z.string().trim().max(500).optional()
}).superRefine((expense, context) => {
  if (expense.assignmentType === 'ORDER' && !expense.orderId) {
    context.addIssue({
      code: 'custom',
      path: ['orderId'],
      message: 'Selecciona una orden de trabajo.'
    })
  }

  if (expense.assignmentType !== 'ORDER' && expense.orderId) {
    context.addIssue({
      code: 'custom',
      path: ['orderId'],
      message: 'Un gasto global o directo del taller no debe tener una orden asignada.'
    })
  }

  if (expense.assignmentType === 'FREIGHT' && !expense.freightId) {
    context.addIssue({ code: 'custom', path: ['freightId'], message: 'Selecciona un flete.' })
  }

  if (expense.assignmentType !== 'FREIGHT' && expense.freightId) {
    context.addIssue({ code: 'custom', path: ['freightId'], message: 'Sólo un costo de flete lleva un flete asignado.' })
  }
})

export type ExpenseMutation = z.output<typeof expenseMutationSchema>
export type ExpenseAssignmentType = ExpenseMutation['assignmentType']
