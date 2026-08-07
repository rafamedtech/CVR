<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

defineProps<{
  orders: OrderListItem[]
}>()
</script>

<template>
  <DashboardOrdersSection
    title="Entregas del mes"
    description="Órdenes programadas para entrega en el mes seleccionado"
    empty-message="No hay entregas programadas en este mes."
    :orders="orders"
    date-field="promisedAt"
    mobile-date="promisedAt"
  />
</template>
