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
  <div class="space-y-4">
    <DetailCard :ui="{ container: 'p-4 sm:p-5 gap-0' }">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="flex items-center gap-2 text-xs text-muted uppercase">
            <span class="h-3.5 w-1 rounded-full bg-warning" aria-hidden="true" />
            Total de gastos · MXN
          </p>
          <p class="mt-2 text-2xl font-semibold tracking-tight break-words text-warning tabular-nums">
            {{ formatCurrency(totalExpenses) }}
          </p>
          <p class="mt-1 text-xs text-muted">
            {{ expenses.length }} {{ expenses.length === 1 ? 'movimiento registrado' : 'movimientos registrados' }}
          </p>
        </div>
        <UButton
          v-if="canRecord"
          label="Registrar gasto"
          icon="i-lucide-receipt-text"
          @click="open = true"
        />
      </div>
    </DetailCard>

    <div v-if="expenses.length" class="space-y-3">
      <DetailCard
        v-for="expense in expenses"
        :key="expense.id"
        as="article"
        :aria-labelledby="`order-expense-${expense.id}`"
        :ui="{ container: 'p-4 sm:p-5 gap-0' }"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h3 :id="`order-expense-${expense.id}`" class="font-semibold break-words text-primary">
              {{ expense.description }}
            </h3>
            <p class="mt-1 text-xs text-muted">
              {{ formatDateOnly(expense.expenseDate) }}
            </p>
          </div>
          <div class="min-w-0 text-right">
            <p class="text-xs text-muted">
              Importe
            </p>
            <p class="mt-0.5 text-lg font-semibold text-warning tabular-nums">
              {{ formatCurrency(expense.amount, expense.currency) }}
            </p>
          </div>
        </div>
        <p v-if="expense.currency === 'USD'" class="mt-2 text-xs text-muted tabular-nums">
          TC {{ expense.exchangeRate.toFixed(4) }} · {{ formatCurrency(expense.amountMxn) }} MXN
        </p>

        <dl class="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t border-default pt-3">
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
      </DetailCard>
    </div>
    <DetailCard v-else :ui="{ container: 'p-6 sm:p-8 gap-0' }">
      <div class="text-center">
        <UIcon name="i-lucide-receipt-text" class="size-9 text-dimmed" />
        <h3 class="mt-3 font-semibold text-primary">
          Sin gastos registrados
        </h3>
        <p class="mt-1 text-sm text-muted">
          Los gastos asignados a esta orden aparecerán aquí.
        </p>
      </div>
    </DetailCard>

    <ExpensesExpenseFormModal
      v-model:open="open"
      :fixed-order="order"
      @created="emit('updated')"
    />
  </div>
</template>
