<script setup lang="ts">
import type { DashboardActivityItem } from '~/types/crm'

const props = defineProps<{
  item: DashboardActivityItem
  canViewFinancials: boolean
  timeZone: string
}>()
const dateLabel = computed(() => new Intl.DateTimeFormat('es-MX', {
  timeZone: props.timeZone, day: 'numeric', month: 'short'
}).format(new Date(props.item.date)))
</script>

<template>
  <div class="space-y-1 md:text-right">
    <p v-if="item.type === 'order'" class="text-xs text-muted">
      <time :datetime="item.date">{{ dateLabel }}</time>
    </p>
    <OrdersStatusBadge
      v-if="item.status"
      :status="item.status"
    />
    <p v-if="item.type !== 'order'" class="text-xs text-muted">
      <time :datetime="item.date">{{ dateLabel }}</time>
    </p>
    <p
      v-if="canViewFinancials && item.amount !== undefined"
      class="font-medium tabular-nums"
      :class="item.type === 'payment' ? 'text-success' : 'text-highlighted'"
    >
      {{ item.type === 'expense' ? '−' : '+' }}{{ formatCurrency(item.amount) }}
    </p>
  </div>
</template>
