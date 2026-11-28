import type { Prisma } from '../../generated/prisma/client'
import type { CrmRequestContext } from './auth'

/**
 * Alcance de lectura de fletes (CVR-03).
 * Con un negocio seleccionado solo se ven sus fletes: un usuario de Carrocería o
 * Mecánica no encuentra fletes de Transporte (404). Sin selección, solo la consulta global.
 */
export function freightAccessWhere(context: CrmRequestContext) {
  if (!context.workshopId) {
    requireGlobalReadAccess(context)
    return {}
  }
  return { workshopId: context.workshopId }
}

const UUID_PATTERN = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i

/** Id de la ruta validado como UUID; un id inválido responde 404 sin consultar la base. */
export function requireFreightId(id: string | undefined) {
  if (!id || !UUID_PATTERN.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el flete.' })
  }
  return id
}

/** Costos directos: mismos roles que ven gastos (CVR-02). Asesor y técnico no los ven. */
export function canViewFreightCosts(context: CrmRequestContext) {
  if (context.isSuperAdmin || context.isReadOnly) return true
  return ['MANAGER', 'CASHIER', 'READ_ONLY'].includes(currentWorkshopRole(context) ?? '')
}

/** Exige que el negocio seleccionado sea Transporte y devuelve su id. */
export function requireTransportWorkshop(context: CrmRequestContext) {
  const workshopId = requireSelectedWorkshop(context)
  if (context.selectedWorkshop?.type !== 'TRANSPORT') {
    throw createError({ statusCode: 400, statusMessage: 'Selecciona el negocio Transporte para registrar fletes.' })
  }
  return workshopId
}

/** Órdenes y vehículos no aplican a Transporte. */
export function rejectTransportWorkshop(context: CrmRequestContext) {
  if (context.selectedWorkshop?.type === 'TRANSPORT') {
    throw createError({ statusCode: 400, statusMessage: 'Transporte registra fletes, no órdenes de servicio.' })
  }
}

export async function resolveExpenseFreightId(freightId: string, workshopId: string) {
  const freight = await usePrisma().freight.findFirst({
    where: { id: freightId, workshopId },
    select: { id: true }
  })
  if (!freight) {
    throw createError({ statusCode: 404, statusMessage: 'El flete seleccionado no pertenece al negocio activo.' })
  }
  return freight.id
}

export const freightListSelect = {
  id: true,
  workshopId: true,
  freightNumber: true,
  source: true,
  sourceRecordId: true,
  sourceFolio: true,
  serviceReference: true,
  origin: true,
  destination: true,
  amount: true,
  currency: true,
  exchangeRate: true,
  amountMxn: true,
  status: true,
  serviceDate: true,
  deliveredAt: true,
  createdAt: true,
  customerId: true,
  customer: { select: { fullName: true } },
  workshop: { select: { name: true } },
  expenses: { select: { amountMxn: true } }
} satisfies Prisma.FreightSelect

type FreightListRow = Prisma.FreightGetPayload<{ select: typeof freightListSelect }>

export function serializeFreightListItem(freight: FreightListRow, canViewCosts: boolean) {
  return {
    id: freight.id,
    workshopId: freight.workshopId,
    workshopName: freight.workshop.name,
    freightNumber: freight.freightNumber,
    source: freight.source,
    sourceRecordId: freight.sourceRecordId,
    sourceFolio: freight.sourceFolio,
    serviceReference: freight.serviceReference,
    origin: freight.origin,
    destination: freight.destination,
    amount: Number(freight.amount),
    currency: freight.currency,
    exchangeRate: Number(freight.exchangeRate),
    amountMxn: Number(freight.amountMxn),
    directCostsMxn: canViewCosts ? freight.expenses.reduce((sum, expense) => sum + Number(expense.amountMxn), 0) : null,
    status: freight.status,
    serviceDate: freight.serviceDate.toISOString().slice(0, 10),
    deliveredAt: freight.deliveredAt?.toISOString() ?? null,
    createdAt: freight.createdAt.toISOString(),
    customerId: freight.customerId,
    customerName: freight.customer.fullName
  }
}

/** Detecta la violación del único (source, sourceRecordId): el expediente de Nexo ya está registrado. */
export function isDuplicateNexoRecord(error: unknown) {
  const prismaError = error as { code?: string, meta?: unknown } | null
  if (prismaError?.code !== 'P2002') return false
  // El adaptador pg informa el índice o los campos según la versión; ambos contienen sourceRecordId.
  return JSON.stringify(prismaError.meta ?? {}).includes('sourceRecordId')
}

export const duplicateNexoRecordError = () => createError({
  statusCode: 409,
  statusMessage: 'Ese expediente de Nexo ya está registrado en otro flete.'
})
