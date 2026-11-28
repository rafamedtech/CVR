import { freightMutationSchema, normalizeFreightReferences } from '#shared/freight'
import { convertToMxn, normalizeExchangeRate } from '#shared/currency'

/** Edición de datos del flete (super admin). El estado cambia solo por /status. */
export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const workshopId = requireTransportWorkshop(context)
  const id = requireFreightId(getRouterParam(event, 'id'))
  const body = await readCrmBody(event, freightMutationSchema)
  const prisma = usePrisma()

  const freight = await prisma.freight.findFirst({ where: { id, workshopId }, select: { id: true } })
  if (!freight) throw createError({ statusCode: 404, statusMessage: 'No se encontró el flete.' })

  const customer = await prisma.customer.findFirst({
    where: { id: body.customerId, workshops: { some: { workshopId } } },
    select: { id: true }
  })
  if (!customer) {
    throw createError({ statusCode: 400, statusMessage: 'El cliente no pertenece al negocio Transporte.' })
  }

  const references = normalizeFreightReferences(body)
  const exchangeRate = normalizeExchangeRate(body.currency, body.exchangeRate)
  const amountMxn = convertToMxn(body.amount, body.currency, exchangeRate)

  try {
    return await prisma.$transaction(async (transaction) => {
      const previous = await lockForAudit(transaction, 'freight', freight.id, () => transaction.freight.findUnique({ where: { id: freight.id } }))
      if (references.sourceRecordId) {
        const duplicate = await transaction.freight.findFirst({
          where: { source: references.source, sourceRecordId: references.sourceRecordId, id: { not: freight.id } },
          select: { id: true }
        })
        if (duplicate) throw duplicateNexoRecordError()
      }
      const updated = await transaction.freight.update({
        where: { id: freight.id },
        data: {
          customerId: customer.id,
          ...references,
          origin: body.origin,
          destination: body.destination,
          amount: body.amount,
          currency: body.currency,
          exchangeRate,
          amountMxn,
          serviceDate: new Date(`${body.serviceDate}T00:00:00Z`)
        }
      })
      await recordAudit(transaction, context, {
        entityType: 'freight',
        entityId: freight.id,
        action: 'update',
        workshopId,
        snapshot: previous,
        changes: updated,
        effectiveDate: updated.serviceDate
      })
      return { id: updated.id }
    })
  } catch (error) {
    if (isDuplicateNexoRecord(error)) throw duplicateNexoRecordError()
    throw error
  }
})
