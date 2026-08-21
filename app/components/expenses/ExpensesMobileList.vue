<script setup lang="ts">
import { formatDateOnly } from '#shared/date'
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
</script>

<template>
  <div v-if="loading" class="space-y-3" aria-label="Cargando gastos operativos">
    <UCard v-for="index in 3" :key="index" :ui="{ body: 'p-4 sm:p-4' }">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <USkeleton class="h-5 w-40" />
          <USkeleton class="h-5 w-24" />
        </div>
        <USkeleton class="h-4 w-32" />
        <div class="flex gap-2">
          <USkeleton class="h-6 w-20" />
          <USkeleton class="h-6 w-24" />
        </div>
        <USkeleton class="h-14 w-full" />
        <div class="grid grid-cols-2 gap-3">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>
      </div>
    </UCard>
  </div>

  <div v-else-if="expenses.length" class="space-y-3">
    <UCard
      v-for="expense in expenses"
      :key="expense.id"
      :ui="{ body: 'p-4 sm:p-4' }"
    >
      <article :aria-labelledby="`expense-${expense.id}`">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 :id="`expense-${expense.id}`" class="font-semibold text-highlighted">
              {{ expense.description }}
            </h2>
            <p class="mt-1 text-xs text-muted">
              {{ expense.vendor || 'Sin proveedor' }}
            </p>
          </div>
          <p class="shrink-0 text-sm text-muted">
            {{ formatDateOnly(expense.expenseDate) }}
          </p>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
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

        <div class="mt-4 rounded-md bg-elevated/50 p-3">
          <template v-if="expense.order">
            <NuxtLink
              :to="`/ordenes/${expense.order.id}`"
              class="font-medium text-primary hover:underline"
            >
              {{ expense.order.orderNumber }}
            </NuxtLink>
            <p class="mt-1 text-xs text-muted">
              {{ expense.order.customerName }} · {{ expense.order.vehicleLabel }}
            </p>
          </template>
          <div v-else class="flex items-center gap-2 text-sm text-default">
            <UIcon name="i-lucide-building-2" class="size-4 text-muted" />
            <span>Gasto del taller</span>
          </div>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt class="text-xs text-muted">
              Total
            </dt>
            <dd class="mt-0.5 font-semibold text-warning">
              {{ formatCurrency(expense.amount) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">
              Registró
            </dt>
            <dd class="mt-0.5 text-sm text-default">
              {{ expense.recordedByName }}
            </dd>
          </div>
          <div v-if="showWorkshop" class="col-span-2">
            <dt class="text-xs text-muted">
              Taller
            </dt>
            <dd class="mt-0.5 text-sm text-default">
              {{ expense.workshopName }}
            </dd>
          </div>
        </dl>

        <UButton
          label="Editar gasto"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          block
          class="mt-4"
          :disabled="!canEdit"
          @click="emit('edit', expense)"
        />
      </article>
    </UCard>
  </div>

  <UCard v-else>
    <div class="py-8 text-center">
      <UIcon name="i-lucide-receipt-text" class="mx-auto size-9 text-dimmed" />
      <p class="mt-3 font-medium text-highlighted">
        No hay gastos registrados
      </p>
      <p class="text-sm text-muted">
        Registra un gasto para comenzar el seguimiento.
      </p>
    </div>
  </UCard>
</template>
