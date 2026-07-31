import { z } from 'zod'

const workshopAssignmentsSchema = z.object({
  workshopIds: z.array(z.uuid()).min(1, 'Asigna al menos un taller.').max(20)
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  if (!context.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Sólo los administradores generales pueden asignar clientes a talleres.'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Cliente inválido.' })
  }

  const body = await readCrmBody(event, workshopAssignmentsSchema)
  const workshopIds = [...new Set(body.workshopIds)]
  const prisma = usePrisma()

  return prisma.$transaction(async (transaction) => {
    const [customer, activeWorkshops, vehicleWorkshops, orderWorkshops] = await Promise.all([
      transaction.customer.findUnique({ where: { id }, select: { id: true } }),
      transaction.workshop.findMany({
        where: { id: { in: workshopIds }, active: true },
        select: { id: true, name: true, type: true }
      }),
      transaction.vehicleWorkshop.findMany({
        where: { vehicle: { customerId: id } },
        distinct: ['workshopId'],
        select: { workshopId: true }
      }),
      transaction.serviceOrder.findMany({
        where: { customerId: id },
        distinct: ['workshopId'],
        select: { workshopId: true }
      })
    ])

    if (!customer) {
      throw createError({ statusCode: 404, statusMessage: 'No se encontró el cliente.' })
    }

    if (activeWorkshops.length !== workshopIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'Uno o más talleres no existen o están inactivos.' })
    }

    const requiredWorkshopIds = new Set([
      ...vehicleWorkshops.map(item => item.workshopId),
      ...orderWorkshops.map(item => item.workshopId)
    ])
    const missingHistoricalWorkshop = [...requiredWorkshopIds].some(workshopId => !workshopIds.includes(workshopId))

    if (missingHistoricalWorkshop) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No puedes quitar un taller que ya tiene vehículos u órdenes de este cliente.'
      })
    }

    await transaction.customerWorkshop.deleteMany({
      where: {
        customerId: id,
        workshopId: { notIn: workshopIds }
      }
    })
    await transaction.customerWorkshop.createMany({
      data: workshopIds.map(workshopId => ({ customerId: id, workshopId })),
      skipDuplicates: true
    })

    return activeWorkshops.sort((left, right) => left.name.localeCompare(right.name, 'es-MX'))
  })
})
