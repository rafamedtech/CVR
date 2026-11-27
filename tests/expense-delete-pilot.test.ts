import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import * as dates from '@internationalized/date'
import ts from 'typescript'
import * as vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import * as auditSchema from '../shared/audit'
import * as expenseSchema from '../shared/expense'
import * as dateFormat from '../shared/date'

interface ExpenseSetup {
  deleteConfirmationOpen: vue.Ref<boolean>
  deleteError: vue.Ref<string>
  deleteReason: vue.Ref<string>
  openDeleteConfirmation: () => void
  removeExpense: () => Promise<void>
  restoreDeleteFocus: () => void
}

function fixture(request: () => Promise<unknown>) {
  const file = new URL('../app/components/expenses/ExpenseFormModal.vue', import.meta.url)
  const sfc = parse(readFileSync(file, 'utf8'), { filename: file.pathname })
  const { content } = compileScript(sfc.descriptor, { id: 'expense-modal' })
  const { outputText } = ts.transpileModule(content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  })
  const open = vue.ref(true)
  const calls: string[] = []
  const events: string[] = []
  const focus: string[] = []
  const exports: { default?: { setup: (props: object, context: object) => ExpenseSetup } } = {}
  const modules: Record<string, unknown> = {
    'vue': { ...vue, useModel: () => open },
    '@internationalized/date': dates,
    '#shared/audit': auditSchema,
    '#shared/date': dateFormat,
    '#shared/expense': expenseSchema,
    '~/utils/datetime': { DEFAULT_WORKSHOP_TIME_ZONE: 'America/Tijuana' },
    '~/utils/crm': { currencyOptions: [{ label: 'Pesos', value: 'MXN' }] }
  }
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      if (name in modules) return modules[name]
      throw new Error(`Importación inesperada: ${name}`)
    },
    computed: vue.computed,
    reactive: vue.reactive,
    shallowRef: vue.shallowRef,
    watch: vue.watch,
    useToast: () => ({ add: () => {} }),
    useCrmSession: () => ({
      isSuperAdmin: vue.ref(false),
      activeWorkshop: vue.ref(null),
      canRecordExpenses: vue.ref(true),
      workshopTimeZone: () => undefined
    }),
    useTemplateRef: (name: string) => vue.shallowRef(name === 'deleteButton'
      ? { $el: { focus: () => focus.push(name) } }
      : undefined),
    expenseCategoryLabels: { OTHER: 'Otro' },
    paymentMethodLabels: { CASH: 'Efectivo' },
    getApiErrorMessage: (error: Error) => error.message,
    $fetch: (url: string, options: { method: string, body?: { reason?: string } }) => {
      calls.push(`${options.method} ${url}${options.body?.reason ? ` · ${options.body.reason}` : ''}`)
      return request()
    }
  })
  const expense = {
    id: 'test-expense', description: 'Gasto de prueba', expenseDate: '2026-11-20', workshopId: 'test-workshop',
    currency: 'MXN', amount: 15, method: 'CASH', category: 'OTHER'
  }
  const setup = exports.default!.setup({ expense }, {
    expose: () => {},
    emit: (event: string) => events.push(event)
  })
  return { setup, open, calls, events, focus }
}

test('cancelar la confirmación vuelve al botón sin eliminar el gasto', () => {
  const { setup, open, calls, focus } = fixture(async () => {})
  setup.openDeleteConfirmation()
  setup.deleteConfirmationOpen.value = false
  setup.restoreDeleteFocus()
  assert.equal(open.value, true)
  assert.deepEqual(calls, [])
  assert.deepEqual(focus, ['deleteButton'])
})

test('eliminar bloquea duplicados, conserva el fallo y actualiza al reintentar', async () => {
  const first = Promise.withResolvers<undefined>()
  let attempts = 0
  const { setup, open, calls, events } = fixture(async () => {
    if (++attempts === 1) await first.promise
  })
  setup.openDeleteConfirmation()
  setup.deleteReason.value = 'Gasto duplicado'
  const pending = setup.removeExpense()
  await setup.removeExpense()
  assert.deepEqual(calls, ['DELETE /api/expenses/test-expense · Gasto duplicado'])

  first.reject(new Error('Reintenta la eliminación.'))
  await pending
  assert.equal(setup.deleteError.value, 'Reintenta la eliminación.')
  assert.equal(setup.deleteConfirmationOpen.value, true)
  assert.equal(open.value, true)

  await setup.removeExpense()
  assert.equal(setup.deleteError.value, '')
  assert.equal(setup.deleteConfirmationOpen.value, false)
  assert.equal(open.value, false)
  assert.deepEqual(events, ['deleted'])
})

test('eliminar exige motivo y lo envía al servidor', async () => {
  const { setup, calls } = fixture(async () => {})
  setup.openDeleteConfirmation()
  await setup.removeExpense()
  setup.deleteReason.value = '  '
  await setup.removeExpense()
  assert.deepEqual(calls, [])

  setup.deleteReason.value = 'Capturado en el taller equivocado'
  await setup.removeExpense()
  assert.deepEqual(calls, ['DELETE /api/expenses/test-expense · Capturado en el taller equivocado'])
})

test('abrir la confirmación limpia el motivo anterior', () => {
  const { setup } = fixture(async () => {})
  setup.openDeleteConfirmation()
  setup.deleteReason.value = 'Motivo previo'
  setup.deleteConfirmationOpen.value = false
  setup.openDeleteConfirmation()
  assert.equal(setup.deleteReason.value, '')
})
