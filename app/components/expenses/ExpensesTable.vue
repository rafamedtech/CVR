<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { formatDateOnly } from '#shared/date'
import type { ExpenseListItem } from '~/types/crm'
import ExpensesMobileList from './ExpensesMobileList.vue'

const props = defineProps<{
  expenses: ExpenseListItem[]
  loading?: boolean
  showWorkshop?: boolean
  canEdit?: boolean
}>()
const emit = defineEmits<{
  edit: [expense: ExpenseListItem]
  duplicate: [expense: ExpenseListItem]
  delete: [expense: ExpenseListItem]
}>()

const columns = computed<TableColumn<ExpenseListItem>[]>(() => [{
  accessorKey: 'expenseDate',
  header: 'Fecha'
}, {
  accessorKey: 'description',
  header: 'Gasto'
}, {
  accessorKey: 'category',
  header: 'Categoría'
}, {
  accessorKey: 'method',
  header: 'Método de pago'
}, {
  accessorKey: 'amount',
  header: 'Importe'
}, {
  id: 'assignment',
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
  <div>
    <ExpensesMobileList
      class="md:hidden"
      :expenses="expenses"
      :loading="loading"
      :can-edit="canEdit"
      @edit="emit('edit', $event)"
      @duplicate="emit('duplicate', $event)"
      @delete="emit('delete', $event)"
    />

    <UCard class="hidden md:block" :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="expenses" :columns="columns" :loading="loading">
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
          <TableLoadingState v-if="loading" />
          <div v-else class="py-12 text-center">
            <UIcon name="i-lucide-receipt-text" class="mx-auto size-9 text-dimmed" />
            <p class="mt-3 font-medium text-highlighted">
              No hay gastos registrados
            </p>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
