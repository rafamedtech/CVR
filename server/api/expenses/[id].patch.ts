import { z } from 'zod'

const updateExpenseSchema = z.object({
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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Gasto inválido.' })
  }

  const body = await readCrmBody(event, updateExpenseSchema)
  const prisma = usePrisma()

  const expense = await prisma.expense.findFirst({
    where: {
      id,
      ...workshopWhere(context)
    },
    select: { id: true }
  })

  if (!expense) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el gasto.' })
  }

  return prisma.expense.update({
    where: { id: expense.id },
    data: {
      category: body.category,
      description: body.description,
      vendor: body.vendor || null,
      amount: body.amount,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      notes: body.notes || null
    }
  })
})
