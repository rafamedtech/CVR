<script setup lang="ts">
import type { DashboardData } from '~/types/crm'

const props = defineProps<{
  kpis: DashboardData['kpis']
  canViewFinancials?: boolean
}>()

const financialCards = computed(() => [{
  label: 'Cobrado',
  value: formatCurrency(props.kpis.collected),
  description: 'Pagos recibidos en el periodo'
}, {
  label: 'Por cobrar',
  value: formatCurrency(props.kpis.receivable),
  description: 'Saldo pendiente acumulado'
}])

const operationalCards = computed(() => [{
  label: 'Órdenes abiertas',
  value: props.kpis.openOrders.toLocaleString('es-MX'),
  description: 'Desde cotización hasta entrega'
}, {
  label: 'Órdenes terminadas',
  value: props.kpis.completedOrders.toLocaleString('es-MX'),
  description: 'Entregadas en el periodo'
}])

const cards = computed(() => (props.canViewFinancials
  ? [...financialCards.value, ...operationalCards.value]
  : operationalCards.value))
</script>

<template>
  <dl
    class="grid overflow-hidden rounded-xl ring ring-default sm:grid-cols-2"
    :class="cards.length > 2 ? 'xl:grid-cols-4' : ''"
  >
    <div
      v-for="card in cards"
      :key="card.label"
      class="kpi-cell px-5 py-4"
    >
      <dt class="text-xs font-medium uppercase tracking-widest text-dimmed">
        {{ card.label }}
      </dt>
      <dd class="mt-2 text-xl font-semibold tabular-nums tracking-tight text-highlighted">
        {{ card.value }}
      </dd>
      <p class="mt-1 text-xs text-muted">
        {{ card.description }}
      </p>
    </div>
  </dl>
</template>

<style scoped>
.kpi-cell {
  background-color: var(--ui-bg);
  box-shadow: inset 1px 1px 0 0 var(--ui-border);
}

.kpi-cell:first-child {
  box-shadow: none;
}

@media (min-width: 640px) {
  .kpi-cell:nth-child(2n + 1) {
    box-shadow: inset 0 1px 0 0 var(--ui-border);
  }

  .kpi-cell:nth-child(-n + 2) {
    box-shadow: inset 1px 0 0 0 var(--ui-border);
  }

  .kpi-cell:first-child {
    box-shadow: none;
  }
}

@media (min-width: 1280px) {
  .kpi-cell {
    box-shadow: inset 1px 0 0 0 var(--ui-border);
  }

  .kpi-cell:first-child {
    box-shadow: none;
  }
}
</style>
