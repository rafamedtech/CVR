import { z } from 'zod'
import { customerAddressSchema } from '../../shared/customer-address'
import { customerTypeSchema } from '../../shared/customer-type'
import { normalizePhone } from '../utils/phone'

const phoneSchema = z.string()
  .trim()
  .transform(normalizePhone)
  .refine(value => /^\d{10}$/.test(value), 'Escribe un teléfono de 10 dígitos.')
const optionalPhoneSchema = phoneSchema.or(z.literal('')).optional().nullable()

const customerSchema = z.object({
  fullName: z.string().trim().min(2, 'Escribe el nombre del cliente.').max(120),
  type: customerTypeSchema.default('CUSTOMER'),
  phone: phoneSchema,
  alternatePhone: optionalPhoneSchema,
  email: z.union([z.email('Escribe un correo válido.'), z.literal('')]).optional().nullable(),
  taxId: z.string().trim().max(20).optional().nullable(),
  address: customerAddressSchema,
  notes: z.string().trim().max(1000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'ADVISOR'])
  const workshopId = requireSelectedWorkshop(context)
  const body = await readCrmBody(event, customerSchema)
  const prisma = usePrisma()

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: body.phone },
        ...(body.email ? [{ email: { equals: body.email, mode: 'insensitive' as const } }] : []),
        ...(body.taxId ? [{ taxId: { equals: body.taxId, mode: 'insensitive' as const } }] : [])
      ]
    },
    select: {
      workshops: {
        where: { workshopId },
        select: { workshopId: true }
      }
    }
  })

  if (existingCustomer) {
    throw createError({
      statusCode: 409,
      statusMessage: existingCustomer.workshops.length
        ? 'Este cliente ya está registrado en el taller seleccionado.'
        : 'Este cliente ya existe. Un administrador debe asignarlo a este taller.'
    })
  }

  const customer = await prisma.customer.create({
    data: {
      fullName: body.fullName,
      type: body.type,
      phone: body.phone,
      alternatePhone: body.alternatePhone || null,
      email: body.email || null,
      taxId: body.taxId || null,
      ...customerAddressData(body.address),
      notes: body.notes || null,
      workshops: {
        create: { workshopId }
      }
    }
  })

  return serializeCustomer(customer)
})
