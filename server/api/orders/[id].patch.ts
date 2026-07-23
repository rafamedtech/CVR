import { z } from 'zod'

const updateOrderSchema = z.object({
  status: z.enum(['ESTIMATE', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  diagnosis: z.string().trim().max(2000).optional().nullable(),
  internalNotes: z.string().trim().max(2000).optional().nullable(),
  promisedAt: z.string().optional().nullable(),
  assignedToId: z.union([z.uuid(), z.literal('')]).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'ADVISOR', 'TECHNICIAN'])
  const id = getRouterParam(event, 'id')
  const body = await readCrmBody(event, updateOrderSchema)
  const role = currentWorkshopRole(context)

  if (role === 'TECHNICIAN') {
    const forbiddenChange = body.priority !== undefined
      || body.internalNotes !== undefined
      || body.promisedAt !== undefined
      || body.assignedToId !== undefined
      || (body.status !== undefined && !['IN_PROGRESS', 'QUALITY_CONTROL', 'READY'].includes(body.status))

    if (forbiddenChange) {
      throw createError({
        statusCode: 403,
        statusMessage: 'El técnico solo puede actualizar el diagnóstico y avance de sus órdenes.'
      })
    }
  }
  const prisma = usePrisma()

  const order = await prisma.serviceOrder.findFirst({
    where: {
      id,
      ...workshopWhere(context),
      ...assignedOrderWhere(context)
    }
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró la orden.' })
  }

  if (body.assignedToId) {
    const member = await prisma.workshopMember.findUnique({
      where: {
        profileId_workshopId: {
          profileId: body.assignedToId,
          workshopId: order.workshopId
        }
      }
    })
    if (!member) {
      throw createError({ statusCode: 400, statusMessage: 'El usuario no pertenece a este taller.' })
    }
  }

  const now = new Date()
  const statusDates = body.status
    ? {
        ...(body.status === 'APPROVED' && !order.approvedAt ? { approvedAt: now } : {}),
        ...(body.status === 'IN_PROGRESS' && !order.startedAt ? { startedAt: now } : {}),
        ...(body.status === 'READY' && !order.completedAt ? { completedAt: now } : {}),
        ...(body.status === 'DELIVERED' && !order.deliveredAt ? { deliveredAt: now } : {})
      }
    : {}

  return prisma.serviceOrder.update({
    where: { id: order.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.priority ? { priority: body.priority } : {}),
      ...(body.diagnosis !== undefined ? { diagnosis: body.diagnosis || null } : {}),
      ...(body.internalNotes !== undefined ? { internalNotes: body.internalNotes || null } : {}),
      ...(body.promisedAt !== undefined ? { promisedAt: body.promisedAt ? new Date(body.promisedAt) : null } : {}),
      ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId || null } : {}),
      ...statusDates
    }
  })
})
