import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canTransitionFreight,
  formatFreightNumber,
  freightMutationSchema,
  freightStatusSchema,
  getNextFreightSequence,
  normalizeFreightReferences
} from '../shared/freight'
import { expenseMutationSchema } from '../shared/expense'

const base = {
  customerId: '20000000-0000-4000-8000-000000000009',
  origin: 'Tijuana, B.C.',
  destination: 'Mexicali, B.C.',
  amount: 700,
  currency: 'USD' as const,
  exchangeRate: 17.85,
  serviceDate: '2026-11-20'
}

test('registra un flete manual en MXN o USD', () => {
  for (const currency of ['MXN', 'USD'] as const) {
    const result = freightMutationSchema.safeParse({ ...base, currency })
    assert.equal(result.success, true)
  }
})

test('un flete de Nexo exige el ID del expediente', () => {
  const missing = freightMutationSchema.safeParse({ ...base, source: 'NEXO', sourceFolio: '66736' })
  assert.equal(missing.success, false)
  assert.equal(missing.error?.issues[0]?.path[0], 'sourceRecordId')
  assert.equal(freightMutationSchema.safeParse({ ...base, source: 'NEXO', sourceRecordId: '6afe3391b85d5c52668966a9' }).success, true)
})

test('rechaza importes no positivos, fechas inválidas, enlaces sin https y UUID fiscal mal formado', () => {
  assert.equal(freightMutationSchema.safeParse({ ...base, amount: 0 }).success, false)
  assert.equal(freightMutationSchema.safeParse({ ...base, serviceDate: '20/11/2026' }).success, false)
  assert.equal(freightMutationSchema.safeParse({ ...base, source: 'NEXO', sourceRecordId: 'x', sourceUrl: 'http://nexo.example' }).success, false)
  assert.equal(freightMutationSchema.safeParse({ ...base, invoiceUuid: 'SIDE17551' }).success, false)
})

test('un flete manual descarta los datos de Nexo y normaliza vacíos', () => {
  const parsed = freightMutationSchema.parse({
    ...base,
    sourceRecordId: 'restos',
    sourceFolio: 'restos',
    invoiceSeries: '',
    invoiceUuid: 'A1B2C3D4-0000-4000-8000-000000000001'
  })
  const references = normalizeFreightReferences(parsed)
  assert.equal(references.source, 'MANUAL')
  assert.equal(references.sourceRecordId, null)
  assert.equal(references.sourceFolio, null)
  assert.equal(references.invoiceSeries, null)
  assert.equal(references.invoiceUuid, 'a1b2c3d4-0000-4000-8000-000000000001')
})

test('entregado y cancelado son estados finales', () => {
  assert.equal(canTransitionFreight('SCHEDULED', 'IN_TRANSIT'), true)
  assert.equal(canTransitionFreight('SCHEDULED', 'DELIVERED'), true)
  assert.equal(canTransitionFreight('IN_TRANSIT', 'DELIVERED'), true)
  assert.equal(canTransitionFreight('IN_TRANSIT', 'SCHEDULED'), false)
  for (const to of ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const) {
    assert.equal(canTransitionFreight('DELIVERED', to), false)
    assert.equal(canTransitionFreight('CANCELLED', to), false)
  }
})

test('cancelar exige motivo; confirmar entrega no', () => {
  assert.equal(freightStatusSchema.safeParse({ status: 'CANCELLED' }).success, false)
  assert.equal(freightStatusSchema.safeParse({ status: 'CANCELLED', reason: 'Cliente canceló' }).success, true)
  assert.equal(freightStatusSchema.safeParse({ status: 'DELIVERED', occurredAt: '2026-11-20T21:30:00.000Z' }).success, true)
  assert.equal(freightStatusSchema.safeParse({ status: 'DELIVERED', occurredAt: '2026-11-20T13:30' }).success, false)
})

test('folio consecutivo por año', () => {
  assert.equal(formatFreightNumber(2026, 7), 'FLT-2026-0007')
  assert.equal(getNextFreightSequence(['FLT-2026-0002', 'FLT-2026-0010', 'FLT-2025-0099', 'FLT-2026-x'], 2026), 11)
  assert.equal(getNextFreightSequence([], 2026), 1)
})

test('un gasto de flete exige el flete y no admite orden', () => {
  const expense = {
    category: 'FUEL', method: 'CASH', description: 'Diésel', amount: 3150,
    currency: 'MXN', exchangeRate: 1, expenseDate: '2026-11-20', orderId: ''
  }
  assert.equal(expenseMutationSchema.safeParse({ ...expense, assignmentType: 'FREIGHT', freightId: '' }).success, false)
  assert.equal(expenseMutationSchema.safeParse({ ...expense, assignmentType: 'FREIGHT', freightId: base.customerId }).success, true)
  assert.equal(expenseMutationSchema.safeParse({ ...expense, assignmentType: 'WORKSHOP', freightId: base.customerId }).success, false)
})
