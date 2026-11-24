import assert from 'node:assert/strict'
import test from 'node:test'
import {
  convertFromMxn,
  convertToMxn,
  normalizeExchangeRate
} from '../shared/currency'
import { paymentMutationSchema } from '../shared/payment'

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

test('conserva el redondeo histórico de conversiones en centavos positivos y negativos', () => {
  assert.equal(convertToMxn(0.01, 'USD', 18.5), 0.19)
  assert.equal(convertToMxn(-0.01, 'USD', 18.5), -0.18)
  assert.equal(convertFromMxn(-2.01, 'USD', 2), -1)
  assert.equal(convertToMxn(10.075, 'MXN', 1), 10.07)
})

test('rechaza tasas inválidas en el esquema y conserva el contrato de conversión directa', () => {
  for (const exchangeRate of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = paymentMutationSchema.safeParse({
      amount: 10, currency: 'USD', exchangeRate, method: 'CASH'
    })
    assert.equal(result.success, false)
    assert.equal(result.error?.issues[0]?.path[0], 'exchangeRate')
    assert.equal(convertToMxn(10, 'MXN', exchangeRate), 10)
  }

  assert.equal(convertToMxn(10, 'USD', 0), 0)
  assert.equal(convertFromMxn(10, 'USD', 0), Infinity)
  assert.equal(convertToMxn(10, 'USD', NaN), NaN)
})
