import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as zod from 'zod'
import * as auditSchema from '../shared/audit'
import * as currency from '../shared/currency'
import * as freightSchema from '../shared/freight'
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
      if (name.endsWith('shared/currency')) return currency
      if (name.endsWith('shared/freight')) return freightSchema
      if (name === 'zod') return zod
      throw new Error(`Importación inesperada: ${name}`)
    },
    defineEventHandler: (handler: Handler) => handler,
    createError: httpError,
    ...globals
  })
  return exports
}

const transport = { id: 'transporte', type: 'TRANSPORT' }
const bodyShop = { id: 'carroceria', type: 'BODY_SHOP' }
const manager = { workshopId: 'transporte', selectedWorkshop: transport, isSuperAdmin: false, isReadOnly: false, role: 'MANAGER', profile: { id: 'gerente', email: 'gerente@cvr.test' } } as Context
const cashier = { ...manager, role: 'CASHIER' } as Context
const bodyManager = { ...manager, workshopId: 'carroceria', selectedWorkshop: bodyShop } as Context
const readOnly = { ...manager, workshopId: null, selectedWorkshop: null, isReadOnly: true, role: undefined } as Context

// Utilidades reales del servidor, con las guardas simuladas.
const guards = {
  currentWorkshopRole: (ctx: Context) => ctx.isReadOnly ? 'READ_ONLY' : ctx.isSuperAdmin ? null : ctx.role ?? null,
  requireSelectedWorkshop: (ctx: Context) => {
    if (!ctx.workshopId) throw httpError({ statusCode: 400, statusMessage: 'Selecciona un taller.' })
    return ctx.workshopId
  },
  requireGlobalReadAccess: (ctx: Context) => {
    if (!ctx.isSuperAdmin && !ctx.isReadOnly) throw httpError({ statusCode: 403, statusMessage: 'Sin acceso global.' })
  },
  requireWorkshopRole: (ctx: Context, roles: string[]) => {
    if (ctx.isReadOnly) throw httpError({ statusCode: 403, statusMessage: 'Sólo lectura.' })
    if (!ctx.isSuperAdmin && !roles.includes(ctx.role ?? '')) throw httpError({ statusCode: 403, statusMessage: 'Sin permiso.' })
  },
  requireSuperAdmin: (ctx: Context) => {
    if (!ctx.isSuperAdmin || ctx.isReadOnly) throw httpError({ statusCode: 403, statusMessage: 'Sólo administradores.' })
  }
}
const freightUtils = load('../server/utils/freights.ts', guards) as Record<string, (...args: never[]) => unknown>

function harness(context: Context, body: unknown, rows: { freight?: Record<string, unknown> | null, customer?: object | null, duplicate?: object | null } = {}) {
  const calls: string[] = []
  const audits: Array<Record<string, unknown>> = []
  const queries: unknown[] = []
  const transaction = {
    $queryRaw: async () => calls.push('lock'),
    freight: {
      findFirst: async () => rows.duplicate ?? null,
      findMany: async () => [{ freightNumber: 'FLT-2026-0004' }],
      findUnique: async () => rows.freight ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push('create')
        return { id: 'freight-new', ...data }
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push('update')
        return { ...rows.freight, ...data }
      }
    }
  }
  const prisma = {
    customer: { findFirst: async () => rows.customer === undefined ? { id: 'customer-1' } : rows.customer },
    freight: {
      findFirst: async ({ where }: { where: unknown }) => {
        queries.push(where)
        return rows.freight ?? null
      }
    },
    $transaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction)
  }
  const globals = {
    ...guards,
    ...freightUtils,
    requireCrmUser: async () => context,
    currentWorkshopRole: (ctx: Context) => ctx.isReadOnly ? 'READ_ONLY' : ctx.role ?? null,
    getRouterParam: () => '70000000-0000-4000-8000-000000000001',
    readCrmBody: async (_event: object, schema: { safeParse: (value: unknown) => { success: boolean, data?: unknown } }) => {
      const result = schema.safeParse(body)
      if (!result.success) throw httpError({ statusCode: 400, statusMessage: 'Datos inválidos.' })
      return result.data
    },
    usePrisma: () => prisma,
    lockForAudit: async (_tx: object, entityType: string, id: string, read: () => Promise<unknown>) => {
      calls.push(`lock ${entityType}`)
      const row = await read()
      if (!row) throw httpError({ statusCode: 404, statusMessage: 'No existe.' })
      return row
    },
    recordAudit: async (_tx: object, ctx: Context, input: Record<string, unknown>) => {
      calls.push('audit')
      audits.push({ ...input, actor: ctx.profile?.email })
    }
  }
  return { globals, calls, audits, queries }
}

const newFreight = {
  customerId: '20000000-0000-4000-8000-000000000009',
  source: 'NEXO',
  sourceRecordId: '6afe3391b85d5c52668966a9',
  sourceFolio: '66736',
  origin: 'Tijuana',
  destination: 'Mexicali',
  amount: 700,
  currency: 'USD',
  exchangeRate: 18,
  serviceDate: '2026-11-20'
}

test('el gerente de Transporte registra un flete en USD con folio consecutivo y bitácora', async () => {
  const { globals, calls, audits } = harness(manager, newFreight)
  const result = await (load('../server/api/freights/index.post.ts', globals).default as Handler)({}) as { freightNumber: string }
  assert.equal(result.freightNumber, 'FLT-2026-0005')
  assert.deepEqual(calls, ['lock', 'create', 'audit'])
  const snapshot = audits[0]!.snapshot as Record<string, unknown>
  assert.equal(snapshot.amountMxn, 12600)
  assert.equal(snapshot.currency, 'USD')
  assert.equal(snapshot.sourceRecordId, '6afe3391b85d5c52668966a9')
  assert.equal(audits[0]!.entityType, 'freight')
  assert.equal(audits[0]!.workshopId, 'transporte')
})

test('un expediente de Nexo repetido responde 409 sin crear el flete', async () => {
  const { globals, calls } = harness(manager, newFreight, { duplicate: { id: 'otro' } })
  await assert.rejects((load('../server/api/freights/index.post.ts', globals).default as Handler)({}), { statusCode: 409 })
  assert.equal(calls.includes('create'), false)
})

test('la violación del único en la base también responde 409', async () => {
  const { globals } = harness(manager, newFreight)
  const route = load('../server/api/freights/index.post.ts', {
    ...globals,
    usePrisma: () => ({
      customer: { findFirst: async () => ({ id: 'customer-1' }) },
      $transaction: async () => {
        throw Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['source', 'sourceRecordId'] } })
      }
    })
  }).default as Handler
  await assert.rejects(route({}), { statusCode: 409 })
})

test('solo gerentes de Transporte o super admin registran fletes', async () => {
  for (const [context, statusCode] of [[cashier, 403], [readOnly, 403], [bodyManager, 400]] as const) {
    const { globals, calls } = harness(context, newFreight)
    await assert.rejects((load('../server/api/freights/index.post.ts', globals).default as Handler)({}), { statusCode })
    assert.deepEqual(calls, [])
  }
})

test('un cliente fuera de Transporte no se puede usar', async () => {
  const { globals, calls } = harness(manager, newFreight, { customer: null })
  await assert.rejects((load('../server/api/freights/index.post.ts', globals).default as Handler)({}), { statusCode: 400 })
  assert.deepEqual(calls, [])
})

test('usuarios de otro negocio reciben 404 y la consulta global ve todo', async () => {
  const other = harness(bodyManager, null)
  await assert.rejects((load('../server/api/freights/[id].get.ts', other.globals).default as Handler)({}), { statusCode: 404 })
  assert.deepEqual(JSON.parse(JSON.stringify(other.queries[0])), { id: '70000000-0000-4000-8000-000000000001', workshopId: 'carroceria' })

  assert.deepEqual(JSON.parse(JSON.stringify(freightUtils.freightAccessWhere!(readOnly as never))), {})
  assert.throws(() => freightUtils.freightAccessWhere!({ ...manager, workshopId: null } as never), { statusCode: 403 })
})

const scheduled = { id: '70000000-0000-4000-8000-000000000001', workshopId: 'transporte', status: 'SCHEDULED', deliveryTicketRef: null }

test('confirmar la entrega guarda fecha, usuario, boleta y bitácora', async () => {
  const body = { status: 'DELIVERED', occurredAt: '2026-11-20T21:30:00.000Z', deliveryTicketRef: 'BOL-1' }
  const { globals, calls, audits } = harness(manager, body, { freight: scheduled })
  const result = await (load('../server/api/freights/[id]/status.post.ts', globals).default as Handler)({}) as { status: string }
  assert.equal(result.status, 'DELIVERED')
  assert.deepEqual(calls, ['lock freight', 'update', 'audit'])
  assert.equal(audits[0]!.action, 'status')
  assert.deepEqual(JSON.parse(JSON.stringify(audits[0]!.changes)), { status: 'DELIVERED', occurredAt: '2026-11-20T21:30:00.000Z' })
})

test('un flete entregado o cancelado no cambia de estado (409)', async () => {
  for (const status of ['DELIVERED', 'CANCELLED']) {
    const { globals, calls } = harness(manager, { status: 'IN_TRANSIT' }, { freight: { ...scheduled, status } })
    await assert.rejects((load('../server/api/freights/[id]/status.post.ts', globals).default as Handler)({}), { statusCode: 409 })
    assert.equal(calls.includes('update'), false)
  }
})

test('cajero y sólo lectura no cambian el estado', async () => {
  for (const context of [cashier, readOnly]) {
    const { globals, calls } = harness(context, { status: 'DELIVERED' }, { freight: scheduled })
    await assert.rejects((load('../server/api/freights/[id]/status.post.ts', globals).default as Handler)({}), { statusCode: 403 })
    assert.deepEqual(calls, [])
  }
})

test('eliminar exige super admin y motivo', async () => {
  const denied = harness(manager, { reason: 'Capturado dos veces' }, { freight: scheduled })
  await assert.rejects((load('../server/api/freights/[id].delete.ts', denied.globals).default as Handler)({}), { statusCode: 403 })
  const admin = { ...manager, isSuperAdmin: true } as Context
  const missing = harness(admin, {}, { freight: scheduled })
  await assert.rejects((load('../server/api/freights/[id].delete.ts', missing.globals).default as Handler)({}), { statusCode: 400 })
})

test('órdenes y vehículos no se registran en Transporte', () => {
  assert.throws(() => freightUtils.rejectTransportWorkshop!(manager as never), { statusCode: 400 })
  assert.doesNotThrow(() => freightUtils.rejectTransportWorkshop!(bodyManager as never))
})

test('asesor y técnico de Transporte no ven costos directos; gerente, caja y consulta sí', () => {
  const canView = freightUtils.canViewFreightCosts as (context: never) => boolean
  for (const role of ['ADVISOR', 'TECHNICIAN']) assert.equal(canView({ ...manager, role } as never), false)
  for (const context of [manager, cashier, readOnly, { ...manager, isSuperAdmin: true }]) assert.equal(canView(context as never), true)
  const row = {
    id: 'f', workshopId: 'transporte', workshop: { name: 'Transporte' }, freightNumber: 'FLT-2026-0001', source: 'MANUAL',
    sourceRecordId: null, sourceFolio: null, serviceReference: null, origin: 'A', destination: 'B', amount: 1, currency: 'MXN',
    exchangeRate: 1, amountMxn: 1, status: 'SCHEDULED', serviceDate: new Date('2026-11-20T00:00:00Z'), deliveredAt: null,
    createdAt: new Date(), customerId: 'c', customer: { fullName: 'Cliente' }, expenses: [{ amountMxn: 300 }, { amountMxn: 50 }]
  }
  const serialize = freightUtils.serializeFreightListItem as (row: never, canViewCosts: boolean) => { directCostsMxn: number | null }
  assert.equal(serialize(row as never, true).directCostsMxn, 350)
  assert.equal(serialize(row as never, false).directCostsMxn, null)
})

test('un id que no es UUID responde 404 sin consultar', async () => {
  const { globals, calls } = harness(manager, { status: 'DELIVERED' }, { freight: scheduled })
  const route = load('../server/api/freights/[id]/status.post.ts', { ...globals, getRouterParam: () => 'abc' }).default as Handler
  await assert.rejects(route({}), { statusCode: 404 })
  assert.deepEqual(calls, [])
})

test('la entrega no puede ser anterior a la salida', async () => {
  const inTransit = { ...scheduled, status: 'IN_TRANSIT', pickedUpAt: new Date('2026-11-20T20:00:00Z') }
  const { globals, calls } = harness(manager, { status: 'DELIVERED', occurredAt: '2026-11-20T19:00:00.000Z' }, { freight: inTransit })
  await assert.rejects((load('../server/api/freights/[id]/status.post.ts', globals).default as Handler)({}), { statusCode: 400 })
  assert.equal(calls.includes('update'), false)
})
