<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ExpenseListItem } from '~/types/crm'

defineProps<{
  expenses: ExpenseListItem[]
  loading?: boolean
  showWorkshop?: boolean
  canEdit?: boolean
}>()
const emit = defineEmits<{
  edit: [expense: ExpenseListItem]
}>()

const columns: TableColumn<ExpenseListItem>[] = [{
  accessorKey: 'expenseDate',
  header: 'Fecha'
}, {
  accessorKey: 'description',
  header: 'Gasto'
}, {
  accessorKey: 'category',
  header: 'Categoría'
}, {
  accessorKey: 'amount',
  header: 'Importe'
}, {
  accessorKey: 'workshopName',
  header: 'Taller'
}, {
  accessorKey: 'recordedByName',
  header: 'Registró'
}, {
  id: 'actions'
}]
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <UTable :data="expenses" :columns="columns" :loading="loading">
      <template #expenseDate-cell="{ row }">
        {{ formatDate(row.original.expenseDate) }}
      </template>
      <template #description-cell="{ row }">
        <div>
          <p class="font-medium text-highlighted">
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
      <template #amount-cell="{ row }">
        <span class="font-semibold text-warning">{{ formatCurrency(row.original.amount) }}</span>
      </template>
      <template #workshopName-cell="{ row }">
        <span v-if="showWorkshop" class="text-sm text-muted">{{ row.original.workshopName }}</span>
        <span v-else>—</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            label="Editar"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            :disabled="!canEdit"
            @click="emit('edit', row.original)"
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
    </UTable>
  </UCard>
</template>
