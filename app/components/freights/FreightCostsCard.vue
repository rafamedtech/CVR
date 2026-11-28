<script setup lang="ts">
import { formatDateOnly } from '#shared/date'
import type { ExpenseFreightOption, OrderExpense } from '~/types/crm'

const props = defineProps<{
  expenses: OrderExpense[]
  freight: ExpenseFreightOption
  amountMxn: number
  canRecord?: boolean
}>()
const emit = defineEmits<{ updated: [] }>()
const open = shallowRef(false)
const totalCosts = computed(() => props.expenses.reduce((total, expense) => total + expense.amountMxn, 0))
const fuelCosts = computed(() => props.expenses
  .filter(expense => expense.category === 'FUEL')
  .reduce((total, expense) => total + expense.amountMxn, 0))
</script>

<template>
  <DetailCard class="min-w-0" :ui="{ container: 'min-w-0 justify-start gap-4', wrapper: 'flex-none' }">
    <template #title>
      <DetailSectionHeading title="Costos directos" color="primary" description="Diésel, casetas, maniobras y otros gastos del viaje.">
        <template #leading>
          <UIcon name="i-lucide-fuel" class="size-5 shrink-0" />
        </template>
        <template v-if="canRecord" #actions>
          <UButton
            label="Registrar costo"
            icon="i-lucide-receipt-text"
            size="sm"
            @click="open = true"
          />
        </template>
      </DetailSectionHeading>
    </template>

    <DetailFields
      :columns="3"
      :fields="[
        { label: 'Total de costos · MXN', value: formatCurrency(totalCosts) },
        { label: 'Diésel · MXN', value: formatCurrency(fuelCosts) },
        { label: 'Margen directo · MXN', value: formatCurrency(amountMxn - totalCosts) }
      ]"
    />

    <ul v-if="expenses.length" class="divide-y divide-default">
      <li v-for="expense in expenses" :key="expense.id" class="flex flex-wrap items-start justify-between gap-3 py-3">
        <div class="min-w-0 flex-1">
          <p class="font-medium break-words text-highlighted">
            {{ expense.description }}
          </p>
          <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{{ formatDateOnly(expense.expenseDate) }}</span>
            <UBadge
              :label="expenseCategoryLabels[expense.category]"
              color="neutral"
              variant="subtle"
              size="sm"
            />
            <span v-if="expense.vendor">{{ expense.vendor }}</span>
          </p>
        </div>
        <div class="text-right">
          <p class="font-semibold text-warning tabular-nums">
            {{ formatCurrency(expense.amount, expense.currency) }}
          </p>
          <p v-if="expense.currency === 'USD'" class="text-xs text-muted tabular-nums">
            {{ formatCurrency(expense.amountMxn) }} MXN
          </p>
        </div>
      </li>
    </ul>
    <p v-else class="text-sm text-muted">
      Sin costos registrados para este flete.
    </p>

    <ExpensesExpenseFormModal
      v-model:open="open"
      :fixed-freight="freight"
      @created="emit('updated')"
    />
  </DetailCard>
</template>
