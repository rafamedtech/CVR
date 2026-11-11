<script setup lang="ts">
import type { DashboardData } from '~/types/crm'

const props = defineProps<{
  kpis: Pick<DashboardData['kpis'], 'collected' | 'receivable' | 'openOrders' | 'completedOrders'>
  canViewFinancials?: boolean
  recent?: boolean
}>()

const financialCards = computed(() => [{
  label: 'Cobrado',
  value: formatCurrency(props.kpis.collected),
  description: props.recent ? 'Recibido en los últimos 30 días' : 'Pagos recibidos en el periodo'
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
  description: props.recent ? 'Entregadas en los últimos 30 días' : 'Entregadas en el periodo'
}])

const cards = computed(() => (props.canViewFinancials
  ? [...financialCards.value, ...operationalCards.value]
  : operationalCards.value))
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2" :class="cards.length > 2 ? 'xl:grid-cols-4' : ''">
    <DetailStatCard
      v-for="card in cards"
      :key="card.label"
      :title="card.label"
      :value="card.value"
    >
      <p class="text-xs text-muted">
        {{ card.description }}
      </p>
    </DetailStatCard>
  </div>
</template>
