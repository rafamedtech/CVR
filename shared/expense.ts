import { z } from 'zod'

export const expenseMutationSchema = z.object({
  category: z.enum(['RENT', 'PAYROLL', 'UTILITIES', 'SUPPLIES', 'MAINTENANCE', 'MARKETING', 'TAXES', 'OTHER']),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'CREDIT', 'OTHER']),
  description: z.string().trim().min(2, 'Describe el gasto.').max(250),
  vendor: z.string().trim().max(120).optional(),
  amount: z.coerce.number().positive('El importe debe ser mayor a cero.'),
  expenseDate: z.string().min(1, 'Selecciona la fecha.'),
  assignmentType: z.enum(['WORKSHOP', 'ORDER']),
  orderId: z.union([
    z.uuid('Selecciona una orden de trabajo válida.'),
    z.literal('')
  ]),
  notes: z.string().trim().max(500).optional()
}).superRefine((expense, context) => {
  if (expense.assignmentType === 'ORDER' && !expense.orderId) {
    context.addIssue({
      code: 'custom',
      path: ['orderId'],
      message: 'Selecciona una orden de trabajo.'
    })
  }

  if (expense.assignmentType === 'WORKSHOP' && expense.orderId) {
    context.addIssue({
      code: 'custom',
      path: ['orderId'],
      message: 'Un gasto directo del taller no debe tener una orden asignada.'
    })
  }
})

export type ExpenseMutation = z.output<typeof expenseMutationSchema>
export type ExpenseAssignmentType = ExpenseMutation['assignmentType']
