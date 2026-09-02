import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isIdentifyingPhone,
  normalizePhone,
  UNKNOWN_PHONE
} from '../server/utils/phone'

test('normaliza teléfonos a diez dígitos', () => {
  assert.equal(normalizePhone('(664) 123-4567'), '6641234567')
})

test('no usa el teléfono desconocido para identificar clientes duplicados', () => {
  assert.equal(UNKNOWN_PHONE, '0000000000')
  assert.equal(isIdentifyingPhone(UNKNOWN_PHONE), false)
  assert.equal(isIdentifyingPhone('6641234567'), true)
})
