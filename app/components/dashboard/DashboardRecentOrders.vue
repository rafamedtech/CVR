<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

defineProps<{
  orders: OrderListItem[]
  loading?: boolean
  recent?: boolean
  showFinancials?: boolean
}>()
</script>

<template>
  <DashboardOrdersSection
    title="Órdenes recientes"
    :description="recent ? undefined : 'Última actividad del periodo seleccionado'"
    :empty-message="recent ? 'Todavía no hay órdenes registradas en este taller.' : 'No hay órdenes en este periodo.'"
    :orders="orders"
    :loading="loading"
    mobile-date="createdAt"
    :show-financials="showFinancials"
    customer-color="primary"
  />
</template>
