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
  <DetailCard class="min-w-0" :ui="{ container: 'min-w-0', wrapper: 'min-w-0' }">
    <template #title>
      <DetailSectionHeading title="Resumen financiero" color="primary" description="Importes, gastos y ganancia de esta orden.">
        <template #leading>
          <UIcon name="i-lucide-chart-no-axes-combined" class="size-5 shrink-0" />
        </template>
      </DetailSectionHeading>
    </template>

    <dl class="space-y-3 text-sm tabular-nums">
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">
          Importe de conceptos
        </dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(itemAmount) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">
          Descuentos
        </dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(-discountTotal) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">
          Subtotal
        </dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(subtotal) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">
          IVA
        </dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(taxTotal) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4 border-t border-default pt-3">
        <dt class="font-semibold text-highlighted">
          Total de la orden
        </dt>
        <dd class="font-semibold text-highlighted">
          {{ formatCurrency(total) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted">
          Gastos
        </dt>
        <dd class="font-medium text-default">
          {{ formatCurrency(expenseTotal) }}
        </dd>
      </div>
    </dl>

    <DetailFields
      :fields="[
        { key: 'margin', label: 'Margen de ganancia', value: `${profitMargin.toFixed(1)}%` },
        { key: 'profit', label: 'Ganancia neta', value: formatCurrency(netProfit) }
      ]"
      class="border-t border-default pt-4"
    >
      <template #value="{ field }">
        <span class="text-xl font-semibold tracking-tight tabular-nums" :class="profitColor">{{ field.value }}</span>
      </template>
    </DetailFields>
  </DetailCard>
</template>
