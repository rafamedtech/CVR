<script setup lang="ts">
import type { PaymentListItem } from '~/types/crm'

defineProps<{
  payments: PaymentListItem[]
  loading?: boolean
  showWorkshop?: boolean
}>()
</script>

<template>
  <div v-if="loading" class="space-y-3" aria-label="Cargando pagos registrados">
    <UCard v-for="index in 3" :key="index" :ui="{ body: 'p-4 sm:p-4' }">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <USkeleton class="h-5 w-28" />
          <USkeleton class="h-6 w-24" />
        </div>
        <USkeleton class="h-14 w-full" />
        <div class="grid grid-cols-2 gap-3">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>
      </div>
    </UCard>
  </div>

  <div v-else-if="payments.length" class="space-y-3">
    <UCard
      v-for="payment in payments"
      :key="payment.id"
      :ui="{ body: 'p-4 sm:p-4' }"
    >
      <article :aria-labelledby="`payment-${payment.id}`">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <NuxtLink
              :id="`payment-${payment.id}`"
              :to="`/ordenes/${payment.order.id}`"
              class="font-semibold text-primary hover:underline"
            >
              {{ payment.order.orderNumber }}
            </NuxtLink>
            <p class="mt-1 text-xs text-muted">
              {{ formatDate(payment.paidAt) }}
            </p>
          </div>
          <p class="shrink-0 font-semibold text-success">
            {{ formatCurrency(payment.amount, payment.currency) }}
          </p>
        </div>

        <div class="mt-4 rounded-md bg-elevated/50 p-3">
          <p class="font-medium text-highlighted">
            {{ payment.order.vehicleLabel }}
          </p>
          <p class="mt-1 text-xs text-primary">
            {{ payment.order.customerName }}
          </p>
          <p class="mt-1 text-xs text-muted">
            Total de la orden: {{ formatCurrency(payment.order.total) }}
          </p>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge
            :label="paymentMethodLabels[payment.method]"
            color="neutral"
            variant="subtle"
          />
          <UBadge
            v-if="payment.reference"
            :label="`Ref. ${payment.reference}`"
            color="neutral"
            variant="soft"
          />
        </div>

        <dl
          v-if="payment.currency === 'USD' || showWorkshop"
          class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3"
        >
          <div v-if="payment.currency === 'USD'">
            <dt class="text-xs text-muted">
              Aplicado en MXN
            </dt>
            <dd class="mt-0.5 text-sm font-medium text-default">
              {{ formatCurrency(payment.amountMxn) }}
            </dd>
          </div>
          <div v-if="showWorkshop" class="col-span-2">
            <dt class="text-xs text-muted">
              Taller
            </dt>
            <dd class="mt-0.5 text-sm text-default">
              {{ payment.workshopName }}
            </dd>
          </div>
        </dl>
      </article>
    </UCard>
  </div>

  <UCard v-else>
    <div class="py-8 text-center">
      <UIcon name="i-lucide-hand-coins" class="mx-auto size-9 text-dimmed" />
      <p class="mt-3 font-medium text-highlighted">
        No hay pagos registrados
      </p>
      <p class="text-sm text-muted">
        Los pagos de las órdenes aparecerán aquí.
      </p>
    </div>
  </UCard>
</template>
