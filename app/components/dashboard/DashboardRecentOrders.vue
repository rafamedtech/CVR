<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

defineProps<{
  orders: OrderListItem[]
}>()
</script>

<template>
  <DashboardOrdersSection
    title="Órdenes recientes"
    description="Última actividad del periodo seleccionado"
    empty-message="No hay órdenes en este periodo."
    :orders="orders"
    mobile-date="createdAt"
  />
</template>
