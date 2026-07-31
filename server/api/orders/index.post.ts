import { z } from 'zod'
import { getDefaultOrderAssigneeName } from '../../../shared/order-assignee'
import { taxRateSchema } from '../../utils/tax'

const lineItemSchema = z.object({
  type: z.enum(['SERVICE', 'PART', 'LABOR', 'OTHER']),
  description: z.string().trim().min(2, 'Describe el concepto.').max(250),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().default(0),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  taxRate: taxRateSchema.optional()
})

const orderSchema = z.object({
  customerId: z.uuid('Selecciona un cliente.'),
  vehicleId: z.uuid('Selecciona un vehículo.'),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  complaint: z.string().trim().min(3, 'Describe el servicio solicitado.').max(2000),
  diagnosis: z.string().trim().max(2000).optional().nullable(),
  intakeNotes: z.string().trim().max(2000).optional().nullable(),
  internalNotes: z.string().trim().max(2000).optional().nullable(),
  mileageIn: z.coerce.number().int().nonnegative().optional().nullable(),
  fuelLevelIn: z.coerce.number().int().min(0).max(100).optional().nullable(),
  promisedAt: z.string().optional().nullable(),
  assignedToId: z.union([z.uuid(), z.literal('')]).optional().nullable(),
  items: z.array(lineItemSchema).default([])
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'ADVISOR'])
  const workshopId = requireSelectedWorkshop(context)
  const body = await readCrmBody(event, orderSchema)
  const prisma = usePrisma()

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: body.vehicleId,
      customerId: body.customerId,
      workshops: { some: { workshopId } },
      customer: { workshops: { some: { workshopId } } }
    }
  })

  if (!vehicle) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El vehículo y el cliente no pertenecen al taller seleccionado.'
    })
  }

  let assignedToId = body.assignedToId || null

  if (assignedToId) {
    const assigned = await prisma.workshopMember.findUnique({
      where: {
        profileId_workshopId: {
          profileId: assignedToId,
          workshopId
        }
      }
    })
    if (!assigned) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El técnico seleccionado no pertenece a este taller.'
      })
    }
  } else {
    const defaultAssigneeName = getDefaultOrderAssigneeName(context.selectedWorkshop?.type)
    const defaultMembership = defaultAssigneeName
      ? await prisma.workshopMember.findFirst({
          where: {
            workshopId,
            profile: {
              active: true,
              fullName: { contains: defaultAssigneeName, mode: 'insensitive' }
            }
          },
          select: { profileId: true },
          orderBy: { createdAt: 'asc' }
        })
      : null

    if (defaultAssigneeName && !defaultMembership) {
      throw createError({
        statusCode: 400,
        statusMessage: `Configura a ${defaultAssigneeName} como integrante de este taller antes de crear órdenes.`
      })
    }

    assignedToId = defaultMembership?.profileId ?? null
  }

  const year = new Date().getFullYear()
  const count = await prisma.serviceOrder.count({
    where: {
      workshopId,
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`)
      }
    }
  })
  const orderNumber = `OT-${year}-${String(count + 1).padStart(4, '0')}`
  const defaultTaxRate = Number(context.selectedWorkshop?.taxRate ?? 16)
  const calculatedItems = body.items.map(item => calculateLineItem({
    ...item,
    taxRate: item.taxRate ?? defaultTaxRate
  }))
  const totals = calculatedItems.reduce((result, item) => ({
    subtotal: result.subtotal + item.subtotal,
    discountTotal: result.discountTotal + item.discount,
    taxTotal: result.taxTotal + item.taxTotal,
    total: result.total + item.total
  }), {
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    total: 0
  })

  const order = await prisma.serviceOrder.create({
    data: {
      workshopId,
      customerId: body.customerId,
      vehicleId: body.vehicleId,
      orderNumber,
      priority: body.priority,
      complaint: body.complaint,
      diagnosis: body.diagnosis || null,
      intakeNotes: body.intakeNotes || null,
      internalNotes: body.internalNotes || null,
      mileageIn: body.mileageIn ?? null,
      fuelLevelIn: body.fuelLevelIn ?? null,
      promisedAt: body.promisedAt ? new Date(body.promisedAt) : null,
      assignedToId,
      createdById: context.profile.id,
      ...totals,
      items: {
        create: calculatedItems
      }
    }
  })

  return {
    id: order.id,
    orderNumber: order.orderNumber
  }
})
