<script setup lang="ts">
import type { OrderDetail, OrderStatus } from '~/types/crm'

const route = useRoute()
const toast = useToast()
const savingStatus = shallowRef(false)
const orderId = computed(() => route.params.id as string)
const { canManageOrders, canRecordPayments } = useCrmSession()

const { data: order, status, refresh } = await useFetch<OrderDetail>(() => `/api/orders/${orderId.value}`, {
  key: `crm-order-${orderId.value}`
})

useHead({
  title: computed(() => order.value?.orderNumber ?? 'Orden')
})

const statusOptions = Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label }))

async function updateStatus(value: OrderStatus) {
  if (!order.value || value === order.value.status) return
  savingStatus.value = true
  try {
    await $fetch(`/api/orders/${order.value.id}`, {
      method: 'PATCH',
      body: { status: value }
    })
    toast.add({
      title: `Orden marcada como “${orderStatusLabels[value]}”`,
      color: 'success'
    })
    await refresh()
  } catch (error) {
    toast.add({ title: 'No se pudo cambiar el estado', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    savingStatus.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="order-detail">
    <template #header>
      <UDashboardNavbar :title="order?.orderNumber ?? 'Orden de trabajo'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/orders"
            label="Volver"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
          />
          <USelect
            v-if="order"
            :model-value="order.status"
            :items="statusOptions"
            value-key="value"
            :loading="savingStatus"
            class="w-52"
            @update:model-value="updateStatus($event as OrderStatus)"
          />
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="space-y-4">
        <USkeleton class="h-36 rounded-xl" />
        <USkeleton class="h-72 rounded-xl" />
      </div>

      <div v-else-if="order" class="space-y-6">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            :label="orderStatusLabels[order.status]"
            :color="orderStatusColors[order.status]"
            variant="subtle"
            size="lg"
          />
          <UBadge
            :label="orderPriorityLabels[order.priority]"
            :color="order.priority === 'URGENT' ? 'error' : order.priority === 'HIGH' ? 'warning' : 'neutral'"
            variant="subtle"
          />
          <span class="text-sm text-muted">{{ order.workshopName }}</span>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UCard>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Cliente
            </p>
            <p class="mt-2 font-semibold text-highlighted">
              {{ order.customerName }}
            </p>
            <p class="text-sm text-muted">
              {{ order.customerPhone }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Vehículo
            </p>
            <p class="mt-2 font-semibold text-highlighted">
              {{ order.vehicleLabel }}
            </p>
            <p class="text-sm text-muted">
              {{ order.licensePlate }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Entrega prometida
            </p>
            <p class="mt-2 font-semibold text-highlighted">
              {{ formatDate(order.promisedAt, true) }}
            </p>
            <p class="text-sm text-muted">
              {{ order.assignedToName || 'Sin responsable asignado' }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Saldo pendiente
            </p>
            <p class="mt-2 text-xl font-semibold" :class="order.balance > 0 ? 'text-warning' : 'text-success'">
              {{ formatCurrency(order.balance) }}
            </p>
            <p class="text-sm text-muted">
              de {{ formatCurrency(order.total) }}
            </p>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              Recepción y diagnóstico
            </h2>
          </template>
          <dl class="grid gap-5 md:grid-cols-2">
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-muted">
                Servicio solicitado
              </dt>
              <dd class="mt-2 whitespace-pre-wrap text-default">
                {{ order.complaint }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-muted">
                Diagnóstico
              </dt>
              <dd class="mt-2 whitespace-pre-wrap text-default">
                {{ order.diagnosis || 'Pendiente de diagnóstico' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-muted">
                Condiciones de recepción
              </dt>
              <dd class="mt-2 whitespace-pre-wrap text-default">
                {{ order.intakeNotes || 'Sin observaciones' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-muted">
                Datos de entrada
              </dt>
              <dd class="mt-2 text-default">
                {{ order.mileageIn?.toLocaleString('es-MX') ?? '—' }} km ·
                {{ order.fuelLevelIn ?? '—' }}% de combustible
              </dd>
            </div>
          </dl>
        </UCard>

        <div class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <OrdersOrderItemsCard
            :order-id="order.id"
            :items="order.items"
            :subtotal="order.subtotal"
            :tax-total="order.taxTotal"
            :total="order.total"
            :can-edit="canManageOrders"
            @updated="refresh"
          />
          <OrdersOrderPaymentsCard
            :order-id="order.id"
            :payments="order.payments"
            :balance="order.balance"
            :total="order.total"
            :can-record="canRecordPayments"
            @updated="refresh"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
