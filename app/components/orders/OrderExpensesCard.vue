<script setup lang="ts">
import { formatDateOnly } from '#shared/date'
import type { ExpenseOrderOption, OrderExpense } from '~/types/crm'

const props = defineProps<{
  expenses: OrderExpense[]
  order: ExpenseOrderOption
  canRecord?: boolean
}>()
const emit = defineEmits<{ updated: [] }>()
const open = shallowRef(false)

const totalExpenses = computed(() => props.expenses.reduce((total, expense) => total + expense.amountMxn, 0))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">
            Gastos
          </h2>
          <p class="text-sm text-muted">
            {{ expenses.length }} movimientos
          </p>
        </div>
        <UButton
          v-if="canRecord"
          label="Registrar gasto"
          icon="i-lucide-receipt-text"
          @click="open = true"
        />
      </div>
    </template>

    <div v-if="expenses.length" class="divide-y divide-default">
      <div
        v-for="expense in expenses"
        :key="expense.id"
        class="flex items-start justify-between gap-3 py-3 first:pt-0"
      >
        <div class="min-w-0">
          <p class="font-medium text-highlighted">
            {{ expense.description }}
          </p>
          <p class="text-xs text-muted">
            {{ formatDateOnly(expense.expenseDate) }}
          </p>
          <p v-if="expense.vendor" class="text-xs text-muted">
            {{ expense.vendor }}
          </p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <UBadge
              :label="expenseCategoryLabels[expense.category]"
              color="neutral"
              variant="subtle"
            />
            <UBadge
              :label="paymentMethodLabels[expense.method]"
              color="neutral"
              variant="soft"
            />
          </div>
        </div>
        <div class="shrink-0 text-right">
          <p class="font-semibold text-warning">
            {{ formatCurrency(expense.amount, expense.currency) }}
          </p>
          <p v-if="expense.currency === 'USD'" class="text-xs text-muted">
            TC {{ expense.exchangeRate.toFixed(4) }} · {{ formatCurrency(expense.amountMxn) }} MXN
          </p>
        </div>
      </div>
    </div>
    <div v-else class="py-8 text-center text-sm text-muted">
      No hay gastos asignados a esta orden.
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <span class="font-medium text-highlighted">Total de gastos</span>
        <span class="text-lg font-semibold text-warning">{{ formatCurrency(totalExpenses) }}</span>
      </div>
    </template>

    <ExpensesExpenseFormModal
      v-model:open="open"
      :fixed-order="order"
      @created="emit('updated')"
    />
  </UCard>
</template>
