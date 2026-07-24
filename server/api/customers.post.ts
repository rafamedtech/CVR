import { z } from 'zod'
import { normalizePhone } from '../utils/phone'

const phoneSchema = z.string()
  .trim()
  .transform(normalizePhone)
  .refine(value => /^\d{10}$/.test(value), 'Escribe un teléfono de 10 dígitos.')
const optionalPhoneSchema = phoneSchema.or(z.literal('')).optional().nullable()

const customerSchema = z.object({
  fullName: z.string().trim().min(2, 'Escribe el nombre del cliente.').max(120),
  phone: phoneSchema,
  alternatePhone: optionalPhoneSchema,
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
