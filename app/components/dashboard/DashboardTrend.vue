<script setup lang="ts">
import { CurveType } from '@unovis/ts'
import {
  VisAxis,
  VisCrosshair,
  VisLine,
  VisStackedBar,
  VisXYContainer
} from '@unovis/vue'
import type { DashboardData } from '~/types/crm'

type TrendDatum = DashboardData['trend'][number]

const props = defineProps<{
  items: DashboardData['trend']
  canViewFinancials?: boolean
}>()

const hasActivity = computed(() => props.items.some(item => (
  item.sales || item.collected || item.materialCosts || item.expenses || item.orders || item.delivered
)))
const x = (datum: TrendDatum) => new Date(datum.date).getTime()
const sales = (datum: TrendDatum) => datum.sales
const materialCosts = (datum: TrendDatum) => datum.materialCosts
const expenses = (datum: TrendDatum) => datum.expenses
const orders = (datum: TrendDatum) => datum.orders
const delivered = (datum: TrendDatum) => datum.delivered
const salesColor = 'var(--ui-primary)'
const materialColor = 'color-mix(in srgb, var(--ui-bg-inverted) 24%, var(--ui-bg-accented))'
const expensesColor = 'color-mix(in srgb, var(--ui-bg-inverted) 76%, var(--ui-bg-accented))'
const ordersColor = 'var(--ui-primary)'
const deliveredColor = 'color-mix(in srgb, var(--ui-bg-inverted) 55%, var(--ui-bg-accented))'

function formatAxisDate(value: number | Date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short'
  }).format(new Date(value))
}

function formatAxisValue(value: number | Date) {
  const amount = Number(value)

  if (!props.canViewFinancials) return amount.toLocaleString('es-MX')

  return new Intl.NumberFormat('es-MX', {
    notation: 'compact',
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 1
  }).format(amount)
}

function tooltipTemplate(datum: TrendDatum) {
  const date = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(datum.date))

  if (!props.canViewFinancials) {
    return `
      <div class="dashboard-chart-tooltip">
        <strong>${date}</strong>
        <span>Órdenes <b>${datum.orders.toLocaleString('es-MX')}</b></span>
        <span>Entregadas <b>${datum.delivered.toLocaleString('es-MX')}</b></span>
      </div>
    `
  }

  const margin = datum.sales - datum.materialCosts - datum.expenses

  return `
    <div class="dashboard-chart-tooltip">
      <strong>${date}</strong>
      <span>Ventas <b>${formatCurrency(datum.sales)}</b></span>
      <span>Material <b>${formatCurrency(datum.materialCosts)}</b></span>
      <span>Gastos operativos <b>${formatCurrency(datum.expenses)}</b></span>
      <span>Margen <b>${formatCurrency(margin)}</b></span>
    </div>
  `
}
</script>

<template>
  <UCard class="dashboard-chart-card">
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="font-semibold text-highlighted">
            {{ canViewFinancials ? 'Ventas contra costos' : 'Ritmo de trabajo' }}
          </h2>
          <p class="text-sm text-muted">
            {{ canViewFinancials
              ? 'Lo facturado frente al material y los gastos operativos de cada día'
              : 'Órdenes registradas y entregadas por día' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted" aria-label="Leyenda de la gráfica">
          <span class="inline-flex items-center gap-1.5">
            <span class="legend-sales size-2.5 rounded-full" />
            {{ canViewFinancials ? 'Ventas' : 'Órdenes' }}
          </span>
          <span v-if="canViewFinancials" class="inline-flex items-center gap-1.5">
            <span class="legend-material size-2.5 rounded-sm" />
            Compras de material
          </span>
          <span v-if="canViewFinancials" class="inline-flex items-center gap-1.5">
            <span class="legend-expenses size-2.5 rounded-sm" />
            Gastos operativos
          </span>
          <span v-else class="inline-flex items-center gap-1.5">
            <span class="legend-delivered size-2.5 rounded-full" />
            Entregadas
          </span>
        </div>
      </div>
    </template>

    <div
      v-if="hasActivity"
      class="h-80"
      role="img"
      :aria-label="canViewFinancials ? 'Gráfica de ventas, compras de material y gastos operativos del periodo' : 'Gráfica de órdenes y entregas del periodo'"
    >
      <ClientOnly>
        <VisXYContainer :data="items" :y-domain="[0, undefined]">
          <VisStackedBar
            v-if="canViewFinancials"
            :x="x"
            :y="[materialCosts, expenses]"
            :color="[materialColor, expensesColor]"
            :bar-padding="0.45"
            :bar-max-width="18"
            :rounded-corners="4"
          />
          <VisLine
            :x="x"
            :y="canViewFinancials ? sales : orders"
            :color="canViewFinancials ? salesColor : ordersColor"
            :curve-type="CurveType.MonotoneX"
            :line-width="3"
          />
          <VisLine
            v-if="!canViewFinancials"
            :x="x"
            :y="delivered"
            :color="deliveredColor"
            :curve-type="CurveType.MonotoneX"
            :line-width="3"
          />
          <VisAxis
            type="x"
            :tick-format="formatAxisDate"
            :num-ticks="6"
            :grid-line="false"
            :domain-line="false"
            :tick-line="false"
          />
          <VisAxis
            type="y"
            :tick-format="formatAxisValue"
            :num-ticks="5"
            :domain-line="false"
            :tick-line="false"
          />
          <VisCrosshair
            :x="x"
            :y="canViewFinancials ? [sales, materialCosts, expenses] : [orders, delivered]"
            :color="canViewFinancials ? [salesColor, materialColor, expensesColor] : [ordersColor, deliveredColor]"
            :template="tooltipTemplate"
          />
        </VisXYContainer>

        <template #fallback>
          <USkeleton class="h-full w-full rounded-lg" />
        </template>
      </ClientOnly>
    </div>

    <div v-else class="flex h-80 flex-col items-center justify-center text-center">
      <div class="rounded-full bg-elevated p-3">
        <UIcon name="i-lucide-chart-no-axes-combined" class="size-6 text-dimmed" />
      </div>
      <p class="mt-3 font-medium text-highlighted">
        Todavía no hay movimiento
      </p>
      <p class="mt-1 max-w-xs text-sm text-muted">
        La tendencia aparecerá cuando existan órdenes en el periodo seleccionado.
      </p>
    </div>
  </UCard>
</template>

<style scoped>
.dashboard-chart-card {
  --vis-font-family: var(--font-sans);
  --vis-axis-grid-color: color-mix(in srgb, var(--ui-border) 72%, transparent);
  --vis-axis-grid-line-dasharray: 3 5;
  --vis-axis-tick-label-color: var(--ui-text-muted);
  --vis-crosshair-line-stroke-color: var(--ui-border-accented);
  --vis-tooltip-background-color: color-mix(in srgb, var(--ui-bg-elevated) 94%, transparent);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text);
  --vis-tooltip-border-radius: 0.75rem;
  --vis-tooltip-padding: 0;
  --vis-tooltip-box-shadow: var(--shadow-lg);
  --vis-tooltip-backdrop-filter: blur(12px);
}

.legend-sales {
  background-color: var(--ui-primary);
}

.legend-material {
  background-color: color-mix(in srgb, var(--ui-bg-inverted) 24%, var(--ui-bg-accented));
}

.legend-expenses {
  background-color: color-mix(in srgb, var(--ui-bg-inverted) 76%, var(--ui-bg-accented));
}

.legend-delivered {
  background-color: color-mix(in srgb, var(--ui-bg-inverted) 55%, var(--ui-bg-accented));
}

:global(.dashboard-chart-tooltip) {
  display: grid;
  min-width: 11rem;
  gap: 0.35rem;
  padding: 0.75rem 0.875rem;
  font-size: 0.75rem;
}

:global(.dashboard-chart-tooltip strong) {
  margin-bottom: 0.2rem;
  color: var(--ui-text-highlighted);
  font-size: 0.8125rem;
  text-transform: capitalize;
}

:global(.dashboard-chart-tooltip span) {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  color: var(--ui-text-muted);
}

:global(.dashboard-chart-tooltip b) {
  color: var(--ui-text-highlighted);
  font-weight: 600;
}
</style>
