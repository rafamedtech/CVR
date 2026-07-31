import assert from 'node:assert/strict'
import test from 'node:test'
import { calculatePaymentStatus } from '../shared/payment-status'

test('marca una orden sin movimientos como Sin pagos', () => {
  assert.equal(calculatePaymentStatus(1000, 0, 0), 'NO_PAYMENTS')
})

test('marca una orden con pago parcial como Abonado', () => {
  assert.equal(calculatePaymentStatus(1000, 250, 1), 'PARTIALLY_PAID')
  assert.equal(calculatePaymentStatus(1000, 999.99, 1), 'PARTIALLY_PAID')
})

test('marca una orden sin saldo pendiente como Pagado', () => {
  assert.equal(calculatePaymentStatus(1000, 1000, 2), 'PAID')
})

test('conserva Sin pagos para una orden de total cero sin movimientos', () => {
  assert.equal(calculatePaymentStatus(0, 0, 0), 'NO_PAYMENTS')
})
