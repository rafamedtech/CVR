<script setup lang="ts">
import type { DashboardData } from '~/types/crm'

const props = defineProps<{
  kpis: DashboardData['kpis']
  canViewFinancials?: boolean
}>()

const financialCards = computed(() => [{
  label: 'Ventas',
  value: formatCurrency(props.kpis.sales),
  description: 'Órdenes aprobadas del periodo',
  icon: 'i-lucide-chart-no-axes-combined',
  color: 'text-primary'
}, {
  label: 'Cobrado',
  value: formatCurrency(props.kpis.collected),
  description: 'Pagos recibidos',
  icon: 'i-lucide-hand-coins',
  color: 'text-success'
}, {
  label: 'Utilidad bruta',
  value: formatCurrency(props.kpis.grossProfit),
  description: 'Ventas menos costo de partes',
  icon: 'i-lucide-trending-up',
  color: props.kpis.grossProfit >= 0 ? 'text-success' : 'text-error'
}, {
  label: 'Utilidad neta',
  value: formatCurrency(props.kpis.netProfit),
  description: 'Después de gastos operativos',
  icon: 'i-lucide-badge-dollar-sign',
  color: props.kpis.netProfit >= 0 ? 'text-success' : 'text-error'
}, {
  label: 'Por cobrar',
  value: formatCurrency(props.kpis.receivable),
  description: 'Saldo pendiente acumulado',
  icon: 'i-lucide-wallet-cards',
  color: 'text-warning'
}, {
  label: 'Órdenes abiertas',
  value: props.kpis.openOrders.toLocaleString('es-MX'),
  description: 'Desde cotización hasta entrega',
  icon: 'i-lucide-wrench',
  color: 'text-info'
}, {
  label: 'Ticket promedio',
  value: formatCurrency(props.kpis.averageTicket),
  description: 'Promedio del periodo',
  icon: 'i-lucide-receipt',
  color: 'text-primary'
}])

const operationalCards = computed(() => [{
  label: 'Órdenes terminadas',
  value: props.kpis.completedOrders.toLocaleString('es-MX'),
  description: 'Entregadas en el periodo',
  icon: 'i-lucide-circle-check-big',
  color: 'text-success'
}])

const cards = computed(() => props.canViewFinancials
  ? [...financialCards.value, ...operationalCards.value]
  : [{
      label: 'Órdenes abiertas',
      value: props.kpis.openOrders.toLocaleString('es-MX'),
      description: 'Trabajos activos asignados',
      icon: 'i-lucide-wrench',
      color: 'text-info'
    }, ...operationalCards.value])
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <UCard v-for="card in cards" :key="card.label">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm text-muted">
            {{ card.label }}
          </p>
          <p class="mt-2 text-2xl font-semibold tracking-tight text-highlighted">
            {{ card.value }}
          </p>
          <p class="mt-1 text-xs text-dimmed">
            {{ card.description }}
          </p>
        </div>
        <div class="rounded-lg bg-elevated p-2.5">
          <UIcon :name="card.icon" class="size-5" :class="card.color" />
        </div>
      </div>
    </UCard>
  </div>
</template>
