<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { OrderDetail, OrderStatus } from '~/types/crm'
import { formatPhone } from '~/utils/crm'

const route = useRoute()
const toast = useToast()
const savingStatus = shallowRef(false)
const editOpen = shallowRef(false)
const deleteOpen = shallowRef(false)
const deleting = shallowRef(false)
const orderId = computed(() => route.params.id as string)
const { isSuperAdmin, canRecordExpenses } = useCrmSession()

const { data: order, status, refresh } = await useFetch<OrderDetail>(() => `/api/orders/${orderId.value}`, {
  key: `crm-order-${orderId.value}`
})

const totalExpenses = computed(() => order.value?.expenses.reduce((sum, expense) => sum + expense.amount, 0) ?? 0)

useHead({
  title: computed(() => order.value?.orderNumber ?? 'Orden')
})

const statusOptions = Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label }))
const orderActionItems: DropdownMenuItem[] = [{
  label: 'Editar',
  icon: 'i-lucide-pencil',
  onSelect: () => editOpen.value = true
}, {
  label: 'Eliminar',
  icon: 'i-lucide-trash-2',
  color: 'error',
  onSelect: () => deleteOpen.value = true
}]
const statusSelectClasses: Record<OrderStatus, string> = {
  ESTIMATE: 'bg-elevated text-default ring ring-inset ring-accented',
  AWAITING_APPROVAL: 'bg-warning/10 text-warning ring ring-inset ring-warning/25',
  APPROVED: 'bg-info/10 text-info ring ring-inset ring-info/25',
  IN_PROGRESS: 'bg-primary/10 text-primary ring ring-inset ring-primary/25',
  QUALITY_CONTROL: 'bg-secondary/10 text-secondary ring ring-inset ring-secondary/25',
  READY: 'bg-success/10 text-success ring ring-inset ring-success/25',
  DELIVERED: 'bg-success/10 text-success ring ring-inset ring-success/25',
  CANCELLED: 'bg-error/10 text-error ring ring-inset ring-error/25'
}

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

async function deleteOrder() {
  if (!order.value) return

  deleting.value = true
  try {
    await $fetch(`/api/orders/${order.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Orden eliminada', color: 'success', icon: 'i-lucide-check' })
    await navigateTo('/ordenes')
  } catch (error) {
    toast.add({ title: 'No se pudo eliminar la orden', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    deleting.value = false
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
            to="/ordenes"
            label="Volver"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
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
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-muted">{{ order.workshopName }}</span>
          </div>

          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div class="grid grid-cols-2 items-center gap-2 sm:flex sm:items-center">
              <UBadge
                v-if="order.priority !== 'NORMAL'"
                :label="orderPriorityLabels[order.priority]"
                :color="order.priority === 'URGENT' ? 'error' : order.priority === 'HIGH' ? 'warning' : 'neutral'"
                variant="subtle"
                size="lg"
                class="col-span-2 h-9 w-full justify-center sm:w-auto md:h-8"
              />
              <UDropdownMenu
                v-if="isSuperAdmin"
                :items="orderActionItems"
                :content="{ align: 'end' }"
              >
                <UButton
                  label="Opciones"
                  icon="i-lucide-settings-2"
                  trailing-icon="i-lucide-chevron-down"
                  color="neutral"
                  variant="outline"
                  class="w-full justify-center sm:w-auto"
                />
              </UDropdownMenu>
              <UBadge
                :label="paymentStatusLabels[order.paymentStatus]"
                :color="paymentStatusColors[order.paymentStatus]"
                variant="subtle"
                size="xl"
                class="h-10 w-full justify-center sm:w-auto"
                :class="!isSuperAdmin && 'col-span-2'"
              />
              <USelectMenu
                :model-value="order.status"
                :color="orderStatusColors[order.status]"
                variant="subtle"
                :items="statusOptions"
                value-key="value"
                :search-input="false"
                :loading="savingStatus"
                :disabled="!isSuperAdmin"
                class="col-span-2 min-w-40 w-full sm:min-w-0 sm:w-48"
                :ui="{
                  base: statusSelectClasses[order.status],
                  trailingIcon: 'text-current',
                  content: 'max-h-none',
                  viewport: 'overflow-y-visible'
                }"
                @update:model-value="updateStatus($event as OrderStatus)"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UCard>
            <p class="text-xs font-medium uppercase tracking-wide text-primary">
              Cliente
            </p>
            <p class="mt-2 font-semibold text-highlighted">
              {{ order.customerName }}
            </p>
            <p class="text-sm text-muted">
              {{ formatPhone(order.customerPhone) }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs font-medium uppercase tracking-wide text-primary">
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
            <p class="text-xs font-medium uppercase tracking-wide text-primary">
              Entrega prometida
            </p>
            <p class="mt-2 font-semibold text-highlighted">
              {{ formatDate(order.promisedAt) }}
            </p>
            <p class="text-sm text-muted">
              Responsable: {{ order.assignedToName || 'Sin responsable asignado' }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs font-medium uppercase tracking-wide text-primary">
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

        <div
          class="grid gap-6"
          :class="order.canViewFinancials ? 'xl:grid-cols-[1.4fr_1fr]' : 'grid-cols-1'"
        >
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="font-semibold text-highlighted">
                  Recepción
                </h2>
                <UIcon name="i-lucide-clipboard-list" class="size-5 shrink-0 text-primary" />
              </div>
            </template>
            <dl class="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-muted">
                  Fecha de la orden
                </dt>
                <dd class="mt-2 text-default">
                  {{ formatDate(order.createdAt) }}
                </dd>
              </div>
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
                  Condiciones de recepción
                </dt>
                <dd class="mt-2 whitespace-pre-wrap text-default">
                  {{ order.intakeNotes || 'Sin observaciones' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-muted">
                  Notas internas
                </dt>
                <dd class="mt-2 whitespace-pre-wrap text-default">
                  {{ order.internalNotes || 'Sin notas internas' }}
                </dd>
              </div>
            </dl>
          </UCard>

          <OrdersOrderFinancialSummaryCard
            v-if="order.canViewFinancials"
            :subtotal="order.subtotal"
            :discount-total="order.discountTotal"
            :tax-total="order.taxTotal"
            :total="order.total"
            :expense-total="totalExpenses"
          />
        </div>

        <div class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <OrdersOrderItemsCard
            :order-id="order.id"
            :items="order.items"
            :subtotal="order.subtotal"
            :tax-total="order.taxTotal"
            :total="order.total"
            :requires-invoice="order.requiresInvoice"
            :can-edit="isSuperAdmin"
            @updated="refresh"
          />
          <div class="space-y-6">
            <OrdersOrderPaymentsCard
              :order-id="order.id"
              :payments="order.payments"
              :balance="order.balance"
              :total="order.total"
              :can-record="isSuperAdmin"
              @updated="refresh"
            />
            <OrdersOrderExpensesCard
              v-if="order.canViewFinancials"
              :expenses="order.expenses"
              :order="{
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                vehicleLabel: order.vehicleLabel
              }"
              :can-record="canRecordExpenses"
              @updated="refresh"
            />
          </div>
        </div>

        <OrdersOrderFormModal
          v-model:open="editOpen"
          :order="order"
          @updated="refresh"
        />

        <UModal
          v-model:open="deleteOpen"
          title="Eliminar orden"
          description="Esta acción eliminará también sus conceptos, pagos y gastos, y no se puede deshacer."
          :ui="{ footer: 'justify-end' }"
        >
          <template #body>
            <UAlert
              :title="`¿Eliminar definitivamente ${order.orderNumber}?`"
              description="Verifica que no necesites conservar esta orden para el historial del taller."
              icon="i-lucide-triangle-alert"
              color="error"
              variant="subtle"
            />
          </template>
          <template #footer="{ close }">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="outline"
              @click="close"
            />
            <UButton
              label="Eliminar orden"
              icon="i-lucide-trash-2"
              color="error"
              :loading="deleting"
              @click="deleteOrder"
            />
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
