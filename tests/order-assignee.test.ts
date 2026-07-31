import assert from 'node:assert/strict'
import test from 'node:test'
import { getDefaultOrderAssigneeName } from '../shared/order-assignee'

test('asigna a Paulo por defecto en el taller de carrocería', () => {
  assert.equal(getDefaultOrderAssigneeName('BODY_SHOP'), 'Paulo')
})

test('asigna a Javier por defecto en el taller mecánico', () => {
  assert.equal(getDefaultOrderAssigneeName('MECHANICAL'), 'Javier')
})

test('no inventa un responsable para otros tipos de taller', () => {
  assert.equal(getDefaultOrderAssigneeName('PAINT_STORE'), null)
  assert.equal(getDefaultOrderAssigneeName(), null)
})
