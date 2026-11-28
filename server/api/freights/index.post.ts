import { freightMutationSchema, formatFreightNumber, freightNumberNamespace, getNextFreightSequence, normalizeFreightReferences } from '#shared/freight'
import { convertToMxn, normalizeExchangeRate } from '#shared/currency'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER'])
  const workshopId = requireTransportWorkshop(context)
  const body = await readCrmBody(event, freightMutationSchema)
  const prisma = usePrisma()

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
  const year = Number(body.serviceDate.slice(0, 4))

  try {
    return await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${`freight:${workshopId}:${year}`}, 0::bigint))::text AS "lockResult"
      `
      if (references.sourceRecordId) {
        const duplicate = await transaction.freight.findFirst({
          where: { source: references.source, sourceRecordId: references.sourceRecordId },
          select: { id: true }
        })
        if (duplicate) throw duplicateNexoRecordError()
      }

      const existing = await transaction.freight.findMany({
        where: { workshopId, freightNumber: { startsWith: freightNumberNamespace(year) } },
        select: { freightNumber: true }
      })
      const freightNumber = formatFreightNumber(year, getNextFreightSequence(existing.map(item => item.freightNumber), year))

      const freight = await transaction.freight.create({
        data: {
          workshopId,
          customerId: customer.id,
          freightNumber,
          ...references,
          origin: body.origin,
          destination: body.destination,
          amount: body.amount,
          currency: body.currency,
          exchangeRate,
          amountMxn,
          serviceDate: new Date(`${body.serviceDate}T00:00:00Z`),
          createdById: context.profile.id
        }
      })
      await recordAudit(transaction, context, {
        entityType: 'freight',
        entityId: freight.id,
        action: 'create',
        workshopId,
        snapshot: freight,
        effectiveDate: freight.serviceDate
      })
      return { id: freight.id, freightNumber: freight.freightNumber }
    })
  } catch (error) {
    if (isDuplicateNexoRecord(error)) throw duplicateNexoRecordError()
    throw error
  }
})
