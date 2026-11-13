import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const page = readFileSync(new URL('../app/pages/gastos.vue', import.meta.url), 'utf8')
const script = page.split('<script setup lang="ts">')[1]!.split('</script>')[0]!
const source = ts.transpileModule(`${script}\nexport { openEditModal, openDuplicateModal, openDeleteModal, formOpen, selectedExpense, duplicateExpense, deleteOpen }`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText

type Expense = { id: string, workshopId: string | null }
function fixture(workshopId: string | null, query: Record<string, string> = {}) {
  const expense: Expense = { id: 'expense-1', workshopId: 'body-shop' }
  const route = { query }
  const switches: Array<{ id: string, path: string }> = []
  let mounted: () => Promise<void> = async () => {}
  let refreshes = 0
  const exports: {
    openEditModal: (expense: Expense) => void
    openDuplicateModal: (expense: Expense) => void
    openDeleteModal: (expense: Expense) => void
    formOpen: { value: boolean }
    deleteOpen: { value: boolean }
    selectedExpense: { value: Expense | null }
    duplicateExpense: { value: Expense | null }
  } = {} as never
  const ref = (value: unknown) => ({ value })
  const expensesData = { value: query.gasto ? [] as Expense[] : [expense] }
  runInNewContext(source, {
    exports, encodeURIComponent,
    useHead: () => {},
    useRoute: () => route,
    useRouter: () => ({ replace: async ({ query: next }: { query: Record<string, string> }) => { route.query = next } }),
    useLocalStorage: (_key: string, value: unknown) => ref(value),
    shallowRef: ref,
    computed: (get: () => unknown) => ({ get value() { return get() } }),
    useCrmSession: () => ({
      session: ref(null), activeWorkshop: ref(workshopId ? { id: workshopId } : null),
      canCreateInWorkshop: ref(Boolean(workshopId)), canRecordExpenses: ref(Boolean(workshopId)),
      isSuperAdmin: ref(true), isAllWorkshops: ref(!workshopId), isReadOnly: ref(false),
      selectWorkshop: (id: string, path: string) => { switches.push({ id, path }) }
    }),
    useFetch: (url: string) => ({
      data: url === '/api/expenses' ? expensesData : ref([]), status: ref('success'),
      refresh: async () => {
        refreshes++
        expensesData.value = [expense]
      }
    }),
    onMounted: (callback: () => Promise<void>) => { mounted = callback }
  })
  return { ...exports, expense, switches, mount: () => mounted(), route, refreshes: () => refreshes }
}

for (const action of ['editar', 'duplicar'] as const) {
  test(`desde consolidado ${action} selecciona el taller antes de abrir el formulario`, () => {
    const app = fixture(null)
    if (action === 'editar') app.openEditModal(app.expense)
    else app.openDuplicateModal(app.expense)
    assert.deepEqual(app.switches, [{ id: 'body-shop', path: `/gastos?gasto=expense-1&accion=${action}` }])
    assert.equal(app.formOpen.value, false)
  })
}

test('editar y duplicar en el taller activo abren el formulario sin cambiar de taller', () => {
  const app = fixture('body-shop')
  app.openEditModal(app.expense)
  assert.equal(app.selectedExpense.value?.id, app.expense.id)
  assert.equal(app.formOpen.value, true)
  app.openDuplicateModal(app.expense)
  assert.equal(app.selectedExpense.value, null)
  assert.equal(app.duplicateExpense.value?.id, app.expense.id)
  assert.equal(app.switches.length, 0)
})

test('los gastos globales y la confirmación de eliminar no requieren cambiar de taller', () => {
  const app = fixture(null)
  app.openEditModal({ id: 'global-1', workshopId: null })
  assert.equal(app.formOpen.value, true)
  app.openDeleteModal(app.expense)
  assert.equal(app.deleteOpen.value, true)
  assert.equal(app.switches.length, 0)
})

for (const action of ['editar', 'duplicar'] as const) {
  test(`después del cambio de taller carga el gasto y abre ${action}`, async () => {
    const app = fixture('body-shop', { gasto: 'expense-1', accion: action })
    await app.mount()
    assert.equal(app.refreshes(), 1)
    assert.equal(app.formOpen.value, true)
    assert.equal((action === 'editar' ? app.selectedExpense : app.duplicateExpense).value?.id, 'expense-1')
    assert.equal(Object.keys(app.route.query).length, 0)
    assert.equal(app.switches.length, 0)
  })
}
