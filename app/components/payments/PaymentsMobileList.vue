<script setup lang="ts">
import type { PaymentListItem } from '~/types/crm'

const { workshopTimeZone } = useCrmSession()

const props = defineProps<{
  payments: PaymentListItem[]
  loading?: boolean
  filtered?: boolean
  showWorkshop?: boolean
}>()

function paymentFields(payment: PaymentListItem) {
  return [
    { label: 'Vehículo', value: payment.order.vehicleLabel },
    { label: 'Cliente', value: payment.order.customerName },
    { label: 'Total de la orden', value: formatCurrency(payment.order.total) },
    ...(payment.currency === 'USD' ? [{ label: 'Aplicado en MXN', value: formatCurrency(payment.amountMxn) }] : []),
    ...(props.showWorkshop ? [{ label: 'Taller', value: payment.workshopName, fullWidth: true }] : [])
  ]
}
</script>

<template>
  <div v-if="loading" class="space-y-3" aria-hidden="true">
    <UCard v-for="index in 3" :key="index" :ui="{ body: 'p-4 sm:p-4' }">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <USkeleton class="motion-reduce:animate-none h-5 w-28" />
          <USkeleton class="motion-reduce:animate-none h-6 w-24" />
        </div>
        <USkeleton class="motion-reduce:animate-none h-14 w-full" />
        <div class="grid grid-cols-2 gap-3">
          <USkeleton class="motion-reduce:animate-none h-10 w-full" />
          <USkeleton class="motion-reduce:animate-none h-10 w-full" />
        </div>
      </div>
    </UCard>
  </div>

  <div v-else-if="payments.length" class="space-y-3">
    <ListRecordCard
      v-for="payment in payments"
      :key="payment.id"
      :title="payment.order.orderNumber"
      :title-to="`/ordenes/${payment.order.id}`"
      :eyebrow="formatDate(payment.paidAt, false, workshopTimeZone(payment.workshopId))"
      :fields="paymentFields(payment)"
    >
      <template #trailing>
        <p class="font-semibold text-success tabular-nums">
          {{ formatCurrency(payment.amount, payment.currency) }}
        </p>
      </template>

      <template #footer>
        <div class="flex flex-wrap gap-2">
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
      </template>
    </ListRecordCard>
  </div>

  <UCard v-else>
    <div class="py-8 text-center">
      <UIcon name="i-lucide-hand-coins" class="mx-auto size-9 text-dimmed" />
      <p class="mt-3 font-medium text-highlighted">
        {{ filtered ? 'No hay pagos que coincidan con la búsqueda' : 'No hay pagos registrados' }}
      </p>
      <p class="text-sm text-muted">
        Los pagos de las órdenes aparecerán aquí.
      </p>
    </div>
  </UCard>
</template>
