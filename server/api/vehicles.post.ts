import { z } from 'zod'

const vehicleSchema = z.object({
  customerId: z.uuid('Selecciona un cliente.'),
  licensePlate: z.string().trim().min(2, 'Escribe las placas.').max(20),
  vin: z.string().trim().max(30).optional().nullable(),
  make: z.string().trim().min(2, 'Escribe la marca.').max(50),
  model: z.string().trim().min(1, 'Escribe el modelo.').max(60),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().trim().max(40).optional().nullable(),
  mileage: z.coerce.number().int().nonnegative().optional().nullable(),
  fuelLevel: z.coerce.number().int().min(0).max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'ADVISOR'])
  const workshopId = requireSelectedWorkshop(context)
  const body = await readCrmBody(event, vehicleSchema)
  const prisma = usePrisma()
  const licensePlate = body.licensePlate.toUpperCase()
  const vin = body.vin?.toUpperCase() || null

  const customer = await prisma.customer.findFirst({
    where: {
      id: body.customerId,
      workshops: { some: { workshopId } }
    }
  })

  if (!customer) {
    throw createError({
      statusCode: 404,
      statusMessage: 'El cliente no pertenece al taller seleccionado.'
    })
  }

  const existingVehicle = await prisma.vehicle.findFirst({
    where: {
      OR: [
        { licensePlate },
        ...(vin ? [{ vin }] : [])
      ]
    },
    select: {
      workshops: {
        where: { workshopId },
        select: { workshopId: true }
      }
    }
  })

  if (existingVehicle) {
    throw createError({
      statusCode: 409,
      statusMessage: existingVehicle.workshops.length
        ? 'Este vehículo ya está registrado en el taller seleccionado.'
        : 'Este vehículo ya existe. Un administrador debe asignarlo a este taller.'
    })
  }

  return prisma.vehicle.create({
    data: {
      customerId: body.customerId,
      licensePlate,
      vin,
      make: body.make,
      model: body.model,
      year: body.year,
      color: body.color || null,
      mileage: body.mileage ?? null,
      fuelLevel: body.fuelLevel ?? null,
      notes: body.notes || null,
      workshops: {
        create: { workshopId }
      }
    }
  })
})
