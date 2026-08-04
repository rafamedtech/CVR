<script setup lang="ts">
import type { CustomerDetail } from '~/types/crm'
import { formatCurrency, formatCustomerAddress, formatPhone } from '~/utils/crm'

const props = defineProps<{
  customer: CustomerDetail
  showWorkshopBadge?: boolean
}>()

const workshopBadgeLabel = computed(() => {
  const types = new Set(props.customer.workshopTypes)

  if (types.has('BODY_SHOP') && types.has('MECHANICAL')) return 'Ambos talleres'
  if (types.has('BODY_SHOP')) return 'Taller de carrocería'
  if (types.has('MECHANICAL')) return 'Taller mecánico'
  if (types.has('PAINT_STORE')) return 'Tienda de pinturas'

  return props.customer.workshops.map(workshop => workshop.name).join(', ')
})

const customerTypeLabel = computed(() => {
  const types = new Set(props.customer.workshopTypes)

  if (types.has('BODY_SHOP') && types.has('MECHANICAL')) return 'Cliente de ambos talleres'
  if (types.has('BODY_SHOP')) return 'Cliente de taller de carrocería'
  if (types.has('MECHANICAL')) return 'Cliente de taller mecánico'
  if (types.has('PAINT_STORE')) return 'Cliente de tienda de pinturas'

  return 'Cliente'
})

const orderTotals = computed(() => props.customer.orders.reduce((totals, order) => ({
  total: totals.total + order.total,
  balance: totals.balance + order.balance
}), { total: 0, balance: 0 }))
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UIcon name="i-lucide-user-round" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-highlighted">
              Información de contacto
            </h2>
            <p class="mt-1 text-sm text-muted">
              {{ customerTypeLabel }}
            </p>
          </div>
          <UBadge
            v-if="showWorkshopBadge"
            :label="workshopBadgeLabel"
            color="primary"
            variant="subtle"
            class="shrink-0"
          />
        </div>
      </template>

      <dl class="grid gap-5 sm:grid-cols-2">
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Nombre del cliente
          </dt>
          <dd class="mt-1.5 text-default">
            {{ customer.fullName }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            RFC
          </dt>
          <dd class="mt-1.5 text-default">
            {{ customer.taxId || 'No registrado' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Teléfono principal
          </dt>
          <dd class="mt-1.5 text-default">
            {{ formatPhone(customer.phone) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Teléfono alterno
          </dt>
          <dd class="mt-1.5 text-default">
            {{ customer.alternatePhone ? formatPhone(customer.alternatePhone) : 'No registrado' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Correo electrónico
          </dt>
          <dd class="mt-1.5 break-words text-default">
            {{ customer.email || 'No registrado' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Domicilio
          </dt>
          <dd class="mt-1.5 whitespace-pre-wrap text-default">
            {{ formatCustomerAddress(customer.address) }}
          </dd>
        </div>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UIcon name="i-lucide-chart-column" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-highlighted">
              Resumen
            </h2>
            <p class="mt-1 text-sm text-muted">
              Actividad y saldo del cliente.
            </p>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-lg bg-elevated/60 p-4">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-car-front" class="size-4" />
            <span class="text-sm">Vehículos registrados</span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ customer.vehiclesCount }}
          </p>
        </div>
        <div class="rounded-lg bg-elevated/60 p-4">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-clipboard-list" class="size-4" />
            <span class="text-sm">Órdenes de trabajo</span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ customer.ordersCount }}
          </p>
        </div>
        <div class="rounded-lg bg-elevated/60 p-4">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-receipt-text" class="size-4" />
            <span class="text-sm">Total de órdenes</span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ formatCurrency(orderTotals.total) }}
          </p>
        </div>
        <div class="rounded-lg bg-elevated/60 p-4">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-hand-coins" class="size-4" />
            <span class="text-sm">Saldo pendiente</span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-warning">
            {{ formatCurrency(orderTotals.balance) }}
          </p>
        </div>
      </div>

      <div v-if="customer.notes" class="mt-6 border-t border-default pt-5">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">
          Notas
        </p>
        <p class="mt-2 whitespace-pre-wrap text-sm text-default">
          {{ customer.notes }}
        </p>
      </div>
    </UCard>
  </div>
</template>
