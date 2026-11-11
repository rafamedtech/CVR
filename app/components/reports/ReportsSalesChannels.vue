<script setup lang="ts">
import { reportCurrency } from '~/utils/reportPeriods'
import type { SalesChannelRow } from '#shared/report-sales-channels'
import { dashboardNumber } from '~/utils/dashboardFormatters'

const props = withDefaults(defineProps<{
  channels: SalesChannelRow[]
  id?: string
  title?: string
  description?: string
  compact?: boolean
}>(), {
  id: 'reports-sales-channels',
  title: 'Ventas por canal',
  description: 'Mostrador, vendedor y clientes internos, según el cliente del pedido.'
})
const total = computed(() => props.channels.reduce((sum, item) => sum + item.amount, 0))
const channelColors: Record<string, string> = {
  counter: 'bg-primary',
  seller: 'bg-success',
  internal: 'bg-warning',
  workshop: 'bg-violet-500'
}
const channelFills: Record<string, string> = {
  counter: 'fill-primary',
  seller: 'fill-success',
  internal: 'fill-warning',
  workshop: 'fill-violet-500'
}
const rows = computed(() => props.channels.map((channel, index) => {
  const previous = channel.previousAmount
  return {
    ...channel,
    previous,
    change: previous ? (channel.amount - previous) / previous * 100 : null,
    color: channelColors[channel.key] ?? ['bg-violet-500', 'bg-sky-500'][index % 2],
    fill: channelFills[channel.key] ?? ['fill-violet-500', 'fill-sky-500'][index % 2]
  }
}))
const slices = computed(() => {
  let angle = -Math.PI / 2
  return rows.value.filter(channel => channel.amount > 0).map((channel) => {
    const start = angle
    angle += channel.amount / total.value * Math.PI * 2
    const middle = (start + angle) / 2
    const point = (value: number) => `${100 + 90 * Math.cos(value)} ${100 + 90 * Math.sin(value)}`
    return {
      ...channel,
      path: `M 100 100 L ${point(start)} A 90 90 0 0 1 ${point(middle)} A 90 90 0 0 1 ${point(angle)} Z`
    }
  })
})
</script>

<template>
  <DetailCard :id="id" class="min-w-0" :ui="{ container: 'min-w-0' }">
    <template #title>
      <DetailSectionHeading :title="title" :description="description" :ui="{ title: 'text-base' }" />
    </template>

    <div class="flex flex-col items-center gap-6" :class="compact ? 'sm:flex-row' : 'lg:flex-row'">
      <svg
        viewBox="0 0 200 200"
        class="shrink-0"
        :class="compact ? 'size-36' : 'size-48'"
        role="img"
        :aria-label="total > 0 ? channels.map(item => `${item.label}: ${reportCurrency.format(item.amount)}, ${item.percentage}%`).join('. ') : 'Sin ventas en este periodo'"
      >
        <circle
          v-if="!total"
          cx="100"
          cy="100"
          r="90"
          class="fill-elevated"
        />
        <path
          v-for="slice in slices"
          :key="slice.key"
          :d="slice.path"
          :class="slice.fill"
          class="stroke-default"
          stroke-width="2"
          stroke-linejoin="round"
        >
          <title>{{ slice.label }}: {{ reportCurrency.format(slice.amount) }} · {{ slice.percentage }}%</title>
        </path>
      </svg>

      <DetailFields :fields="rows.map(channel => ({ key: channel.key, label: channel.label }))" :columns="compact ? 1 : channels.length > 3 ? 4 : 3" class="w-full min-w-0">
        <template #label="{ field }">
          <span v-for="channel in rows.filter(channel => channel.key === field.key)" :key="channel.key" class="flex items-center gap-2">
            <span class="size-2.5 rounded-full" :class="channel.color" />
            {{ channel.label }}
            <span class="ml-auto tabular-nums">{{ channel.percentage }}%</span>
          </span>
        </template>
        <template #value="{ field }">
          <template v-for="channel in rows.filter(channel => channel.key === field.key)" :key="channel.key">
            <p class="text-lg font-semibold tabular-nums text-highlighted">
              {{ reportCurrency.format(channel.amount) }}
            </p>
            <p class="mt-0.5 text-xs text-muted tabular-nums">
              {{ channel.count }} {{ channel.count === 1 ? 'venta' : 'ventas' }}
              · ant. {{ reportCurrency.format(channel.previous) }}
              <span v-if="channel.change !== null" :class="channel.change >= 0 ? 'text-success' : 'text-error'">
                ({{ channel.change > 0 ? '+' : '' }}{{ dashboardNumber.format(channel.change) }}%)
              </span>
            </p>
          </template>
        </template>
      </DetailFields>
    </div>

    <p v-if="!total" class="mt-5 text-sm text-muted">
      Sin ventas en este periodo.
    </p>
  </DetailCard>
</template>
