<script setup lang="ts">
import { tableReturnPath } from '@rafamedtech/nuxt-shared/utils'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { OrderDetail, OrderStatus } from '~/types/crm'

const route = useRoute()
const returnTo = computed(() => tableReturnPath(route.query.returnTo, '/ordenes'))
const toast = useToast()
const savingStatus = shallowRef(false)
const editOpen = shallowRef(false)
const paymentsOpen = shallowRef(false)
const expensesOpen = shallowRef(false)
const deleteOpen = shallowRef(false)
const deleting = shallowRef(false)
const deleteReason = shallowRef('')
const deleteError = shallowRef('')
watch(deleteOpen, (value) => {
  if (value) {
    deleteReason.value = ''
    deleteError.value = ''
  }
})
const orderId = computed(() => route.params.id as string)
const { isSuperAdmin, isReadOnly, canRecordExpenses } = useCrmSession()
const auditCard = useTemplateRef<{ refresh: () => Promise<void> }>('auditCard')

async function refreshOrder() {
  await Promise.all([refresh(), auditCard.value?.refresh()])
}

const { data: order, status, error, refresh } = useFetch<OrderDetail>(() => `/api/orders/${orderId.value}`, {
  lazy: true,
  server: false,
  key: `crm-order-${orderId.value}`
})

const totalExpenses = computed(() => order.value?.expenses.reduce((sum, expense) => sum + expense.amountMxn, 0) ?? 0)

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
  LIQUIDATED: 'bg-success/10 text-success ring ring-inset ring-success/25',
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
    await refreshOrder()
  } catch (error) {
    toast.add({ title: 'No se pudo cambiar el estado', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    savingStatus.value = false
  }
}

async function deleteOrder() {
  if (!order.value || deleting.value) return

  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/orders/${order.value.id}`, { method: 'DELETE', body: { reason: deleteReason.value.trim() || null } })
    toast.add({ title: 'Orden eliminada', color: 'success', icon: 'i-lucide-check' })
    deleteOpen.value = false
    await navigateTo(returnTo.value)
  } catch (error) {
    deleteError.value = getApiErrorMessage(error) || 'No se pudo eliminar la orden.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="order-detail" :ui="{ body: 'pt-0 sm:pt-0' }">
    <template #header>
      <DashboardNavbar :title="order?.orderNumber ?? 'Orden de trabajo'" :toggle="{ size: 'xl' }">
        <template #right>
          <UButton
            :to="returnTo"
            label="Volver"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
          />
          <WorkshopSwitcher />
        </template>
      </DashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="status === 'idle' || status === 'pending'"
        class="space-y-6"
        aria-label="Cargando orden"
        aria-busy="true"
      >
        <div class="flex justify-end">
          <USkeleton class="h-10 w-72 max-w-full" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailStatCard
            v-for="title in ['Cliente', 'Vehículo', 'Entrega prometida', 'Saldo pendiente']"
            :key="title"
            :title="title"
            loading
          />
        </div>
        <div class="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <ReportsLoadingCard title="Recepción" />
          <ReportsLoadingCard title="Resumen financiero" />
        </div>
        <ReportsLoadingCard title="Servicios y partes" />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        icon="i-lucide-circle-alert"
        title="No se pudo cargar la orden"
        description="Intenta cargar la información de nuevo."
      >
        <template #actions>
          <UButton
            label="Reintentar"
            color="error"
            variant="soft"
            @click="refresh()"
          />
        </template>
      </UAlert>
      <div v-else-if="order" class="space-y-6">
        <section aria-labelledby="order-overview" class="space-y-3">
          <ReportsSectionHeading id="order-overview" title="Detalle de la orden" marker="bg-primary">
            <template #actions>
              <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <div class="flex items-center gap-2 sm:order-2">
                  <USelectMenu
                    :model-value="order.status"
                    :color="orderStatusColors[order.status]"
                    variant="subtle"
                    :items="statusOptions"
                    value-key="value"
                    :search-input="false"
                    :loading="savingStatus"
                    :disabled="!isSuperAdmin"
                    aria-label="Estado de la orden"
                    class="min-w-0 flex-1 sm:w-48 sm:flex-none"
                    :ui="{
                      base: statusSelectClasses[order.status],
                      trailingIcon: 'text-current',
                      content: 'max-h-none',
                      viewport: 'overflow-y-visible'
                    }"
                    @update:model-value="updateStatus($event as OrderStatus)"
                  />
                  <UBadge
                    v-if="order.priority !== 'NORMAL'"
                    :label="orderPriorityLabels[order.priority]"
                    :color="order.priority === 'URGENT' ? 'error' : order.priority === 'HIGH' ? 'warning' : 'neutral'"
                    variant="subtle"
                    icon="i-lucide-flag"
                    class="h-8 shrink-0 justify-center"
                  />
                  <UDropdownMenu
                    v-if="isSuperAdmin"
                    :items="orderActionItems"
                    :content="{ align: 'end' }"
                  >
                    <UButton
                      aria-label="Opciones"
                      icon="i-lucide-ellipsis-vertical"
                      color="neutral"
                      variant="outline"
                      square
                      class="shrink-0"
                    />
                  </UDropdownMenu>
                </div>
                <div
                  class="grid gap-2 sm:order-1 sm:flex sm:items-center"
                  :class="order.canViewFinancials ? 'grid-cols-2' : 'grid-cols-1'"
                >
                  <UButton
                    v-if="order.canViewFinancials"
                    label="Gastos"
                    icon="i-lucide-receipt-text"
                    color="neutral"
                    variant="outline"
                    class="min-w-0 justify-center"
                    @click="expensesOpen = true"
                  />
                  <UButton
                    :label="paymentStatusLabels[order.paymentStatus]"
                    icon="i-lucide-hand-coins"
                    :color="paymentStatusColors[order.paymentStatus]"
                    variant="subtle"
                    class="min-w-0 justify-center"
                    :ui="{ label: 'truncate' }"
                    @click="paymentsOpen = true"
                  />
                </div>
              </div>
            </template>
          </ReportsSectionHeading>
          <OrdersOrderOverviewCards :order="order" />
        </section>

        <div class="grid items-start gap-4" :class="order.canViewFinancials ? 'xl:grid-cols-[1.4fr_1fr]' : 'grid-cols-1'">
          <OrdersOrderReceptionCard :order="order" />

          <OrdersOrderFinancialSummaryCard
            v-if="order.canViewFinancials"
            :subtotal="order.subtotal"
            :discount-total="order.discountTotal"
            :tax-total="order.taxTotal"
            :total="order.total"
            :expense-total="totalExpenses"
          />
        </div>

        <section aria-labelledby="order-services" class="space-y-3">
          <ReportsSectionHeading
            id="order-services"
            title="Servicios y partes"
            marker="bg-primary"
            :amount="order.total"
          />
          <OrdersOrderItemsCard
            :order-id="order.id"
            :items="order.items"
            :subtotal="order.subtotal"
            :tax-total="order.taxTotal"
            :total="order.total"
            :requires-invoice="order.requiresInvoice"
            :can-edit="isSuperAdmin"
            @updated="refreshOrder"
          />
        </section>

        <OrdersOrderAuditCard
          v-if="isSuperAdmin || isReadOnly"
          ref="auditCard"
          :order-id="order.id"
          :workshop-id="order.workshopId"
        />

        <UModal
          v-model:open="paymentsOpen"
          title="Pagos de la orden"
          :description="`${order.orderNumber} · ${order.customerName} · ${order.vehicleLabel}`"
          :ui="{
            content: 'max-w-2xl',
            header: 'pr-12 sm:pr-14',
            title: 'text-lg font-semibold text-primary',
            body: 'p-4 sm:p-6'
          }"
        >
          <template #body>
            <OrdersOrderPaymentsCard
              :order-id="order.id"
              :workshop-id="order.workshopId"
              :payments="order.payments"
              :balance="order.balance"
              :total="order.total"
              :can-record="isSuperAdmin"
              @updated="refreshOrder"
            />
          </template>
        </UModal>

        <UModal
          v-if="order.canViewFinancials"
          v-model:open="expensesOpen"
          title="Gastos de la orden"
          :description="`${order.orderNumber} · ${order.customerName} · ${order.vehicleLabel}`"
          :ui="{
            content: 'max-w-2xl',
            header: 'pr-12 sm:pr-14',
            title: 'text-lg font-semibold text-primary',
            body: 'p-4 sm:p-6'
          }"
        >
          <template #body>
            <OrdersOrderExpensesCard
              :expenses="order.expenses"
              :order="{
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                vehicleLabel: order.vehicleLabel
              }"
              :can-record="canRecordExpenses"
              @updated="refreshOrder"
            />
          </template>
        </UModal>

        <OrdersOrderFormModal
          v-model:open="editOpen"
          :order="order"
          @updated="refreshOrder"
        />

        <DestructiveConfirmModal
          v-model:open="deleteOpen"
          title="Eliminar orden"
          description="Esta acción eliminará también sus conceptos y pagos, dejará sus gastos sin orden y no se puede deshacer."
          confirm-label="Eliminar orden"
          confirm-icon="i-lucide-trash-2"
          :loading="deleting"
          :error="deleteError"
          @confirm="deleteOrder"
        >
          <template #context>
            <UAlert
              :title="`¿Eliminar definitivamente ${order.orderNumber}?`"
              description="Verifica que no necesites conservar esta orden para el historial del taller."
              icon="i-lucide-triangle-alert"
              color="error"
              variant="subtle"
            />
          </template>
          <template #reason="{ loading: removing }">
            <DeletionReasonField v-model="deleteReason" :required="false" :disabled="removing" />
          </template>
        </DestructiveConfirmModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
