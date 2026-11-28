<script setup lang="ts">
import type { SortingState } from '@tanstack/table-core'
import {
  normalizeSearchText, tableQueryField, tableQueryPage, tableQueryRange,
  tableQuerySorting, tableQueryText, type TableDateRange
} from '@rafamedtech/nuxt-shared/utils'
import { formatCalendarRange } from '#shared/date'
import { getLocalTimeZone, type DateValue } from '@internationalized/date'
import type { CustomerListItem, FreightListItem, FreightStatus } from '~/types/crm'

useHead({ title: 'Fletes' })

const route = useRoute()
const router = useRouter()
const { activeWorkshop, isAllWorkshops, isReadOnly, isSuperAdmin, currentRole } = useCrmSession()
const isTransport = computed(() => activeWorkshop.value?.type === 'TRANSPORT')
const canCreate = computed(() => isTransport.value && !isReadOnly.value && (isSuperAdmin.value || currentRole.value === 'MANAGER'))

const search = shallowRef('')
const statusFilter = shallowRef<FreightStatus | 'ALL'>('ALL')
const currencyFilter = shallowRef<'ALL' | 'MXN' | 'USD'>('ALL')
const dateRange = shallowRef<TableDateRange | null>(null)
const page = shallowRef(1)
const pageSize = 10
const sorting = shallowRef<SortingState>([])
const sortableColumns = new Set(['serviceDate', 'freightNumber', 'route', 'status', 'amountMxn', 'directCostsMxn'])
const createOpen = shallowRef(route.query.create === '1' && canCreate.value)

const { returnTo } = useTableQuery([
  tableQueryField('search', search, tableQueryText()),
  tableQueryField('status', statusFilter, tableQueryText('ALL')),
  tableQueryField('currency', currencyFilter, tableQueryText('ALL')),
  tableQueryRange(dateRange, 'date_from', 'date_to'),
  tableQueryField('sort', sorting, {
    parse: value => tableQuerySorting.parse(value).filter(entry => sortableColumns.has(entry.id)).slice(0, 1),
    serialize: tableQuerySorting.serialize
  }),
  tableQueryField('page', page, tableQueryPage)
], { page, resetOn: [search, statusFilter, currencyFilter, dateRange, sorting] })
const returnToFreights = computed(() => {
  const { path, query, hash } = router.resolve(returnTo.value)
  return router.resolve({ path, query: { ...query, create: undefined }, hash }).fullPath
})

const { data: freights, status, error, refresh } = useFetch<FreightListItem[]>('/api/freights', {
  lazy: true,
  server: false,
  default: () => [],
  key: 'crm-freights'
})
const { data: customers, status: customersStatus, execute: loadCustomers } = useFetch<CustomerListItem[]>('/api/customers', {
  server: false,
  default: () => [],
  key: 'crm-customers-for-freights',
  immediate: false
})
watch(canCreate, (value) => {
  if (value) void loadCustomers()
}, { immediate: true })

const statusOptions = [
  { label: 'Todos los estados', value: 'ALL' },
  ...Object.entries(freightStatusLabels).map(([value, label]) => ({ label, value }))
]
const currencyFilterOptions = [
  { label: 'Todas las monedas', value: 'ALL' },
  { label: 'MXN', value: 'MXN' },
  { label: 'USD', value: 'USD' }
]

const filteredFreights = computed(() => {
  const term = normalizeSearchText(search.value)
  const start = dateRange.value?.start?.toString()
  const end = dateRange.value?.end?.toString()
  return freights.value.filter((freight) => {
    if (statusFilter.value !== 'ALL' && freight.status !== statusFilter.value) return false
    if (currencyFilter.value !== 'ALL' && freight.currency !== currencyFilter.value) return false
    if (start && end && (freight.serviceDate < start || freight.serviceDate > end)) return false
    if (!term) return true
    return [
      freight.freightNumber, freight.customerName, freight.origin, freight.destination,
      freight.sourceRecordId, freight.sourceFolio, freight.serviceReference
    ].some(value => normalizeSearchText(value).includes(term))
  })
})
watch([status, () => filteredFreights.value.length, page], ([requestStatus, total, currentPage]) => {
  if (requestStatus === 'success') page.value = Math.min(currentPage, Math.max(1, Math.ceil(total / pageSize)))
}, { immediate: true })

const hasFilters = computed(() => Boolean(normalizeSearchText(search.value) || statusFilter.value !== 'ALL' || currencyFilter.value !== 'ALL' || dateRange.value))
function clearFilters() {
  search.value = ''
  statusFilter.value = 'ALL'
  currencyFilter.value = 'ALL'
  dateRange.value = null
  page.value = 1
}
function formatRange(start: DateValue, end: DateValue) {
  return formatCalendarRange(start.toString(), end.toString())
}
async function onCreated(id: string) {
  await navigateTo({ path: `/fletes/${id}`, query: { returnTo: returnToFreights.value } })
}
</script>

<template>
  <UDashboardPanel id="fletes">
    <template #header>
      <DashboardNavbar title="Fletes">
        <template #right>
          <UButton
            v-if="canCreate"
            class="md:hidden"
            label="Nuevo"
            icon="i-lucide-plus"
            @click="createOpen = true"
          />
          <WorkshopSwitcher />
        </template>
      </DashboardNavbar>

      <UDashboardToolbar :ui="{ root: 'py-3', left: 'w-full min-w-0' }">
        <ListToolbar
          v-model:search="search"
          placeholder="Buscar flete, cliente, ruta o folio de Nexo…"
          :has-active-filters="hasFilters"
          clear-label="Limpiar filtros"
          class="w-full"
          @clear="clearFilters"
        >
          <template #filters>
            <div class="flex min-w-0 flex-wrap gap-2 sm:contents">
              <CalendarRangePicker
                v-model="dateRange"
                :time-zone="getLocalTimeZone()"
                :format-range="formatRange"
                placeholder="Fecha del servicio"
                icon="i-lucide-calendar-days"
                class="min-w-0 flex-1 justify-start font-normal sm:flex-none"
                :ui="{ label: 'truncate' }"
              />
              <USelect
                v-model="statusFilter"
                :items="statusOptions"
                value-key="value"
                aria-label="Filtrar por estado"
                class="min-w-40"
              />
              <USelect
                v-model="currencyFilter"
                :items="currencyFilterOptions"
                value-key="value"
                aria-label="Filtrar por moneda"
                class="min-w-36"
              />
            </div>
          </template>
          <template #actions>
            <UButton
              v-if="canCreate"
              class="hidden md:inline-flex"
              label="Registrar flete"
              icon="i-lucide-plus"
              @click="createOpen = true"
            />
          </template>
        </ListToolbar>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="!isTransport && !isAllWorkshops"
        class="mb-4"
        title="Selecciona Transporte"
        description="Los fletes se registran y consultan desde el negocio Transporte."
        icon="i-lucide-truck"
        color="info"
        variant="subtle"
      />
      <UAlert
        v-if="error"
        class="mb-4"
        color="error"
        icon="i-lucide-circle-alert"
        title="No se pudieron cargar los fletes"
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
      <UAlert
        v-if="canCreate && customersStatus === 'success' && customers.length === 0"
        class="mb-4"
        title="Registra un cliente de Transporte"
        description="Cada flete necesita un cliente vinculado al negocio Transporte."
        icon="i-lucide-circle-alert"
        color="warning"
        variant="subtle"
        :actions="[{ label: 'Ir a clientes', to: '/clientes' }]"
      />
      <FreightsFreightsTable
        v-if="!error"
        v-model:page="page"
        v-model:sorting="sorting"
        :page-size="pageSize"
        :freights="filteredFreights"
        :loading="status === 'idle' || status === 'pending'"
        :show-workshop="isAllWorkshops"
        :return-to="returnToFreights"
        :has-filters="hasFilters"
      />
      <FreightsFreightFormModal
        v-if="canCreate"
        v-model:open="createOpen"
        :customers="customers"
        @created="onCreated"
      />
    </template>
  </UDashboardPanel>
</template>
