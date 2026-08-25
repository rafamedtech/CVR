<script setup lang="ts">
const props = defineProps<{
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  expenseTotal: number
}>()

const netProfit = computed(() => props.total - props.expenseTotal)
const profitMargin = computed(() => (props.total > 0 ? (netProfit.value / props.total) * 100 : 0))
const profitColor = computed(() => (netProfit.value >= 0 ? 'text-success' : 'text-error'))
const itemAmount = computed(() => props.subtotal + props.discountTotal)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">Resumen financiero</h2>
        </div>
        <UIcon name="i-lucide-chart-no-axes-combined" class="size-5 shrink-0 text-primary" />
      </div>
    </template>

    <dl class="space-y-3 text-sm">
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">Importe de conceptos</dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(itemAmount) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">Descuentos</dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(-discountTotal) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">Subtotal</dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(subtotal) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">IVA</dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(taxTotal) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4 border-t border-default pt-3">
        <dt class="font-semibold text-highlighted">Total de la orden</dt>
        <dd class="font-semibold text-highlighted">
          {{ formatCurrency(total) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">Gastos</dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(expenseTotal) }}
        </dd>
      </div>
    </dl>

    <template #footer>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-muted">Margen de ganancia</p>
          <p class="mt-1 text-xl font-semibold" :class="profitColor">{{ profitMargin.toFixed(1) }}%</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">Ganancia neta</p>
          <p class="mt-1 text-xl font-semibold" :class="profitColor">
            {{ formatCurrency(netProfit) }}
          </p>
        </div>
      </div>
    </template>
  </UCard>
</template>
