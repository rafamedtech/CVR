<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

defineProps<{
  orders: OrderListItem[]
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">
            Órdenes recientes
          </h2>
          <p class="text-sm text-muted">
            Actividad del periodo seleccionado
          </p>
        </div>
        <UButton
          to="/orders"
          label="Ver todas"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-arrow-right"
        />
      </div>
    </template>

    <div v-if="orders.length" class="divide-y divide-default">
      <NuxtLink
        v-for="order in orders"
        :key="order.id"
        :to="`/orders/${order.id}`"
        class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-highlighted">{{ order.orderNumber }}</span>
            <UBadge
              :label="orderStatusLabels[order.status]"
              :color="orderStatusColors[order.status]"
              variant="subtle"
              size="sm"
            />
          </div>
          <p class="truncate text-sm text-muted">
            {{ order.customerName }} · {{ order.vehicleLabel }}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="font-medium text-highlighted">{{ formatCurrency(order.total) }}</p>
          <p class="text-xs text-muted">{{ order.workshopName }}</p>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="py-8 text-center text-sm text-muted">
      No hay órdenes en este periodo.
    </div>
  </UCard>
</template>
