<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ExpenseCategory, ExpenseListItem, ExpenseOrderOption, WorkshopType } from '~/types/crm'

useHead({ title: 'Gastos' })

const route = useRoute()
const router = useRouter()
const consolidatedNoticeDismissed = useLocalStorage('crm-expenses-consolidated-notice-dismissed', false, {
  initOnMounted: true
})
const noticePreferenceLoaded = shallowRef(false)
const search = shallowRef('')
const categoryFilter = shallowRef<ExpenseCategory[]>([])
const expenseDateRange = shallowRef<{
  start: DateValue | undefined
  end: DateValue | undefined
} | null>(null)
const formOpen = shallowRef(false)
const deleteOpen = shallowRef(false)
const expenseToDelete = shallowRef<ExpenseListItem | null>(null)
const selectedExpense = shallowRef<ExpenseListItem | null>(null)
const duplicateExpense = shallowRef<ExpenseListItem | null>(null)
const initialScope = shallowRef<'GLOBAL' | 'WORKSHOP'>('WORKSHOP')
const { session, selectWorkshop, canCreateInWorkshop, canRecordExpenses, isSuperAdmin, activeWorkshop, isAllWorkshops, isReadOnly } = useCrmSession()
const { data: expenses, status, refresh } = useFetch<ExpenseListItem[]>('/api/expenses', {
  lazy: true,
  server: false,
  default: () => [],
  key: 'crm-expenses'
})
const { data: orderOptions } = useFetch<ExpenseOrderOption[]>('/api/expense-order-options', {
  lazy: true,
  server: false,
  default: () => [],
  immediate: canCreateInWorkshop.value,
  key: 'crm-expense-order-options'
})

const workshopFilter = shallowRef('all')
const workshopIcons: Record<WorkshopType, string> = {
  BODY_SHOP: 'i-lucide-paintbrush',
  MECHANICAL: 'i-lucide-wrench',
  PAINT_STORE: 'i-lucide-palette'
}
const workshopFilterOptions = computed(() => [
  { label: 'Todos los gastos', value: 'all', icon: 'i-lucide-building-2' },
  { label: 'Gastos globales', value: 'global', icon: 'i-lucide-globe' },
  ...(session.value?.workshops ?? []).map(workshop => ({
    label: workshop.name, value: workshop.id, icon: workshopIcons[workshop.type]
  }))
])

const filteredExpenses = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es-MX')
  const start = expenseDateRange.value?.start?.toString()
  const end = expenseDateRange.value?.end?.toString()

  return expenses.value.filter((expense) => {
    if (isAllWorkshops.value && workshopFilter.value !== 'all') {
      const workshopId = workshopFilter.value === 'global' ? null : workshopFilter.value
      if (expense.workshopId !== workshopId) return false
    }
    if (categoryFilter.value.length && !categoryFilter.value.includes(expense.category)) return false
    if (start && end) {
      // Expenses store a calendar date at UTC midnight, not a local timestamp.
      const expenseDate = expense.expenseDate.slice(0, 10)
      if (expenseDate < start || expenseDate > end) return false
    }
    if (!term) return true

    return [
      expense.workshopId === null ? 'Gasto global' : 'Gasto del taller',
      expense.description,
      expense.vendor,
      expense.workshopName,
      expense.order?.orderNumber,
      expense.order?.customerName,
      expense.order?.vehicleLabel,
      expenseCategoryLabels[expense.category]
    ].some(value => value?.toLocaleLowerCase('es-MX').includes(term))
  })
})

const createOptions = computed<DropdownMenuItem[]>(() => {
  const globalOption: DropdownMenuItem = {
    label: 'Gasto global · Todos los negocios',
    icon: 'i-lucide-globe',
    disabled: !isSuperAdmin.value,
    onSelect: () => openCreateModal('GLOBAL')
  }

  const workshopOptions: DropdownMenuItem[] = isAllWorkshops.value
    ? (session.value?.workshops ?? []).map(workshop => ({
        label: workshop.name,
        icon: workshop.type === 'BODY_SHOP' ? 'i-lucide-paintbrush' : 'i-lucide-wrench',
        disabled: !isSuperAdmin.value && !['MANAGER', 'CASHIER'].includes(workshop.role ?? ''),
        onSelect: () => selectWorkshop(workshop.id, `/gastos?registrarGasto=${encodeURIComponent(workshop.id)}`)
      }))
    : [{
        label: `Gasto del taller · ${activeWorkshop.value?.name ?? 'Selecciona un taller'}`,
        icon: 'i-lucide-building-2',
        disabled: !canRecordExpenses.value,
        onSelect: () => openCreateModal('WORKSHOP')
      }]

  return [globalOption, ...workshopOptions]
})

onMounted(async () => {
  noticePreferenceLoaded.value = true
  const requestedWorkshopId = route.query.registrarGasto
  const requestedExpenseId = route.query.gasto
  const requestedAction = route.query.accion
  if (!requestedWorkshopId && !requestedExpenseId) return

  const query = { ...route.query }
  delete query.registrarGasto
  delete query.gasto
  delete query.accion
  await router.replace({ query })

  if (requestedWorkshopId === activeWorkshop.value?.id && canRecordExpenses.value) {
    openCreateModal('WORKSHOP')
  }

  if (typeof requestedExpenseId === 'string' && canRecordExpenses.value) {
    await refresh()
    const expense = expenses.value.find(item => item.id === requestedExpenseId)
    if (!expense) return
    if (requestedAction === 'editar') openEditModal(expense)
    if (requestedAction === 'duplicar') openDuplicateModal(expense)
  }
})

function openCreateModal(scope: 'GLOBAL' | 'WORKSHOP') {
  initialScope.value = scope
  selectedExpense.value = null
  duplicateExpense.value = null
  formOpen.value = true
}

function selectExpenseWorkshop(expense: ExpenseListItem, action: 'editar' | 'duplicar') {
  if (!expense.workshopId || expense.workshopId === activeWorkshop.value?.id) return false

  selectWorkshop(expense.workshopId, `/gastos?gasto=${encodeURIComponent(expense.id)}&accion=${action}`)
  return true
}

function openEditModal(expense: ExpenseListItem) {
  if (selectExpenseWorkshop(expense, 'editar')) return
  selectedExpense.value = expense
  duplicateExpense.value = null
  formOpen.value = true
}

function openDeleteModal(expense: ExpenseListItem) {
  expenseToDelete.value = expense
  deleteOpen.value = true
}

function openDuplicateModal(expense: ExpenseListItem) {
  if (selectExpenseWorkshop(expense, 'duplicar')) return
  selectedExpense.value = null
  duplicateExpense.value = expense
  formOpen.value = true
}
</script>

<template>
  <UDashboardPanel id="gastos">
    <template #header>
      <UDashboardNavbar title="Gastos operativos">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <span v-if="!isReadOnly" class="inline-flex md:hidden">
            <ExpensesCreateMenu
              :items="createOptions"
              :disabled="!canRecordExpenses && !isSuperAdmin"
              label="Nuevo"
            />
          </span>
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar v-if="isAllWorkshops" class="py-3 lg:py-0">
        <div class="flex w-full min-w-0 items-center gap-3">
          <ReportsBusinessSelector
            v-model="workshopFilter"
            :options="workshopFilterOptions"
            aria-label="Filtrar gastos por taller"
          />
        </div>
      </UDashboardToolbar>
      <ExpensesFilters
        v-model:search="search"
        v-model:categories="categoryFilter"
        v-model:date-range="expenseDateRange"
      >
        <template #right>
          <ExpensesCreateMenu
            v-if="!isReadOnly"
            :items="createOptions"
            :disabled="!canRecordExpenses && !isSuperAdmin"
          />
        </template>
      </ExpensesFilters>
    </template>

    <template #body>
      <UAlert
        v-if="isAllWorkshops && !isReadOnly && noticePreferenceLoaded && !consolidatedNoticeDismissed"
        class="shrink-0"
        title="Vista consolidada"
        description="Puedes registrar un gasto global o seleccionar un taller para registrar sus gastos."
        icon="i-lucide-info"
        color="info"
        variant="subtle"
        close
        @update:open="consolidatedNoticeDismissed = true"
      />
      <ExpensesTable
        :expenses="filteredExpenses"
        :loading="status === 'idle' || status === 'pending'"
        :show-workshop="isAllWorkshops"
        :can-edit="canRecordExpenses || isSuperAdmin"
        @edit="openEditModal"
        @duplicate="openDuplicateModal"
        @delete="openDeleteModal"
      />
      <ExpensesExpenseDeleteModal
        v-model:open="deleteOpen"
        :expense="expenseToDelete"
        @deleted="refresh"
      />
      <ExpensesExpenseFormModal
        v-model:open="formOpen"
        :expense="selectedExpense"
        :initial-scope="initialScope"
        :duplicate-expense="duplicateExpense"
        :orders="orderOptions"
        @created="refresh"
        @updated="refresh"
        @deleted="refresh"
      />
    </template>
  </UDashboardPanel>
</template>
