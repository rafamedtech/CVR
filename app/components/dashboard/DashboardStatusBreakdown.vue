<script setup lang="ts">
import { VisDonut, VisSingleContainer } from '@unovis/vue'
import type { DashboardData, OrderStatus } from '~/types/crm'

interface StatusDatum {
  status: OrderStatus
  count: number
  color: string
}

const props = defineProps<{
  items: DashboardData['statusCounts']
}>()

const statusChartColors: Record<OrderStatus, string> = {
  ESTIMATE: '#94a3b8',
  AWAITING_APPROVAL: '#f59e0b',
  APPROVED: '#38bdf8',
  IN_PROGRESS: '#2563eb',
  QUALITY_CONTROL: '#8b5cf6',
  READY: '#14b8a6',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444'
}

const total = computed(() => props.items.reduce((sum, item) => sum + item.count, 0))
const chartItems = computed<StatusDatum[]>(() => props.items
  .filter(item => item.count > 0)
  .map(item => ({
    ...item,
    color: statusChartColors[item.status]
  }))
  .sort((a, b) => b.count - a.count))

const value = (datum: StatusDatum) => datum.count
const color = (datum: StatusDatum) => datum.color

function percentage(count: number) {
  return total.value ? Math.round((count / total.value) * 100) : 0
}
</script>

<template>
  <UCard class="status-card">
    <template #header>
      <div>
        <h2 class="font-semibold text-highlighted">
          Estado de las órdenes
        </h2>
        <p class="text-sm text-muted">
          Composición del trabajo en el periodo
        </p>
      </div>
    </template>

    <div v-if="chartItems.length" class="grid items-center gap-6 sm:grid-cols-[13rem_1fr] xl:grid-cols-1 2xl:grid-cols-[13rem_1fr]">
      <div
        class="mx-auto h-52 w-52"
        role="img"
        :aria-label="`Distribución de ${total} órdenes por estado`"
      >
        <ClientOnly>
          <VisSingleContainer :data="chartItems">
            <VisDonut
              :value="value"
              :color="color"
              :arc-width="26"
              :corner-radius="4"
              :pad-angle="0.025"
              :central-label="total.toLocaleString('es-MX')"
              central-sub-label="órdenes"
            />
          </VisSingleContainer>
        </ClientOnly>
      </div>

      <ul class="space-y-3" aria-label="Detalle de órdenes por estado">
        <li
          v-for="item in chartItems"
          :key="item.status"
          class="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 text-sm"
        >
          <span class="size-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
          <span class="truncate text-default">{{ orderStatusLabels[item.status] }}</span>
          <span class="tabular-nums text-muted">
            <strong class="font-semibold text-highlighted">{{ item.count }}</strong>
            · {{ percentage(item.count) }}%
          </span>
        </li>
      </ul>
    </div>

    <div v-else class="flex h-52 flex-col items-center justify-center text-center">
      <UIcon name="i-lucide-chart-pie" class="size-7 text-dimmed" />
      <p class="mt-3 text-sm text-muted">
        Sin actividad para mostrar.
      </p>
    </div>
  </UCard>
</template>

<style scoped>
.status-card {
  --vis-font-family: var(--font-sans);
  --vis-donut-background-color: color-mix(in srgb, var(--ui-bg-accented) 72%, transparent);
  --vis-donut-central-label-text-color: var(--ui-text-highlighted);
  --vis-donut-central-sub-label-text-color: var(--ui-text-muted);
  --vis-donut-central-label-font-size: 1.5rem;
}
</style>
