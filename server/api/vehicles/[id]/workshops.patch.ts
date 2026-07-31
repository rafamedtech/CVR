import { z } from 'zod'

const workshopAssignmentsSchema = z.object({
  workshopIds: z.array(z.uuid()).min(1, 'Asigna al menos un taller.').max(20)
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  if (!context.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Sólo los administradores generales pueden asignar vehículos a talleres.'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Vehículo inválido.' })
  }

  const body = await readCrmBody(event, workshopAssignmentsSchema)
  const workshopIds = [...new Set(body.workshopIds)]
  const prisma = usePrisma()

  return prisma.$transaction(async (transaction) => {
    const [vehicle, activeWorkshops, orderWorkshops] = await Promise.all([
      transaction.vehicle.findUnique({
        where: { id },
        select: { id: true, customerId: true }
      }),
      transaction.workshop.findMany({
        where: { id: { in: workshopIds }, active: true },
        select: { id: true, name: true, type: true }
      }),
      transaction.serviceOrder.findMany({
        where: { vehicleId: id },
        distinct: ['workshopId'],
        select: { workshopId: true }
      })
    ])

    if (!vehicle) {
      throw createError({ statusCode: 404, statusMessage: 'No se encontró el vehículo.' })
    }

    if (activeWorkshops.length !== workshopIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'Uno o más talleres no existen o están inactivos.' })
    }

    const missingHistoricalWorkshop = orderWorkshops.some(({ workshopId }) => !workshopIds.includes(workshopId))
    if (missingHistoricalWorkshop) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No puedes quitar un taller que ya tiene órdenes de este vehículo.'
      })
    }

    await transaction.vehicleWorkshop.deleteMany({
      where: {
        vehicleId: id,
        workshopId: { notIn: workshopIds }
      }
    })
    await transaction.vehicleWorkshop.createMany({
      data: workshopIds.map(workshopId => ({ vehicleId: id, workshopId })),
      skipDuplicates: true
    })

    // A workshop that can see the vehicle must also be able to see its owner.
    await transaction.customerWorkshop.createMany({
      data: workshopIds.map(workshopId => ({ customerId: vehicle.customerId, workshopId })),
      skipDuplicates: true
    })

    return activeWorkshops.sort((left, right) => left.name.localeCompare(right.name, 'es-MX'))
  })
})
