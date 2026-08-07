<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

defineProps<{
  orders: OrderListItem[]
  loading?: boolean
  showWorkshop?: boolean
  showCustomer?: boolean
  showVehicle?: boolean
  showCreatedAt?: boolean
}>()
</script>

<template>
  <div v-if="loading" class="space-y-3" aria-label="Cargando órdenes de trabajo">
    <UCard v-for="index in 3" :key="index" :ui="{ body: 'p-4 sm:p-4' }">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <USkeleton class="h-5 w-28" />
          <USkeleton class="h-6 w-24" />
        </div>
        <USkeleton class="h-12 w-full" />
        <div class="grid grid-cols-2 gap-3">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>
      </div>
    </UCard>
  </div>

  <div v-else-if="orders.length" class="space-y-3">
    <UCard
      v-for="order in orders"
      :key="order.id"
      :ui="{ body: 'p-4 sm:p-4' }"
    >
      <article :aria-labelledby="`order-${order.id}`">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <NuxtLink
              :id="`order-${order.id}`"
              :to="`/ordenes/${order.id}`"
              class="font-semibold text-primary hover:underline"
            >
              {{ order.orderNumber }}
            </NuxtLink>
            <UBadge
              v-if="order.priority !== 'NORMAL'"
              :label="orderPriorityLabels[order.priority]"
              :color="order.priority === 'URGENT' ? 'error' : 'warning'"
              variant="subtle"
              size="sm"
            />
          </div>

          <UBadge
            :label="orderStatusLabels[order.status]"
            :color="orderStatusColors[order.status]"
            variant="subtle"
            class="shrink-0"
          />
        </div>

        <div class="mt-4">
          <template v-if="showCustomer && showVehicle">
            <p class="font-medium text-highlighted">
              {{ order.customerName }}
            </p>
            <div class="mt-1 flex items-center gap-2">
              <p class="text-xs text-primary">
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
          </template>
          <template v-else-if="showCustomer">
            <p class="font-medium text-highlighted">
              {{ order.customerName }}
            </p>
            <p class="text-xs text-muted">
              {{ formatPhone(order.customerPhone) }}
            </p>
          </template>
          <template v-else>
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

        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <div v-if="showCreatedAt">
            <dt class="text-xs text-muted">
              Fecha
            </dt>
            <dd class="mt-0.5 text-sm text-default">
              {{ formatDate(order.createdAt) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">
              Importe
            </dt>
            <dd class="mt-0.5 font-medium text-highlighted">
              {{ formatCurrency(order.total) }}
            </dd>
          </div>
          <div v-if="showWorkshop">
            <dt class="text-xs text-muted">
              Taller
            </dt>
            <dd class="mt-0.5 text-sm text-default">
              {{ order.workshopName }}
            </dd>
          </div>
        </dl>
      </article>
    </UCard>
  </div>

  <UCard v-else>
    <div class="py-8 text-center">
      <UIcon name="i-lucide-clipboard-list" class="mx-auto size-9 text-dimmed" />
      <p class="mt-3 font-medium text-highlighted">
        No hay órdenes
      </p>
      <p class="text-sm text-muted">
        Crea una cotización para comenzar el seguimiento.
      </p>
    </div>
  </UCard>
</template>
