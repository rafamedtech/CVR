<script setup lang="ts">
import { tableReturnPath } from '@rafamedtech/nuxt-shared/utils'
import { formatDateOnly } from '#shared/date'
import { nextFreightStatuses } from '#shared/freight'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { CustomerListItem, FreightDetail, FreightStatus } from '~/types/crm'

const route = useRoute()
const returnTo = computed(() => tableReturnPath(route.query.returnTo, '/fletes'))
const toast = useToast()
const freightId = computed(() => route.params.id as string)
const { workshopTimeZone } = useCrmSession()
const auditCard = useTemplateRef<{ refresh: () => Promise<void> }>('auditCard')
const editOpen = shallowRef(false)
const statusOpen = shallowRef(false)
const targetStatus = shallowRef<FreightStatus | null>(null)
const deleteOpen = shallowRef(false)
const deleting = shallowRef(false)
const deleteReason = shallowRef('')
const deleteError = shallowRef('')

const { data: freight, status, error, refresh } = useFetch<FreightDetail>(() => `/api/freights/${freightId.value}`, {
  lazy: true,
  server: false,
  key: () => `crm-freight-${freightId.value}`
})
const { data: customers, execute: loadCustomers } = useFetch<CustomerListItem[]>('/api/customers', {
  immediate: false,
  server: false,
  default: () => [],
  key: 'crm-customers-for-freights'
})

useHead({ title: computed(() => freight.value?.freightNumber ?? 'Flete') })

async function refreshFreight() {
  await Promise.all([refresh(), auditCard.value?.refresh()])
}

const statusActions: Partial<Record<FreightStatus, { label: string, icon: string }>> = {
  IN_TRANSIT: { label: 'Registrar salida', icon: 'i-lucide-truck' },
  DELIVERED: { label: 'Confirmar entrega', icon: 'i-lucide-package-check' }
}
const availableStatuses = computed(() => freight.value ? nextFreightStatuses(freight.value.status) : [])
const primaryStatus = computed(() => availableStatuses.value.find(value => value === 'DELIVERED' || value === 'IN_TRANSIT'))
const secondaryStatuses = computed(() => availableStatuses.value.filter(value => value === 'IN_TRANSIT' && primaryStatus.value === 'DELIVERED'))

function openStatus(value: FreightStatus) {
  targetStatus.value = value
  statusOpen.value = true
}

function openEdit() {
  void loadCustomers()
  editOpen.value = true
}

function openDelete() {
  deleteReason.value = ''
  deleteError.value = ''
  deleteOpen.value = true
}

const actionItems = computed<DropdownMenuItem[]>(() => {
  if (!freight.value) return []
  const items: DropdownMenuItem[] = secondaryStatuses.value.map(value => ({
    label: statusActions[value]?.label,
    icon: statusActions[value]?.icon,
    onSelect: () => openStatus(value)
  }))
  if (freight.value.canEdit) {
    items.push({ label: 'Editar', icon: 'i-lucide-pencil', onSelect: openEdit })
  }
  if (availableStatuses.value.includes('CANCELLED') && freight.value.canManage) {
    items.push({ label: 'Cancelar flete', icon: 'i-lucide-ban', color: 'error', onSelect: () => openStatus('CANCELLED') })
  }
  if (freight.value.canEdit) {
    items.push({ label: 'Eliminar', icon: 'i-lucide-trash-2', color: 'error', onSelect: openDelete })
  }
  return items
})

const timeZone = computed(() => workshopTimeZone(freight.value?.workshopId))
function dateTime(value: string | null) {
  return value ? formatDate(value, true, timeZone.value) : null
}
const invoiceLabel = computed(() => {
  if (!freight.value) return null
  const { invoiceSeries, invoiceFolio } = freight.value
  return [invoiceSeries, invoiceFolio].filter(Boolean).join('-') || null
})
const freightOption = computed(() => freight.value
  ? {
      id: freight.value.id,
      freightNumber: freight.value.freightNumber,
      customerName: freight.value.customerName,
      routeLabel: `${freight.value.origin} → ${freight.value.destination}`
    }
  : null)

async function deleteFreight() {
  if (!freight.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/freights/${freight.value.id}`, { method: 'DELETE', body: { reason: deleteReason.value } })
    toast.add({ title: 'Flete eliminado', color: 'success', icon: 'i-lucide-check' })
    deleteOpen.value = false
    await navigateTo(returnTo.value)
  } catch (caught) {
    deleteError.value = getApiErrorMessage(caught) || 'No se pudo eliminar el flete.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="freight-detail" :ui="{ body: 'pt-0 sm:pt-0' }">
    <template #header>
      <DashboardNavbar :title="freight?.freightNumber ?? 'Flete'" :toggle="{ size: 'xl' }">
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
        aria-label="Cargando flete"
        aria-busy="true"
      >
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailStatCard
            v-for="title in ['Cliente', 'Ruta', 'Importe', 'Servicio']"
            :key="title"
            :title="title"
            loading
          />
        </div>
        <ReportsLoadingCard title="Datos del servicio" />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        icon="i-lucide-circle-alert"
        title="No se pudo cargar el flete"
        :description="getApiErrorMessage(error)"
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

      <div v-else-if="freight" class="space-y-6">
        <section aria-labelledby="freight-overview" class="space-y-3">
          <ReportsSectionHeading id="freight-overview" title="Detalle del flete" marker="bg-primary">
            <template #actions>
              <div class="flex w-full items-center justify-end gap-2 sm:w-auto">
                <FreightsFreightStatusBadge :status="freight.status" class="h-8" />
                <UButton
                  v-if="freight.canManage && primaryStatus"
                  :label="statusActions[primaryStatus]?.label"
                  :icon="statusActions[primaryStatus]?.icon"
                  @click="openStatus(primaryStatus)"
                />
                <UDropdownMenu
                  v-if="freight.canManage && actionItems.length"
                  :items="actionItems"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    aria-label="Opciones del flete"
                    icon="i-lucide-ellipsis-vertical"
                    color="neutral"
                    variant="outline"
                    square
                  />
                </UDropdownMenu>
              </div>
            </template>
          </ReportsSectionHeading>

          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailStatCard title="Cliente" icon="i-lucide-building">
              <template #value>
                <span class="text-lg leading-tight tracking-tight">{{ freight.customerName }}</span>
              </template>
            </DetailStatCard>
            <DetailStatCard title="Ruta" icon="i-lucide-route">
              <template #value>
                <span class="text-lg leading-tight tracking-tight">{{ freight.origin }} → {{ freight.destination }}</span>
              </template>
            </DetailStatCard>
            <DetailStatCard title="Importe" icon="i-lucide-wallet">
              <template #value>
                <span class="text-[1.65rem] leading-none tracking-tight text-primary">{{ formatCurrency(freight.amount, freight.currency) }}</span>
              </template>
              <p class="mt-auto pt-3 text-xs tabular-nums text-muted">
                {{ freight.currency === 'USD' ? `TC ${freight.exchangeRate.toFixed(4)} · ${formatCurrency(freight.amountMxn)} MXN` : 'Antes de impuestos' }}
              </p>
            </DetailStatCard>
            <DetailStatCard title="Servicio" icon="i-lucide-calendar-days">
              <template #value>
                <span class="text-lg leading-tight tracking-tight">{{ formatDateOnly(freight.serviceDate) }}</span>
              </template>
              <p class="mt-auto pt-3 text-sm text-muted">
                {{ freight.deliveredAt ? `Entregado ${dateTime(freight.deliveredAt)}` : freightStatusLabels[freight.status] }}
              </p>
            </DetailStatCard>
          </div>
        </section>

        <div class="grid items-start gap-4 xl:grid-cols-2">
          <DetailCard title="Seguimiento" icon="i-lucide-map-pin" :ui="{ container: 'gap-4' }">
            <DetailFields
              :fields="[
                { label: 'Programado', value: formatDateOnly(freight.serviceDate) },
                { label: 'Salida', value: dateTime(freight.pickedUpAt) },
                { label: 'Entrega', value: dateTime(freight.deliveredAt) },
                { label: 'Entrega confirmada por', value: freight.deliveryConfirmedByName },
                { label: 'Cancelado', value: dateTime(freight.cancelledAt) },
                { label: 'Registrado por', value: freight.createdByName }
              ]"
            />
            <p v-if="freight.notes" class="text-sm whitespace-pre-line text-muted">
              {{ freight.notes }}
            </p>
          </DetailCard>

          <DetailCard title="Referencias para facturar y cobrar" icon="i-lucide-file-text" :ui="{ container: 'gap-4' }">
            <DetailFields
              :fields="[
                { label: 'Origen', value: freightSourceLabels[freight.source] },
                { label: 'Expediente Nexo', value: freight.sourceRecordId },
                { label: 'Folio del viaje', value: freight.sourceFolio },
                { label: 'Referencia', value: freight.serviceReference },
                { label: 'Factura', value: invoiceLabel },
                { label: 'UUID fiscal', value: freight.invoiceUuid },
                { label: 'Boleta de descarga', value: freight.deliveryTicketRef }
              ]"
            />
            <UButton
              v-if="freight.sourceUrl"
              :to="freight.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              label="Abrir expediente en Nexo"
              icon="i-lucide-external-link"
              color="neutral"
              variant="outline"
              class="self-start"
            />
          </DetailCard>
        </div>

        <FreightsFreightCostsCard
          v-if="freightOption && freight.canViewCosts"
          :expenses="freight.expenses"
          :freight="freightOption"
          :amount-mxn="freight.amountMxn"
          :can-record="freight.canRecordCosts"
          @updated="refreshFreight"
        />

        <AuditHistoryCard
          ref="auditCard"
          :query="{ freightId: freight.id }"
          :workshop-id="freight.workshopId"
          :status-labels="freightStatusLabels"
          :description="freight.canViewCosts ? 'Alta, cambios de estado, entrega y costos del flete.' : 'Alta, cambios de estado y entrega del flete.'"
        />

        <FreightsFreightStatusModal
          v-model:open="statusOpen"
          :freight="freight"
          :status="targetStatus"
          @updated="refreshFreight"
        />
        <FreightsFreightFormModal
          v-if="freight.canEdit"
          v-model:open="editOpen"
          :freight="freight"
          :customers="customers"
          @updated="refreshFreight"
        />
        <DestructiveConfirmModal
          v-model:open="deleteOpen"
          title="Eliminar flete"
          description="El flete se eliminará y sus costos quedarán sin flete asignado. Esta acción no se puede deshacer."
          confirm-label="Eliminar flete"
          confirm-icon="i-lucide-trash-2"
          :confirm-disabled="deleteReason.trim().length < 3"
          :loading="deleting"
          :error="deleteError"
          @confirm="deleteFreight"
        >
          <template #reason="{ loading: removing }">
            <DeletionReasonField v-model="deleteReason" :disabled="removing" />
          </template>
        </DestructiveConfirmModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
