<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { OrderDetail, OrderStatus } from '~/types/crm'

const route = useRoute()
const toast = useToast()
const savingStatus = shallowRef(false)
const editOpen = shallowRef(false)
const paymentsOpen = shallowRef(false)
const expensesOpen = shallowRef(false)
const deleteOpen = shallowRef(false)
const deleting = shallowRef(false)
const orderId = computed(() => route.params.id as string)
const { isSuperAdmin, canRecordExpenses } = useCrmSession()

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
  <UDashboardPanel id="order-detail" :ui="{ body: 'pt-0 sm:pt-0' }">
    <template #header>
      <UDashboardNavbar :title="order?.orderNumber ?? 'Orden de trabajo'" :toggle="{ size: 'xl' }" :ui="{ title: 'text-base lg:text-sm' }">
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
              <div class="flex justify-end">
                <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <div class="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                    <UButton
                      v-if="order.canViewFinancials"
                      label="Gastos"
                      icon="i-lucide-receipt-text"
                      color="neutral"
                      variant="outline"
                      class="w-full justify-center sm:w-auto"
                      @click="expensesOpen = true"
                    />
                    <UButton
                      :label="paymentStatusLabels[order.paymentStatus]"
                      icon="i-lucide-hand-coins"
                      :color="paymentStatusColors[order.paymentStatus]"
                      variant="subtle"
                      class="w-full justify-center sm:w-auto"
                      @click="paymentsOpen = true"
                    />
                    <UBadge
                      v-if="order.priority !== 'NORMAL'"
                      :label="orderPriorityLabels[order.priority]"
                      :color="order.priority === 'URGENT' ? 'error' : order.priority === 'HIGH' ? 'warning' : 'neutral'"
                      variant="subtle"
                      size="lg"
                      class="col-span-2 h-9 w-full justify-center sm:w-auto md:h-8"
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
                    <UDropdownMenu
                      v-if="isSuperAdmin"
                      :items="orderActionItems"
                      :content="{ align: 'end' }"
                    >
                      <UButton
                        aria-label="Opciones"
                        icon="i-lucide-settings-2"
                        color="neutral"
                        variant="outline"
                        class="col-span-2 justify-self-end"
                      />
                    </UDropdownMenu>
                  </div>
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
            @updated="refresh"
          />
        </section>

        <UModal
          v-model:open="paymentsOpen"
          title="Pagos de la orden"
          :ui="{ content: 'sm:max-w-2xl' }"
        >
          <template #body>
            <OrdersOrderPaymentsCard
              :order-id="order.id"
              :payments="order.payments"
              :balance="order.balance"
              :total="order.total"
              :can-record="isSuperAdmin"
              @updated="refresh"
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
              @updated="refresh"
            />
          </template>
        </UModal>

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
