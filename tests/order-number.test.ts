import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatOrderNumber,
  getNextOrderNumberSequence,
  getOrderNumberPrefix
} from '../shared/order-number'

test('usa OTP para las órdenes del taller de carrocería', () => {
  assert.equal(formatOrderNumber('BODY_SHOP', 2026, 1), 'OTP-2026-0001')
})

test('usa OTM para las órdenes del taller mecánico', () => {
  assert.equal(formatOrderNumber('MECHANICAL', 2026, 42), 'OTM-2026-0042')
})

test('mantiene OT como respaldo para otros tipos de taller', () => {
  assert.equal(getOrderNumberPrefix('PAINT_STORE'), 'OT')
})

test('no recorta consecutivos de más de cuatro dígitos', () => {
  assert.equal(formatOrderNumber('MECHANICAL', 2026, 10_000), 'OTM-2026-10000')
})

test('continúa después del consecutivo más alto aunque existan huecos', () => {
  assert.equal(
    getNextOrderNumberSequence(
      ['OTP-2026-0001', 'OTP-2026-0003', 'OTP-2026-0008'],
      'BODY_SHOP',
      2026
    ),
    9
  )
})

test('ignora folios de otros talleres, años o formatos', () => {
  assert.equal(
    getNextOrderNumberSequence(
      ['OTP-2025-0099', 'OTM-2026-0080', 'OTP-2026-DEMO', 'OTP-2026-0004'],
      'BODY_SHOP',
      2026
    ),
    5
  )
})
