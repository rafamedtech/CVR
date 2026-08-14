import assert from 'node:assert/strict'
import test from 'node:test'
import {
  convertFromMxn,
  convertToMxn,
  normalizeExchangeRate
} from '../shared/currency'

test('convierte dólares a la moneda contable MXN con el tipo histórico', () => {
  assert.equal(convertToMxn(100, 'USD', 18.5), 1850)
  assert.equal(convertToMxn(10.99, 'USD', 18.7345), 205.89)
})

test('mantiene los pesos sin conversión y fuerza tipo de cambio uno', () => {
  assert.equal(normalizeExchangeRate('MXN', 18.5), 1)
  assert.equal(convertToMxn(123.45, 'MXN', 18.5), 123.45)
})

test('calcula el importe original desde un saldo en MXN', () => {
  assert.equal(convertFromMxn(1850, 'USD', 18.5), 100)
})
