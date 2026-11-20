<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

withDefaults(defineProps<{
  orders: OrderListItem[]
  loading?: boolean
  showWorkshop?: boolean
  showCustomer?: boolean
  showVehicle?: boolean
  showCreatedAt?: boolean
  showPromisedAt?: boolean
  showFinancials?: boolean
  emptyMessage?: string
}>(), {
  showFinancials: true
})
</script>

<template>
  <div v-if="loading" class="space-y-3" aria-hidden="true">
    <DetailCard v-for="index in 3" :key="index" :ui="{ container: 'p-4 sm:p-4 gap-0' }">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <USkeleton class="motion-reduce:animate-none h-5 w-28" />
          <USkeleton class="motion-reduce:animate-none h-6 w-24" />
        </div>
        <USkeleton class="motion-reduce:animate-none h-12 w-full" />
        <div class="grid grid-cols-2 gap-3">
          <USkeleton class="motion-reduce:animate-none h-10 w-full" />
          <USkeleton class="motion-reduce:animate-none h-10 w-full" />
        </div>
      </div>
    </DetailCard>
  </div>

  <div v-else-if="orders.length" class="space-y-3">
    <ListRecordCard
      v-for="order in orders"
      :key="order.id"
      :title="order.orderNumber"
      :title-to="`/ordenes/${order.id}`"
      :eyebrow="showCreatedAt ? formatDate(order.createdAt) : undefined"
      :summary-label="showFinancials ? 'Importe' : undefined"
      :summary-value="showFinancials ? formatCurrency(order.total) : undefined"
      summary-color="primary"
    >
      <template #title-extra>
        <UBadge
          v-if="order.priority !== 'NORMAL'"
          :label="orderPriorityLabels[order.priority]"
          :color="order.priority === 'URGENT' ? 'error' : 'warning'"
          variant="subtle"
          size="sm"
          class="mt-1"
        />
      </template>

      <template #trailing>
        <OrdersStatusBadge :status="order.status" />
      </template>

      <div v-if="showCustomer || showVehicle">
        <template v-if="showCustomer && showVehicle">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-medium break-words text-highlighted">
              {{ order.vehicleLabel }}
            </p>
            <UBadge
              v-if="order.licensePlate"
              :label="order.licensePlate"
              color="neutral"
              variant="subtle"
              size="sm"
            />
            <span v-else class="text-xs text-muted">Sin placas</span>
          </div>
          <p class="mt-1 text-xs text-primary">
            {{ order.customerName }}
          </p>
        </template>
        <template v-else-if="showCustomer">
          <p class="font-medium text-primary">
            {{ order.customerName }}
          </p>
          <p class="text-xs text-muted">
            {{ formatPhone(order.customerPhone) }}
          </p>
        </template>
        <template v-else-if="showVehicle">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-medium text-primary">
              {{ order.vehicleLabel }}
            </p>
            <UBadge
              v-if="order.vehicleColor"
              :label="order.vehicleColor"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </div>
          <UBadge
            v-if="order.licensePlate"
            :label="order.licensePlate"
            color="neutral"
            variant="subtle"
            size="sm"
            class="mt-1"
          />
          <p v-else class="mt-1 text-xs text-muted">
            Sin placas
          </p>
        </template>
      </div>

      <DetailFields
        v-if="showPromisedAt && order.promisedAt"
        :fields="[{ label: 'Entrega', value: formatDate(order.promisedAt) }]"
      />

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-3">
          <OrdersWorkshopBadge v-if="showWorkshop" :order="order" />
          <p class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <UIcon name="i-lucide-user-round" class="size-4 shrink-0" aria-hidden="true" />
            <span class="break-words">{{ order.assignedToName || 'Sin responsable asignado' }}</span>
          </p>
        </div>
      </template>
    </ListRecordCard>
  </div>

  <DetailCard v-else>
    <div class="py-8 text-center">
      <UIcon name="i-lucide-clipboard-list" class="mx-auto size-9 text-dimmed" />
      <p class="mt-3 font-medium text-highlighted">
        No hay órdenes
      </p>
      <p class="text-sm text-muted">
        {{ emptyMessage ?? 'Crea una cotización para comenzar el seguimiento.' }}
      </p>
    </div>
  </DetailCard>
</template>
