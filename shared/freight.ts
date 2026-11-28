import { isPositiveAmount } from '@rafamedtech/nuxt-shared/utils'
import { z } from 'zod'

export const FREIGHT_STATUSES = ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const
export const FREIGHT_SOURCES = ['MANUAL', 'NEXO'] as const

export type FreightStatus = typeof FREIGHT_STATUSES[number]
export type FreightSource = typeof FREIGHT_SOURCES[number]

const FREIGHT_NUMBER_PREFIX = 'FLT'
/** Con TC ≤ 1000, el importe en MXN cabe en Decimal(12,2). */
const FREIGHT_AMOUNT_MAX = 9_000_000

/** Transiciones permitidas. Entregado y cancelado son estados finales. */
const freightTransitions: Record<FreightStatus, readonly FreightStatus[]> = {
  SCHEDULED: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
}

export function canTransitionFreight(from: FreightStatus, to: FreightStatus) {
  return freightTransitions[from].includes(to)
}

export function nextFreightStatuses(from: FreightStatus) {
  return freightTransitions[from]
}

export function formatFreightNumber(year: number, sequence: number) {
  return `${FREIGHT_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, '0')}`
}

export function freightNumberNamespace(year: number) {
  return `${FREIGHT_NUMBER_PREFIX}-${year}-`
}

export function getNextFreightSequence(freightNumbers: Iterable<string>, year: number) {
  const namespace = freightNumberNamespace(year)
  let highest = 0
  for (const freightNumber of freightNumbers) {
    if (!freightNumber.startsWith(namespace)) continue
    const text = freightNumber.slice(namespace.length)
    if (!/^\d+$/.test(text)) continue
    const sequence = Number(text)
    if (Number.isSafeInteger(sequence)) highest = Math.max(highest, sequence)
  }
  return highest + 1
}

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable()
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona la fecha del servicio.')

export const freightMutationSchema = z.object({
  customerId: z.uuid('Selecciona un cliente.'),
  source: z.enum(FREIGHT_SOURCES).default('MANUAL'),
  sourceRecordId: optionalText(100),
  sourceFolio: optionalText(100),
  sourceUrl: z.union([z.url({ protocol: /^https$/, error: 'El enlace debe empezar con https://' }), z.literal('')]).optional().nullable(),
  serviceReference: optionalText(120),
  origin: z.string().trim().min(2, 'Escribe el origen.').max(200),
  destination: z.string().trim().min(2, 'Escribe el destino.').max(200),
  amount: z.coerce.number().refine(isPositiveAmount, 'El importe debe ser mayor a cero.').max(FREIGHT_AMOUNT_MAX, 'El importe es demasiado alto.'),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  exchangeRate: z.coerce.number().refine(isPositiveAmount, 'El tipo de cambio debe ser mayor a cero.').max(1000, 'El tipo de cambio no es válido.').default(1),
  serviceDate: dateKey,
  deliveryTicketRef: optionalText(120),
  invoiceSeries: optionalText(25),
  invoiceFolio: optionalText(40),
  invoiceUuid: z.union([
    z.string().trim().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'El UUID fiscal no es válido.'),
    z.literal('')
  ]).optional().nullable(),
  notes: optionalText(1000)
}).superRefine((freight, context) => {
  if (freight.source === 'NEXO' && !freight.sourceRecordId) {
    context.addIssue({ code: 'custom', path: ['sourceRecordId'], message: 'Escribe el ID del expediente de Nexo.' })
  }
})

export const freightStatusSchema = z.object({
  status: z.enum(FREIGHT_STATUSES),
  /** Instante del evento (ISO con desfase); si falta, se usa la hora del registro. */
  occurredAt: z.string().datetime({ offset: true }).optional().nullable(),
  deliveryTicketRef: optionalText(120),
  reason: optionalText(500)
}).superRefine((input, context) => {
  if (input.status === 'CANCELLED' && (input.reason ?? '').length < 3) {
    context.addIssue({ code: 'custom', path: ['reason'], message: 'Escribe el motivo de la cancelación.' })
  }
})

export type FreightMutation = z.output<typeof freightMutationSchema>
export type FreightStatusChange = z.output<typeof freightStatusSchema>

/** Datos normalizados para Prisma: cadenas vacías como null y origen manual sin datos de Nexo. */
export function normalizeFreightReferences(input: FreightMutation) {
  const nexo = input.source === 'NEXO'
  return {
    source: input.source,
    sourceRecordId: nexo ? input.sourceRecordId || null : null,
    sourceFolio: nexo ? input.sourceFolio || null : null,
    sourceUrl: nexo ? input.sourceUrl || null : null,
    serviceReference: input.serviceReference || null,
    deliveryTicketRef: input.deliveryTicketRef || null,
    invoiceSeries: input.invoiceSeries || null,
    invoiceFolio: input.invoiceFolio || null,
    invoiceUuid: input.invoiceUuid ? input.invoiceUuid.toLowerCase() : null,
    notes: input.notes || null
  }
}
