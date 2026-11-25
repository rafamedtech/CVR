<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { formatDateOnly } from '#shared/date'
import type { ExpenseListItem } from '~/types/crm'
import ExpensesMobileList from './ExpensesMobileList.vue'

const props = defineProps<{
  expenses: ExpenseListItem[]
  loading?: boolean
  error?: boolean
  showWorkshop?: boolean
  canEdit?: boolean
}>()
const emit = defineEmits<{
  retry: []
  edit: [expense: ExpenseListItem]
  duplicate: [expense: ExpenseListItem]
  delete: [expense: ExpenseListItem]
}>()

const page = shallowRef(1)
const pageSize = 10
const expenseIds = computed(() => props.expenses.map(expense => expense.id).join(','))
watch(expenseIds, () => {
  page.value = 1
})

const columns = computed<TableColumn<ExpenseListItem>[]>(() => [{
  accessorKey: 'expenseDate',
  header: 'Fecha'
}, {
  accessorKey: 'description',
  header: 'Gasto'
}, {
  id: 'category',
  accessorFn: row => expenseCategoryLabels[row.category],
  header: 'Categoría'
}, {
  id: 'method',
  accessorFn: row => paymentMethodLabels[row.method],
  header: 'Método de pago'
}, {
  id: 'amount',
  accessorFn: row => row.amountMxn,
  header: 'Importe'
}, {
  id: 'assignment',
  accessorFn: row => row.order?.orderNumber ?? (row.workshopId === null ? 'Gasto global' : 'Gasto del taller'),
  header: 'Asignación'
}, ...(props.showWorkshop
  ? [{
      accessorKey: 'workshopName',
      header: 'Taller'
    }]
  : []), {
  id: 'actions'
}])
</script>

<template>
  <ListTable
    v-model:page="page"
    :data="expenses"
    :columns="columns"
    :get-row-id="row => row.id"
    :page-size="pageSize"
    show-mobile-sort
    :loading="loading"
    loading-label="Cargando gastos operativos"
    :error="error"
    error-title="Gastos no disponibles"
    error-message="No se pudieron cargar los gastos registrados."
    @update:sorting="page = 1"
    @retry="emit('retry')"
  >
    <template #mobile="{ rows }">
      <ExpensesMobileList
        :expenses="rows"
        :can-edit="canEdit"
        @edit="emit('edit', $event)"
        @duplicate="emit('duplicate', $event)"
        @delete="emit('delete', $event)"
      />
    </template>
    <template #expenseDate-cell="{ row }">
      {{ formatDateOnly(row.original.expenseDate) }}
    </template>
    <template #description-cell="{ row }">
      <div>
        <p class="font-medium text-primary">
          {{ row.original.description }}
        </p>
        <p class="text-xs text-muted">
          {{ row.original.vendor || 'Sin proveedor' }}
        </p>
      </div>
    </template>
    <template #category-cell="{ row }">
      <UBadge :label="expenseCategoryLabels[row.original.category]" color="neutral" variant="subtle" />
    </template>
    <template #method-cell="{ row }">
      {{ paymentMethodLabels[row.original.method] }}
    </template>
    <template #amount-cell="{ row }">
      <div>
        <p class="font-semibold text-warning">
          {{ formatCurrency(row.original.amount, row.original.currency) }}
        </p>
        <p v-if="row.original.currency === 'USD'" class="text-xs text-muted">
          TC {{ row.original.exchangeRate.toFixed(4) }} · {{ formatCurrency(row.original.amountMxn) }} MXN
        </p>
      </div>
    </template>
    <template #assignment-cell="{ row }">
      <ExpensesAssignment :order="row.original.order" :global="row.original.workshopId === null" />
    </template>
    <template #workshopName-cell="{ row }">
      <ExpensesWorkshopBadge :expense="row.original" />
    </template>
    <template #actions-cell="{ row }">
      <div class="flex justify-end">
        <ExpensesActionsMenu
          :expense="row.original"
          :disabled="!canEdit"
          @edit="emit('edit', row.original)"
          @duplicate="emit('duplicate', row.original)"
          @delete="emit('delete', row.original)"
        />
      </div>
    </template>
    <template #empty>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-receipt-text" class="mx-auto size-9 text-dimmed" />
        <p class="mt-3 font-medium text-highlighted">
          No hay gastos registrados
        </p>
      </div>
    </template>
    <template #pagination>
      <ListPagination
        v-model:page="page"
        :total-results="expenses.length"
        :page-size="pageSize"
        label="gastos"
        aria-label="Paginación de gastos"
        hide-single-page
      />
    </template>
  </ListTable>
</template>
