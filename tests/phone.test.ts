import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isIdentifyingPhone,
  normalizePhone,
  UNKNOWN_PHONE
} from '../server/utils/phone'

test('normaliza teléfonos a diez dígitos', () => {
  assert.equal(normalizePhone('(664) 123-4567'), '6641234567')
  assert.equal(normalizePhone('6641234567'), '6641234567')
  assert.equal(normalizePhone(''), '')
  assert.equal(normalizePhone('+52 (664) 123-4567'), '5266412345')
})

test('no usa el teléfono desconocido para identificar clientes duplicados', () => {
  assert.equal(UNKNOWN_PHONE, '0000000000')
  assert.equal(isIdentifyingPhone(UNKNOWN_PHONE), false)
  assert.equal(isIdentifyingPhone(normalizePhone('(000) 000-0000')), false)
  assert.equal(isIdentifyingPhone('6641234567'), true)
})
