<script setup lang="ts">
import { formatDateOnly } from '#shared/date'
import type { ExpenseListItem } from '~/types/crm'

defineProps<{
  expenses: ExpenseListItem[]
  loading?: boolean
  canEdit?: boolean
}>()

const emit = defineEmits<{
  edit: [expense: ExpenseListItem]
  duplicate: [expense: ExpenseListItem]
  delete: [expense: ExpenseListItem]
}>()
</script>

<template>
  <div v-if="loading" class="space-y-3" aria-hidden="true">
    <DetailCard v-for="index in 3" :key="index" :ui="{ container: 'p-4 sm:p-4 gap-0' }">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-2">
            <USkeleton class="motion-reduce:animate-none h-5 w-2/3" />
            <USkeleton class="motion-reduce:animate-none h-3 w-24" />
          </div>
          <USkeleton class="motion-reduce:animate-none size-8" />
        </div>
        <div class="flex items-end justify-between gap-3">
          <USkeleton class="motion-reduce:animate-none h-8 w-32" />
          <USkeleton class="motion-reduce:animate-none h-5 w-24" />
        </div>
        <USkeleton class="motion-reduce:animate-none h-8 w-full" />
      </div>
    </DetailCard>
  </div>

  <div v-else-if="expenses.length" class="space-y-3">
    <ListRecordCard
      v-for="expense in expenses"
      :key="expense.id"
      :title="expense.description"
      :eyebrow="formatDateOnly(expense.expenseDate)"
      :fields="[
        { key: 'category', label: 'Categoría', value: expenseCategoryLabels[expense.category] },
        { key: 'method', label: 'Pago', value: paymentMethodLabels[expense.method] }
      ]"
      summary-label="Importe"
    >
      <template #actions>
        <ExpensesActionsMenu
          :expense="expense"
          :disabled="!canEdit"
          @edit="emit('edit', expense)"
          @duplicate="emit('duplicate', expense)"
          @delete="emit('delete', expense)"
        />
      </template>

      <template #field-value="{ field }">
        <UBadge
          :label="String(field.value)"
          :color="field.key === 'category' ? 'primary' : 'neutral'"
          variant="subtle"
          size="md"
        />
      </template>

      <template #summary>
        <span class="text-xl text-warning tabular-nums">{{ formatCurrency(expense.amount, expense.currency) }}</span>
        <span v-if="expense.currency === 'USD'" class="block text-xs font-normal text-muted tabular-nums">
          TC {{ expense.exchangeRate.toFixed(4) }} · {{ formatCurrency(expense.amountMxn) }} MXN
        </span>
      </template>

      <template #footer>
        <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-default pt-3">
          <div>
            <ExpensesWorkshopBadge :expense="expense" />
          </div>
          <div v-if="expense.order" class="flex min-w-0 justify-end">
            <ExpensesExpenseOrderPopover :order="expense.order" />
          </div>
          <div v-else class="flex items-center justify-end gap-1.5 text-right text-xs text-muted">
            <UIcon
              :name="expense.workshopId === null ? 'i-lucide-globe' : 'i-lucide-building-2'"
              class="size-4 shrink-0"
            />
            <span>{{ expense.workshopId === null ? 'Gasto global' : 'Gasto del taller' }}</span>
          </div>
        </div>
      </template>
    </ListRecordCard>
  </div>

  <DetailCard v-else>
    <div class="py-8 text-center">
      <UIcon name="i-lucide-receipt-text" class="mx-auto size-9 text-dimmed" />
      <p class="mt-3 font-medium text-highlighted">
        No hay gastos registrados
      </p>
      <p class="text-sm text-muted">
        Registra un gasto para comenzar el seguimiento.
      </p>
    </div>
  </DetailCard>
</template>
