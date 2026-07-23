<script setup lang="ts">
import type { ExpenseListItem } from '~/types/crm'

useHead({ title: 'Gastos' })

const search = shallowRef('')
const createOpen = shallowRef(false)
const { canCreateInWorkshop, isAllWorkshops } = useCrmSession()
const { data: expenses, status, refresh } = await useFetch<ExpenseListItem[]>('/api/expenses', {
  default: () => [],
  key: 'crm-expenses'
})

const filteredExpenses = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es-MX')
  if (!term) return expenses.value

  return expenses.value.filter(expense => [
    expense.description,
    expense.vendor,
    expense.workshopName,
    expenseCategoryLabels[expense.category]
  ].some(value => value?.toLocaleLowerCase('es-MX').includes(term)))
})

const total = computed(() => filteredExpenses.value.reduce((sum, expense) => sum + expense.amount, 0))
</script>

<template>
  <UDashboardPanel id="expenses">
    <template #header>
      <UDashboardNavbar title="Gastos operativos">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Registrar gasto"
            icon="i-lucide-receipt-text"
            :disabled="!canCreateInWorkshop"
            @click="createOpen = true"
          />
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar descripción, proveedor o categoría…"
            class="w-full sm:w-96"
          />
        </template>
        <template #right>
          <div class="text-right">
            <p class="text-xs text-muted">
              Total visible
            </p>
            <p class="font-semibold text-highlighted">
              {{ formatCurrency(total) }}
            </p>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="isAllWorkshops"
        class="mb-4"
        title="Vista consolidada"
        description="Selecciona un taller para registrar un gasto."
        icon="i-lucide-info"
        color="info"
        variant="subtle"
      />
      <ExpensesTable
        :expenses="filteredExpenses"
        :loading="status === 'pending'"
        :show-workshop="isAllWorkshops"
      />
      <ExpensesExpenseFormModal v-model:open="createOpen" @created="refresh" />
    </template>
  </UDashboardPanel>
</template>
