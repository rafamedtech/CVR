<script setup lang="ts">
import type { DashboardData } from '~/types/crm'

const props = defineProps<{
  kpis: DashboardData['kpis']
  expenseBreakdown: DashboardData['expenseBreakdown']
}>()

const sales = computed(() => props.kpis.sales)
const margin = computed(() => props.kpis.netProfit)
const marginRate = computed(() => (sales.value ? margin.value / sales.value : 0))
const hasSales = computed(() => sales.value > 0)

function share(value: number) {
  return sales.value ? value / sales.value : 0
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(value)
}

const topExpenses = computed(() => {
  const top = props.expenseBreakdown.slice(0, 3)

  if (!top.length) return 'Sin gastos registrados en el periodo'

  return top.map(item => expenseCategoryLabels[item.category]).join(' · ')
})

const rows = computed(() => [{
  key: 'material',
  label: 'Compras de material',
  hint: 'Refacciones y partes cargadas a las órdenes',
  value: props.kpis.materialCosts,
  swatch: 'swatch-cost-1',
  tone: 'text-highlighted'
}, {
  key: 'direct',
  label: 'Otros costos directos',
  hint: 'Mano de obra y servicios subcontratados',
  value: props.kpis.otherDirectCosts,
  swatch: 'swatch-cost-2',
  tone: 'text-highlighted'
}, {
  key: 'expenses',
  label: 'Gastos operativos',
  hint: topExpenses.value,
  value: props.kpis.expenses,
  swatch: 'swatch-cost-3',
  tone: 'text-highlighted'
}, {
  key: 'margin',
  label: 'Margen de ganancia',
  hint: 'Ventas menos costos y gastos del periodo',
  value: margin.value,
  swatch: 'swatch-margin',
  tone: margin.value < 0 ? 'text-error' : 'text-primary'
}].filter(row => row.key !== 'direct' || row.value > 0))

const segments = computed(() => rows.value
  .filter(row => row.value > 0)
  .map(row => ({ ...row, grow: share(row.value) })))
</script>

<template>
  <section class="profit-summary grid overflow-hidden rounded-2xl ring ring-default lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
    <div class="profit-summary__aside flex flex-col justify-between gap-8 p-6 lg:p-8">
      <div>
        <p class="text-xs font-medium uppercase tracking-widest text-dimmed">
          Ventas del periodo
        </p>
        <p class="mt-3 text-4xl font-semibold tabular-nums tracking-tighter text-highlighted lg:text-5xl">
          {{ formatCurrency(sales) }}
        </p>
        <p class="mt-2 text-sm text-muted">
          Ticket promedio {{ formatCurrency(kpis.averageTicket) }}
        </p>
      </div>

      <div>
        <p class="text-xs font-medium uppercase tracking-widest text-dimmed">
          Margen de ganancia
        </p>
        <div class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <p
            class="text-3xl font-semibold tabular-nums tracking-tight"
            :class="margin < 0 ? 'text-error' : 'text-highlighted'"
          >
            {{ formatCurrency(margin) }}
          </p>
          <UBadge
            v-if="hasSales"
            :color="margin < 0 ? 'error' : 'primary'"
            variant="subtle"
            class="tabular-nums"
          >
            {{ formatPercent(marginRate) }} de las ventas
          </UBadge>
        </div>
        <p class="mt-2 max-w-xs text-sm text-muted" style="text-wrap: pretty">
          {{ margin < 0
            ? 'Los costos y gastos del periodo superan lo facturado.'
            : 'Queda después de material, costos directos y gastos operativos.' }}
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-6 p-6 lg:p-8">
      <div v-if="hasSales">
        <div class="profit-summary__bar flex h-2.5 gap-px overflow-hidden rounded-full">
          <span
            v-for="segment in segments"
            :key="segment.key"
            class="h-full transition-[flex-grow] duration-500 ease-out"
            :class="segment.swatch"
            :style="{ flexGrow: segment.grow }"
          />
        </div>
        <p class="mt-2.5 text-xs text-dimmed">
          Cómo se reparte cada peso facturado
        </p>
      </div>

      <dl class="divide-y divide-default">
        <div
          v-for="row in rows"
          :key="row.key"
          class="flex items-start justify-between gap-6 py-3.5 first:pt-0 last:pb-0"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span class="mt-1.5 size-2.5 shrink-0 rounded-sm" :class="row.swatch" />
            <div class="min-w-0">
              <dt class="text-sm font-medium text-highlighted">
                {{ row.label }}
              </dt>
              <p class="mt-0.5 truncate text-xs text-dimmed">
                {{ row.hint }}
              </p>
            </div>
          </div>
          <dd class="shrink-0 text-right">
            <p class="text-sm font-semibold tabular-nums" :class="row.tone">
              {{ formatCurrency(row.value) }}
            </p>
            <p v-if="hasSales" class="mt-0.5 text-xs tabular-nums text-dimmed">
              {{ formatPercent(share(row.value)) }}
            </p>
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.profit-summary {
  background-color: var(--ui-bg);
}

.profit-summary__aside {
  background-color: color-mix(in srgb, var(--ui-bg-elevated) 55%, var(--ui-bg));
  border-bottom: 1px solid var(--ui-border);
}

@media (min-width: 1024px) {
  .profit-summary__aside {
    border-bottom: 0;
    border-right: 1px solid var(--ui-border);
  }
}

.profit-summary__bar {
  background-color: var(--ui-bg-accented);
}

.swatch-cost-1 {
  background-color: color-mix(in srgb, var(--ui-bg-inverted) 24%, var(--ui-bg-accented));
}

.swatch-cost-2 {
  background-color: color-mix(in srgb, var(--ui-bg-inverted) 48%, var(--ui-bg-accented));
}

.swatch-cost-3 {
  background-color: color-mix(in srgb, var(--ui-bg-inverted) 76%, var(--ui-bg-accented));
}

.swatch-margin {
  background-color: var(--ui-primary);
}
</style>
