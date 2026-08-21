import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDateOnly } from '../shared/date'

test('conserva el día de una fecha de calendario almacenada en UTC', () => {
  assert.equal(formatDateOnly('2026-08-15T00:00:00.000Z'), '15 ago 2026')
})

test('conserva el día cuando recibe una fecha sin hora', () => {
  assert.equal(formatDateOnly('2026-08-15'), '15 ago 2026')
})

test('muestra un guión cuando no hay fecha', () => {
  assert.equal(formatDateOnly(null), '—')
})
