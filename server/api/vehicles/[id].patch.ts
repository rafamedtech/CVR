import { z } from 'zod'

const optionalVinSchema = z.preprocess(
  value => typeof value === 'string' && !value.trim() ? undefined : value,
  z.string().trim().max(30).optional().nullable()
)
const optionalLicensePlateSchema = z.preprocess(
  value => typeof value === 'string' && !value.trim() ? undefined : value,
  z.string().trim().min(2).max(20).optional().nullable()
)

const updateVehicleSchema = z.object({
  customerId: z.uuid('Selecciona un cliente.'),
  licensePlate: optionalLicensePlateSchema,
  vin: optionalVinSchema,
  make: z.string().trim().min(2, 'Escribe la marca.').max(50),
  model: z.string().trim().min(1, 'Escribe el modelo.').max(60),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'ADVISOR'])
  if (!context.isSuperAdmin) requireSelectedWorkshop(context)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Vehículo inválido.' })
  }

  const body = await readCrmBody(event, updateVehicleSchema)
  const prisma = usePrisma()
  const licensePlate = body.licensePlate?.toUpperCase() || null
  const vin = body.vin?.toUpperCase() || null

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id,
      ...vehicleAccessWhere(context)
    },
    select: {
      id: true,
      workshops: { select: { workshopId: true } }
    }
  })

  if (!vehicle) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el vehículo.' })
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: body.customerId,
      ...customerAccessWhere(context)
    },
    select: { id: true }
  })

  if (!customer) {
    throw createError({ statusCode: 404, statusMessage: 'El cliente no pertenece al taller seleccionado.' })
  }

  const identifiers = [
    ...(licensePlate ? [{ licensePlate }] : []),
    ...(vin ? [{ vin }] : [])
  ]
  const duplicateVehicle = identifiers.length
    ? await prisma.vehicle.findFirst({
        where: {
          id: { not: vehicle.id },
          OR: identifiers
        },
        select: { id: true }
      })
    : null

  if (duplicateVehicle) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ya existe otro vehículo con las mismas placas o VIN.'
    })
  }

  return prisma.$transaction(async (transaction) => {
    const updatedVehicle = await transaction.vehicle.update({
      where: { id: vehicle.id },
      data: {
        customerId: customer.id,
        licensePlate,
        vin,
        make: body.make,
        model: body.model,
        year: body.year,
        color: body.color || null,
        notes: body.notes || null
      }
    })

    await transaction.customerWorkshop.createMany({
      data: vehicle.workshops.map(({ workshopId }) => ({ customerId: customer.id, workshopId })),
      skipDuplicates: true
    })

    return updatedVehicle
  })
})
