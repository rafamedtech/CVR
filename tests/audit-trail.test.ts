import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as zod from 'zod'
import * as auditSchema from '../shared/audit'
import * as paymentStatus from '../shared/payment-status'
import type { CrmRequestContext } from '../server/utils/auth'

type Handler = (event: object) => Promise<unknown>
type Context = Partial<CrmRequestContext> & { role?: string }

function httpError({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) {
  return Object.assign(new Error(statusMessage), { statusCode })
}

function load(path: string, globals: Record<string, unknown>) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  const exports: Record<string, unknown> = {}
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      if (name.endsWith('shared/audit')) return auditSchema
      if (name.endsWith('shared/payment-status')) return paymentStatus
      if (name === 'zod') return zod
      throw new Error(`Importación inesperada: ${name}`)
    },
    defineEventHandler: (handler: Handler) => handler,
    createError: httpError,
    ...globals
  })
  return exports
}

const plain = (value: unknown) => JSON.parse(JSON.stringify(value))
const workshopWhere = (context: Context) => context.workshopId ? { workshopId: context.workshopId } : {}
const selected = (context: Context) => {
  if (!context.workshopId) throw httpError({ statusCode: 400, statusMessage: 'Selecciona un taller.' })
  return context.workshopId
}
const superAdmin = { workshopId: 'carroceria', isSuperAdmin: true, isReadOnly: false, profile: { id: 'admin', email: 'admin@cvr.test' } }
const cashier = { workshopId: 'carroceria', isSuperAdmin: false, isReadOnly: false, role: 'CASHIER', profile: { id: 'cajero', email: 'caja@cvr.test' } }

function harness(context: Context, body: unknown, rows: { payment?: object | null, expense?: object | null }, params: Record<string, string> = { id: 'order-1', paymentId: 'payment-1' }) {
  const calls: string[] = []
  const queries: Array<{ model: string, where: unknown }> = []
  const audits: Array<Record<string, unknown>> = []
  const transaction = {
    payment: {
      // findUnique sin include: la relación order no viene en la foto.
      findUnique: async () => {
        if (!rows.payment) return null
        const { order: _order, ...payment } = rows.payment as Record<string, unknown>
        return payment
      },
      delete: async () => {
        calls.push('payment.delete')
        return rows.payment
      },
      findMany: async () => []
    },
    serviceOrder: { update: async () => calls.push('order.update') },
    expense: {
      findUnique: async () => rows.expense,
      deleteMany: async ({ where }: { where: unknown }) => {
        calls.push('expense.delete')
        queries.push({ model: 'expense.deleteMany', where })
        return { count: 1 }
      }
    }
  }
  const prisma = {
    payment: {
      findFirst: async ({ where }: { where: unknown }) => {
        queries.push({ model: 'payment', where })
        return rows.payment ?? null
      }
    },
    expense: {
      findFirst: async ({ where }: { where: unknown }) => {
        queries.push({ model: 'expense', where })
        return rows.expense ?? null
      }
    },
    $transaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction)
  }
  const globals = {
    requireCrmUser: async () => context,
    requireSuperAdmin: (ctx: Context) => {
      if (!ctx.isSuperAdmin || ctx.isReadOnly) throw httpError({ statusCode: 403, statusMessage: 'Sólo administradores.' })
    },
    requireWorkshopRole: (ctx: Context, roles: string[]) => {
      if (ctx.isReadOnly) throw httpError({ statusCode: 403, statusMessage: 'Sólo lectura.' })
      if (!ctx.isSuperAdmin && !roles.includes(ctx.role ?? '')) throw httpError({ statusCode: 403, statusMessage: 'Sin permiso.' })
    },
    requireSelectedWorkshop: selected,
    workshopWhere,
    expenseAccessWhere: (ctx: Context) => ctx.isSuperAdmin ? {} : { workshopId: selected(ctx) },
    expenseAuditSource: (row: { orderId: string | null, freightId?: string | null }) => row.orderId
      ? { type: 'service_order', id: row.orderId }
      : row.freightId ? { type: 'freight', id: row.freightId } : null,
    getRouterParam: (_event: object, name: string) => params[name],
    readCrmBody: async (_event: object, schema: { safeParse: (value: unknown) => { success: boolean, data?: unknown } }) => {
      const result = schema.safeParse(body)
      if (!result.success) throw httpError({ statusCode: 400, statusMessage: 'Motivo inválido.' })
      return result.data
    },
    usePrisma: () => prisma,
    lockForAudit: async (_tx: object, entityType: string, id: string, read: () => Promise<unknown>) => {
      calls.push(`lock ${entityType}:${id}`)
      return read()
    },
    recordAudit: async (_tx: object, ctx: Context, input: Record<string, unknown>) => {
      calls.push('audit')
      audits.push({ ...input, actor: ctx.profile?.email })
    }
  }
  return { globals, calls, queries, audits }
}

const payment = { id: 'payment-1', orderId: 'order-1', paidAt: new Date('2026-11-20T18:00:00Z'), amountMxn: 500, order: { workshopId: 'carroceria', total: 1000 } }
const expense = { id: 'expense-1', workshopId: 'carroceria', orderId: null, expenseDate: new Date('2026-11-21T00:00:00Z') }

test('eliminar un pago exige motivo y no toca la base sin él', async () => {
  for (const body of [undefined, {}, { reason: ' ' }, { reason: 'no' }]) {
    const { globals, calls } = harness(superAdmin, body, { payment })
    const route = load('../server/api/orders/[id]/payments/[paymentId].delete.ts', globals).default as Handler
    await assert.rejects(route({}), { statusCode: 400 })
    assert.deepEqual(calls, [])
  }
})

test('eliminar un pago guarda la foto con motivo antes de borrarlo', async () => {
  const { globals, calls, queries, audits } = harness(superAdmin, { reason: 'Capturado dos veces' }, { payment })
  const route = load('../server/api/orders/[id]/payments/[paymentId].delete.ts', globals).default as Handler
  await route({})
  assert.deepEqual(calls, ['lock payment:payment-1', 'audit', 'payment.delete', 'order.update'])
  assert.deepEqual(plain(queries[0]), { model: 'payment', where: { id: 'payment-1', orderId: 'order-1', order: { workshopId: 'carroceria' } } })
  assert.equal(audits[0]!.entityType, 'payment')
  assert.equal(audits[0]!.action, 'delete')
  assert.equal(audits[0]!.reason, 'Capturado dos veces')
  assert.equal(audits[0]!.workshopId, 'carroceria')
  assert.equal(audits[0]!.actor, 'admin@cvr.test')
  assert.deepEqual(plain(audits[0]!.source), { type: 'service_order', id: 'order-1' })
  assert.equal('order' in (audits[0]!.snapshot as object), false)
})

test('un pago de otro taller no se encuentra ni se audita', async () => {
  const { globals, calls } = harness({ ...superAdmin, workshopId: 'mecanica' }, { reason: 'Prueba cruzada' }, { payment: null })
  const route = load('../server/api/orders/[id]/payments/[paymentId].delete.ts', globals).default as Handler
  await assert.rejects(route({}), { statusCode: 404 })
  assert.deepEqual(calls, [])
})

test('cajero y solo lectura no eliminan pagos', async () => {
  for (const context of [cashier, { ...superAdmin, isReadOnly: true }]) {
    const { globals, calls } = harness(context, { reason: 'Sin permiso' }, { payment })
    const route = load('../server/api/orders/[id]/payments/[paymentId].delete.ts', globals).default as Handler
    await assert.rejects(route({}), { statusCode: 403 })
    assert.deepEqual(calls, [])
  }
})

test('eliminar un gasto exige motivo, filtra por taller y audita antes de borrar', async () => {
  const expenseParams = { id: 'expense-1' }
  const missing = harness(cashier, {}, { expense }, expenseParams)
  await assert.rejects((load('../server/api/expenses/[id].delete.ts', missing.globals).default as Handler)({}), { statusCode: 400 })
  assert.deepEqual(missing.calls, [])

  const { globals, calls, queries, audits } = harness(cashier, { reason: 'Gasto de otro mes' }, { expense }, expenseParams)
  await (load('../server/api/expenses/[id].delete.ts', globals).default as Handler)({})
  assert.deepEqual(calls, ['lock expense:expense-1', 'audit', 'expense.delete'])
  assert.deepEqual(plain(queries.map(query => query.where)), [
    { id: 'expense-1', workshopId: 'carroceria' },
    { id: 'expense-1', workshopId: 'carroceria' }
  ])
  assert.equal(audits[0]!.reason, 'Gasto de otro mes')
  assert.equal(audits[0]!.actor, 'caja@cvr.test')
})

test('un gasto de otro taller no se encuentra ni se audita', async () => {
  const { globals, calls } = harness({ ...cashier, workshopId: 'mecanica' }, { reason: 'Prueba cruzada' }, { expense: null }, { id: 'expense-1' })
  await assert.rejects((load('../server/api/expenses/[id].delete.ts', globals).default as Handler)({}), { statusCode: 404 })
  assert.deepEqual(calls, [])
})

test('asesor, técnico y solo lectura no eliminan gastos', async () => {
  for (const context of [{ ...cashier, role: 'ADVISOR' }, { ...cashier, role: 'TECHNICIAN' }, { ...cashier, isReadOnly: true }]) {
    const { globals, calls } = harness(context, { reason: 'Sin permiso' }, { expense }, { id: 'expense-1' })
    await assert.rejects((load('../server/api/expenses/[id].delete.ts', globals).default as Handler)({}), { statusCode: 403 })
    assert.deepEqual(calls, [])
  }
})

test('recordAudit guarda actor, rol, cambio de usuario y foto serializada', async () => {
  const created: Array<{ data: Record<string, unknown> }> = []
  const { recordAudit } = load('../server/utils/audit.ts', {
    currentWorkshopRole: (context: Context) => context.role ?? null
  }) as { recordAudit: (tx: object, context: object, input: object) => Promise<void> }
  const tx = { auditEvent: { create: async (args: { data: Record<string, unknown> }) => created.push(args) } }

  await recordAudit(tx, { ...cashier, userSwitch: { id: 'admin', fullName: 'Admin' } }, {
    entityType: 'expense', entityId: 'expense-1', action: 'update', snapshot: { amount: { toJSON: () => '10.50' } }, reason: '  ajuste  '
  })
  await recordAudit(tx, { ...superAdmin, userSwitch: { id: 'admin', fullName: 'Admin' } }, {
    entityType: 'payment', entityId: 'payment-1', action: 'create', snapshot: {}
  })
  await recordAudit(tx, { ...superAdmin, isSuperAdmin: false, isReadOnly: true }, {
    entityType: 'payment', entityId: 'payment-1', action: 'create', snapshot: {}
  })

  assert.equal(created[0]!.data.actorRole, 'CASHIER')
  assert.equal(created[0]!.data.switchedFromId, 'admin')
  assert.equal(created[0]!.data.reason, 'ajuste')
  assert.deepEqual(plain(created[0]!.data.snapshot), { amount: '10.50' })
  assert.equal(created[1]!.data.actorRole, 'SUPER_ADMIN')
  assert.equal(created[1]!.data.switchedFromId, null)
  assert.equal(created[2]!.data.actorRole, 'READ_ONLY')
})

test('el historial solo lo consultan administradores generales y consulta global, por taller seleccionado', async () => {
  const where: unknown[] = []
  const globals = (context: Context) => ({
    requireCrmUser: async () => context,
    requireGlobalReadAccess: (ctx: Context) => {
      if (!ctx.isSuperAdmin && !ctx.isReadOnly) throw httpError({ statusCode: 403, statusMessage: 'Sin acceso global.' })
    },
    getQuery: () => ({ orderId: '00000000-0000-4000-8000-000000000001' }),
    usePrisma: () => ({ auditEvent: { findMany: async (args: { where: unknown }) => {
      where.push(args.where)
      return []
    } } })
  })
  await assert.rejects((load('../server/api/audit.get.ts', globals(cashier)).default as Handler)({}), { statusCode: 403 })
  await (load('../server/api/audit.get.ts', globals(superAdmin)).default as Handler)({})
  await (load('../server/api/audit.get.ts', globals({ ...superAdmin, isSuperAdmin: false, isReadOnly: true, workshopId: null })).default as Handler)({})
  const orderId = '00000000-0000-4000-8000-000000000001'
  const scope = { OR: [{ entityType: 'service_order', entityId: orderId }, { sourceType: 'service_order', sourceId: orderId }] }
  assert.deepEqual(JSON.parse(JSON.stringify(where)), [{ ...scope, workshopId: 'carroceria' }, scope])
})

test('lockForAudit bloquea la fila con parámetro y responde 404 si ya no existe', async () => {
  const { lockForAudit } = load('../server/utils/audit.ts', {}) as {
    lockForAudit: (tx: object, type: string, id: string, read: () => Promise<unknown>) => Promise<unknown>
  }
  const raw: unknown[][] = []
  const tx = { $queryRawUnsafe: async (...args: unknown[]) => raw.push(args) }
  assert.deepEqual(await lockForAudit(tx, 'payment', 'payment-1', async () => ({ id: 'payment-1' })), { id: 'payment-1' })
  assert.deepEqual(raw, [['SELECT 1 FROM "payments" WHERE "id" = $1::uuid FOR UPDATE', 'payment-1']])
  await assert.rejects(lockForAudit(tx, 'expense', 'expense-1', async () => null), { statusCode: 404 })
})

test('eliminar una orden rechaza un motivo inválido con 400', async () => {
  const context = superAdmin
  const route = load('../server/api/orders/[id].delete.ts', {
    requireCrmUser: async () => context,
    requireSuperAdmin: () => {},
    getRouterParam: () => 'order-1',
    readBody: async () => ({ reason: 'x'.repeat(501) }),
    usePrisma: () => { throw new Error('No debe consultar la base') }
  }).default as Handler
  await assert.rejects(route({}), { statusCode: 400 })
})
