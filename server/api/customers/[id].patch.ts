import { z } from 'zod'
import { customerAddressSchema } from '../../../shared/customer-address'
import { customerTypeSchema } from '../../../shared/customer-type'
import { normalizePhone } from '../../utils/phone'

const phoneSchema = z.string()
  .trim()
  .transform(normalizePhone)
  .refine(value => /^\d{10}$/.test(value), 'Escribe un teléfono de 10 dígitos.')
const optionalPhoneSchema = phoneSchema.or(z.literal('')).optional().nullable()

const updateCustomerSchema = z.object({
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
  if (!context.isSuperAdmin) requireSelectedWorkshop(context)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Cliente inválido.' })
  }

  const body = await readCrmBody(event, updateCustomerSchema)
  const prisma = usePrisma()
  const customer = await prisma.customer.findFirst({
    where: {
      id,
      ...customerAccessWhere(context)
    },
    select: { id: true }
  })

  if (!customer) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el cliente.' })
  }

  const duplicateCustomer = await prisma.customer.findFirst({
    where: {
      id: { not: customer.id },
      OR: [
        { phone: body.phone },
        ...(body.email ? [{ email: { equals: body.email, mode: 'insensitive' as const } }] : []),
        ...(body.taxId ? [{ taxId: { equals: body.taxId, mode: 'insensitive' as const } }] : [])
      ]
    },
    select: { id: true }
  })

  if (duplicateCustomer) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ya existe otro cliente con el mismo teléfono, correo o RFC.'
    })
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      fullName: body.fullName,
      type: body.type,
      phone: body.phone,
      alternatePhone: body.alternatePhone || null,
      email: body.email || null,
      taxId: body.taxId || null,
      ...customerAddressData(body.address),
      notes: body.notes || null
    }
  })

  return serializeCustomer(updatedCustomer)
})
