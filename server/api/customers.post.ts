import { z } from 'zod'

const customerSchema = z.object({
  fullName: z.string().trim().min(2, 'Escribe el nombre del cliente.').max(120),
  phone: z.string().trim().min(7, 'Escribe un teléfono válido.').max(30),
  alternatePhone: z.string().trim().max(30).optional().nullable(),
  email: z.union([z.email('Escribe un correo válido.'), z.literal('')]).optional().nullable(),
  taxId: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'ADVISOR'])
  const workshopId = requireSelectedWorkshop(context)
  const body = await readCrmBody(event, customerSchema)
  const prisma = usePrisma()

  return prisma.customer.create({
    data: {
      workshopId,
      fullName: body.fullName,
      phone: body.phone,
      alternatePhone: body.alternatePhone || null,
      email: body.email || null,
      taxId: body.taxId || null,
      address: body.address || null,
      notes: body.notes || null
    }
  })
})
