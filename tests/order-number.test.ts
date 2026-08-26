import assert from 'node:assert/strict'
import test from 'node:test'
import { formatOrderNumber, getOrderNumberPrefix } from '../shared/order-number'

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
