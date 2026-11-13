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
  <div v-if="loading" class="space-y-3" aria-label="Cargando gastos operativos">
    <DetailCard v-for="index in 3" :key="index" :ui="{ container: 'p-4 sm:p-4 gap-0' }">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-2">
            <USkeleton class="h-5 w-2/3" />
            <USkeleton class="h-3 w-24" />
          </div>
          <USkeleton class="size-8" />
        </div>
        <div class="flex items-end justify-between gap-3">
          <USkeleton class="h-8 w-32" />
          <USkeleton class="h-5 w-24" />
        </div>
        <USkeleton class="h-8 w-full" />
      </div>
    </DetailCard>
  </div>

  <div v-else-if="expenses.length" class="space-y-3">
    <DetailCard
      v-for="expense in expenses"
      :key="expense.id"
      as="article"
      :aria-labelledby="`expense-${expense.id}`"
      :ui="{ container: 'p-4 sm:p-4 gap-0' }"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h2 :id="`expense-${expense.id}`" class="font-semibold break-words text-primary">
            {{ expense.description }}
          </h2>
          <p class="mt-1 text-xs text-muted">
            {{ formatDateOnly(expense.expenseDate) }}
          </p>
        </div>
        <div class="-mr-1 -mt-1 shrink-0">
          <ExpensesActionsMenu
            :expense="expense"
            :disabled="!canEdit"
            @edit="emit('edit', expense)"
            @duplicate="emit('duplicate', expense)"
            @delete="emit('delete', expense)"
          />
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-muted">
            Importe
          </p>
          <p class="mt-0.5 text-xl font-semibold break-words text-warning tabular-nums">
            {{ formatCurrency(expense.amount, expense.currency) }}
          </p>
          <p v-if="expense.currency === 'USD'" class="mt-1 text-xs text-muted tabular-nums">
            TC {{ expense.exchangeRate.toFixed(4) }} · {{ formatCurrency(expense.amountMxn) }} MXN
          </p>
        </div>
        <dl class="flex flex-wrap gap-3">
          <div>
            <dt class="mb-1 text-xs text-muted">
              Categoría
            </dt>
            <dd>
              <UBadge
                :label="expenseCategoryLabels[expense.category]"
                color="primary"
                variant="subtle"
                size="md"
              />
            </dd>
          </div>
          <div>
            <dt class="mb-1 text-xs text-muted">
              Pago
            </dt>
            <dd>
              <UBadge
                :label="paymentMethodLabels[expense.method]"
                color="neutral"
                variant="subtle"
                size="md"
              />
            </dd>
          </div>
        </dl>
      </div>

      <div class="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-default pt-3">
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
    </DetailCard>
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
