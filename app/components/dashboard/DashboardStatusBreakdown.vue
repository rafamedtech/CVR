<script setup lang="ts">
import type { DashboardData } from '~/types/crm'

const props = defineProps<{
  items: DashboardData['statusCounts']
}>()

const total = computed(() => props.items.reduce((sum, item) => sum + item.count, 0))
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h2 class="font-semibold text-highlighted">
          Estado de las órdenes
        </h2>
        <p class="text-sm text-muted">
          {{ total }} órdenes con venta en el periodo
        </p>
      </div>
    </template>

    <div v-if="items.length" class="space-y-4">
      <div v-for="item in items" :key="item.status">
        <div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
          <span class="text-default">{{ orderStatusLabels[item.status] }}</span>
          <span class="font-medium text-highlighted">{{ item.count }}</span>
        </div>
        <UProgress :model-value="total ? (item.count / total) * 100 : 0" size="sm" />
      </div>
    </div>
    <div v-else class="py-8 text-center text-sm text-muted">
      Sin actividad para mostrar.
    </div>
  </UCard>
</template>
