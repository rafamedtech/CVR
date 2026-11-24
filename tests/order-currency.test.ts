import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateLineItem, calculateOrderTotals } from '../server/utils/orders'
import { convertToMxn } from '../shared/currency'

test('calcula conceptos USD y conserva sus importes originales', () => {
  const item = calculateLineItem({
    type: 'PART',
    description: 'Refacción importada',
    currency: 'USD',
    exchangeRate: 18.5,
    quantity: 2,
    unitCost: 40,
    unitPrice: 100,
    discount: 10,
    taxRate: 8
  })

  assert.equal(item.unitPrice, 100)
  assert.equal(item.exchangeRate, 18.5)
  assert.equal(item.subtotal, 3515)
  assert.equal(item.taxTotal, 281.2)
  assert.equal(item.total, 3796.2)
  assert.equal(item.totalCost, 1480)
})

test('suma conceptos mixtos en MXN y convierte también el descuento', () => {
  const items = [
    calculateLineItem({
      type: 'SERVICE',
      description: 'Servicio nacional',
      currency: 'MXN',
      exchangeRate: 1,
      quantity: 1,
      unitCost: 100,
      unitPrice: 500,
      discount: 50,
      taxRate: 0
    }),
    calculateLineItem({
      type: 'PART',
      description: 'Parte importada',
      currency: 'USD',
      exchangeRate: 20,
      quantity: 1,
      unitCost: 20,
      unitPrice: 100,
      discount: 5,
      taxRate: 0
    })
  ]

  assert.deepEqual(calculateOrderTotals(items), {
    subtotal: 2350,
    discountTotal: 150,
    taxTotal: 0,
    total: 2350
  })
})

test('suma conceptos ya convertidos con redondeo por línea', () => {
  const item = calculateLineItem({
    type: 'PART',
    description: 'Refacción importada',
    currency: 'USD',
    exchangeRate: 18.5,
    quantity: 1,
    unitCost: 0,
    unitPrice: 0.01,
    taxRate: 0
  })

  assert.equal(item.total, 0.19)
  assert.equal(calculateOrderTotals([item, item]).total, 0.38)
  assert.equal(convertToMxn(0.02, 'USD', 18.5), 0.37)
})
