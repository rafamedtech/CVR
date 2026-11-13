<script setup lang="ts">
import type { OrderDetail } from '~/types/crm'
import { formatPhone } from '~/utils/crm'

defineProps<{ order: OrderDetail }>()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <DetailStatCard title="Cliente" icon="i-lucide-user-round">
      <template #value>
        <span class="text-lg leading-tight tracking-tight">{{ order.customerName }}</span>
      </template>
      <p class="mt-auto pt-3 text-sm text-muted">
        {{ formatPhone(order.customerPhone) }}
      </p>
    </DetailStatCard>
    <DetailStatCard title="Vehículo" icon="i-lucide-car">
      <template #value>
        <span class="text-lg leading-tight tracking-tight">{{ order.vehicleLabel }}</span>
      </template>
      <p class="mt-auto pt-3 text-sm text-muted">
        {{ order.licensePlate }}
      </p>
    </DetailStatCard>
    <DetailStatCard title="Entrega prometida" icon="i-lucide-calendar-clock">
      <template #value>
        <span class="text-lg leading-tight tracking-tight">{{ formatDate(order.promisedAt) }}</span>
      </template>
      <p class="mt-auto pt-3 text-sm text-muted">
        Responsable: {{ order.assignedToName || 'Sin responsable asignado' }}
      </p>
    </DetailStatCard>
    <DetailStatCard title="Saldo pendiente" icon="i-lucide-wallet">
      <template #value>
        <span class="text-[1.65rem] leading-none tracking-tight" :class="order.balance > 0 ? 'text-warning' : 'text-success'">{{ formatCurrency(order.balance) }}</span>
      </template>
      <p class="mt-auto pt-3 text-xs tabular-nums text-muted">
        de {{ formatCurrency(order.total) }} · MXN
      </p>
    </DetailStatCard>
  </div>
</template>
