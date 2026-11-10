<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

defineProps<{
  orders: OrderListItem[]
  annual?: boolean
}>()
</script>

<template>
  <DashboardOrdersSection
    :title="annual ? 'Entregas del año' : 'Entregas del mes'"
    :description="`Órdenes programadas para entrega en el ${annual ? 'año' : 'mes'} seleccionado`"
    :empty-message="`No hay entregas programadas en este ${annual ? 'año' : 'mes'}.`"
    :orders="orders"
    date-field="promisedAt"
    mobile-date="promisedAt"
  />
</template>
