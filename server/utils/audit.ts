import type { Prisma } from '../../generated/prisma/client'
import type { AuditAction } from '../../shared/audit'
import type { CrmRequestContext } from './auth'

export interface AuditInput {
  entityType: 'payment' | 'expense' | 'service_order' | 'order_item'
  entityId: string
  action: AuditAction
  workshopId?: string | null
  snapshot: unknown
  changes?: unknown
  reason?: string | null
  effectiveDate?: Date | null
  source?: { type: string, id: string } | null
}

function json(value: unknown): Prisma.InputJsonValue {
  // Decimal y Date se serializan como texto para conservar la foto exacta.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

const AUDITED_TABLES = {
  payment: 'payments',
  expense: 'expenses',
  service_order: 'service_orders',
  order_item: 'order_items'
} as const satisfies Record<AuditInput['entityType'], string>

/**
 * Bloquea la fila (SELECT … FOR UPDATE) y la relee dentro de la transacción,
 * para que la foto «antes» de la bitácora sea el estado que realmente se modifica.
 */
export async function lockForAudit<T>(
  tx: Prisma.TransactionClient,
  entityType: AuditInput['entityType'],
  id: string,
  read: () => Promise<T | null>
): Promise<T> {
  // La tabla sale de una lista fija; el id va como parámetro.
  await tx.$queryRawUnsafe(`SELECT 1 FROM "${AUDITED_TABLES[entityType]}" WHERE "id" = $1::uuid FOR UPDATE`, id)
  const row = await read()
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'El registro ya no existe. Recarga la información.' })
  }
  return row
}

export function auditActorRole(context: CrmRequestContext) {
  if (context.isReadOnly) return 'READ_ONLY'
  if (context.isSuperAdmin) return 'SUPER_ADMIN'
  return currentWorkshopRole(context) ?? 'NONE'
}

/**
 * Registra el cambio en `audit_events` dentro de la transacción que lo produce.
 * La tabla es de solo inserción (trigger en la migración 20261127230000_audit_events).
 */
export async function recordAudit(tx: Prisma.TransactionClient, context: CrmRequestContext, input: AuditInput) {
  const switchedFromId = context.userSwitch && context.userSwitch.id !== context.profile.id
    ? context.userSwitch.id
    : null

  await tx.auditEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      workshopId: input.workshopId ?? null,
      actorId: context.profile.id,
      actorEmail: context.profile.email,
      actorRole: auditActorRole(context),
      switchedFromId,
      reason: input.reason?.trim() || null,
      effectiveDate: input.effectiveDate ?? null,
      sourceType: input.source?.type ?? null,
      sourceId: input.source?.id ?? null,
      snapshot: json(input.snapshot),
      ...(input.changes === undefined ? {} : { changes: json(input.changes) })
    }
  })
}
