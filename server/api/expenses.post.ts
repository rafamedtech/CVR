import { z } from 'zod'

const expenseSchema = z.object({
  category: z.enum(['RENT', 'PAYROLL', 'UTILITIES', 'SUPPLIES', 'MAINTENANCE', 'MARKETING', 'TAXES', 'OTHER']),
  description: z.string().trim().min(2, 'Describe el gasto.').max(250),
  vendor: z.string().trim().max(120).optional().nullable(),
  amount: z.coerce.number().positive('El importe debe ser mayor a cero.'),
  expenseDate: z.string().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const workshopId = requireSelectedWorkshop(context)
  const body = await readCrmBody(event, expenseSchema)
  const prisma = usePrisma()

  return prisma.expense.create({
    data: {
      workshopId,
      category: body.category,
      description: body.description,
      vendor: body.vendor || null,
      amount: body.amount,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      notes: body.notes || null,
      recordedById: context.profile.id
    }
  })
})
