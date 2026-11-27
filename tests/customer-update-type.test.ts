import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import type { ZodType } from 'zod'

const routeUrl = new URL('../server/api/customers/[id].patch.ts', import.meta.url)
const source = ts.transpileModule(readFileSync(routeUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText

const baseBody = {
  fullName: 'Proveedor de Pintura',
  phone: '6641234567',
  address: {
    address: 'Av. Revolución 100',
    city: { country_code: 'MX', state_code: '02', city_code: '02004' }
  }
}

type Handler = (event: { body: unknown }) => Promise<unknown>

function loadHandler(storedType: string, updates: Array<Record<string, unknown>>) {
  const exports: { default?: Handler } = {}
  runInNewContext(source, {
    exports,
    require: createRequire(routeUrl),
    defineEventHandler: (handler: Handler) => handler,
    requireCrmUser: async () => ({ isSuperAdmin: false, isReadOnly: false }),
    requireWorkshopRole: () => undefined,
    requireSelectedWorkshop: () => undefined,
    getRouterParam: () => 'customer-1',
    createError: (input: { statusMessage: string }) => Object.assign(new Error(input.statusMessage), input),
    readCrmBody: async (event: { body: unknown }, schema: ZodType) => schema.parse(event.body),
    customerAccessWhere: () => ({}),
    customerAddressData: () => ({}),
    serializeCustomer: (customer: unknown) => customer,
    usePrisma: () => ({
      customer: {
        findFirst: async (query: { where: { id: string | { not: string } } }) =>
          typeof query.where.id === 'string' ? { id: 'customer-1' } : null,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data)
          return { id: 'customer-1', type: storedType, ...data }
        }
      }
    })
  })
  return exports.default!
}

test('editar un cliente sin enviar el tipo conserva el tipo guardado', async () => {
  const updates: Array<Record<string, unknown>> = []
  const result = await loadHandler('SUPPLIER', updates)({ body: baseBody }) as { type: string }
  assert.equal('type' in updates[0]!, false)
  assert.equal(result.type, 'SUPPLIER')
})

test('editar un cliente con tipo lo actualiza', async () => {
  const updates: Array<Record<string, unknown>> = []
  await loadHandler('SUPPLIER', updates)({ body: { ...baseBody, type: 'OTHER' } })
  assert.equal(updates[0]!.type, 'OTHER')
})

test('un tipo fuera del catálogo se rechaza sin escribir', async () => {
  const updates: Array<Record<string, unknown>> = []
  await assert.rejects(loadHandler('SUPPLIER', updates)({ body: { ...baseBody, type: 'VIP' } }))
  assert.equal(updates.length, 0)
})
