import assert from 'node:assert/strict'
import test from 'node:test'
import { getOrderTaxRate } from '../shared/order-tax'

test('aplica IVA del 8% cuando la orden requiere factura', () => {
  assert.equal(getOrderTaxRate(true), 8)
})

test('no aplica IVA cuando la orden no requiere factura', () => {
  assert.equal(getOrderTaxRate(false), 0)
})
