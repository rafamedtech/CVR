<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

defineProps<{
  orders: OrderListItem[]
  loading?: boolean
  annual?: boolean
  upcoming?: boolean
  showFinancials?: boolean
  compact?: boolean
}>()
</script>

<template>
  <DashboardOrdersSection
    :title="upcoming ? 'Próximas entregas' : annual ? 'Entregas del año' : 'Entregas del mes'"
    :description="upcoming ? undefined : `Órdenes programadas para entrega en el ${annual ? 'año' : 'mes'} seleccionado`"
    :empty-message="upcoming ? 'No hay entregas programadas para los próximos 7 días.' : `No hay entregas programadas en este ${annual ? 'año' : 'mes'}.`"
    :orders="orders"
    :loading="loading"
    date-field="promisedAt"
    mobile-date="promisedAt"
    :show-financials="showFinancials"
    :compact="compact"
  />
</template>
