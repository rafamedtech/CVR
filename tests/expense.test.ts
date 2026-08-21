import assert from 'node:assert/strict'
import test from 'node:test'
import { expenseMutationSchema } from '../shared/expense'

const baseExpense = {
  category: 'OTHER' as const,
  method: 'CASH' as const,
  description: 'Material de limpieza',
  vendor: '',
  amount: 250,
  expenseDate: '2026-08-21',
  notes: ''
}

test('acepta un gasto directo del taller sin orden', () => {
  const result = expenseMutationSchema.safeParse({
    ...baseExpense,
    assignmentType: 'WORKSHOP',
    orderId: ''
  })

  assert.equal(result.success, true)
})

test('acepta un gasto asignado a una orden válida', () => {
  const result = expenseMutationSchema.safeParse({
    ...baseExpense,
    assignmentType: 'ORDER',
    orderId: '11111111-1111-4111-8111-111111111111'
  })

  assert.equal(result.success, true)
})

test('rechaza una asignación a orden sin seleccionar la orden', () => {
  const result = expenseMutationSchema.safeParse({
    ...baseExpense,
    assignmentType: 'ORDER',
    orderId: ''
  })

  assert.equal(result.success, false)
  assert.equal(result.error?.issues[0]?.path.join('.'), 'orderId')
})

test('rechaza un método de pago inválido', () => {
  const result = expenseMutationSchema.safeParse({
    ...baseExpense,
    method: 'BITCOIN',
    assignmentType: 'WORKSHOP',
    orderId: ''
  })

  assert.equal(result.success, false)
  assert.equal(result.error?.issues[0]?.path.join('.'), 'method')
})
