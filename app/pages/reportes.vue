<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { DEFAULT_WORKSHOP_TIME_ZONE, formatReportMonth } from '~/utils/datetime'
import type { BusinessReportData } from '~/types/reports'
import type { WorkshopType } from '~/types/crm'

useHead({ title: 'Reportes' })
const { query } = useRouter().currentRoute.value
const { session, canViewReports, workshopTimeZone } = useCrmSession()
const timeZone = computed(() => workshopTimeZone() ?? DEFAULT_WORKSHOP_TIME_ZONE)
const { selectedMonth, currentMonth, annual, month, periodQuery, syncPeriod } = useReportPeriod()
const workshopIcons: Record<WorkshopType, string> = {
  BODY_SHOP: 'i-lucide-paintbrush',
  MECHANICAL: 'i-lucide-wrench',
  PAINT_STORE: 'i-lucide-palette'
}
const businessOptions = computed(() => [
  { label: 'Todos los negocios', value: 'all', icon: 'i-lucide-building-2' },
  { label: 'Carolina Pinturas', value: 'carolina-pinturas', icon: 'i-lucide-palette' },
  ...(session.value?.workshops ?? []).map(workshop => ({ label: workshop.name, value: workshop.id, icon: workshopIcons[workshop.type] }))
])
const business = shallowRef(typeof query.business === 'string' && businessOptions.value.some(option => option.value === query.business) ? query.business : 'all')
const { data, status, error, refresh } = useFetch<BusinessReportData>('/api/reports/summary', {
  lazy: true,
  server: false,
  key: 'crm-business-reports',
  query: computed(() => ({ ...periodQuery.value, business: business.value })),
  immediate: canViewReports.value,
  watch: false
})
const isCarolina = computed(() => business.value === 'carolina-pinturas')
const isCombined = computed(() => business.value === 'all')
const unavailableTitle = computed(() => isCombined.value ? 'Reporte parcial: solo talleres' : 'Reporte de Carolina no disponible')
const unavailableMessage = computed(() => data.value?.status === 'not-configured'
  ? 'Falta configurar la conexión de reportes de Carolina Pinturas en este entorno.'
  : 'No se pudo consultar Carolina Pinturas. Sus importes no están incluidos en los resultados mostrados.')
function formatSelectedMonth(value: DateValue) {
  return formatReportMonth(value.toString().slice(0, 10))
}

function updateView(view: 'monthly' | 'annual') {
  annual.value = view === 'annual'
  return updateReport()
}

async function updateReport() {
  await syncPeriod({ business: business.value })
  if (canViewReports.value) await refresh()
}
</script>

<template>
  <UDashboardPanel id="business-reports">
    <template #header>
      <UDashboardNavbar :title="annual ? 'Reporte anual' : 'Reporte mensual'" :toggle="{ size: 'xl' }" :ui="{ title: 'text-base lg:text-sm' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <ReportsPeriodControls
            v-model:month="selectedMonth"
            :view="annual ? 'annual' : 'monthly'"
            :time-zone="timeZone"
            :format-month="formatSelectedMonth"
            :max-value="currentMonth"
            @update:view="updateView"
            @select="updateReport"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar v-if="canViewReports" class="py-3 lg:py-0">
        <div class="flex w-full min-w-0 items-center gap-3">
          <ReportsBusinessSelector
            v-model="business"
            :options="businessOptions"
            @change="updateReport"
          />
        </div>
      </UDashboardToolbar>
    </template>
    <template #body>
      <UAlert
        v-if="!canViewReports"
        color="warning"
        icon="i-lucide-lock-keyhole"
        title="Acceso restringido"
        description="Los reportes por negocio requieren acceso global. El resumen de tu taller sigue disponible en Inicio."
      />
      <ReportsLoadingState
        v-else-if="status === 'idle' || status === 'pending'"
        :annual="annual"
        :all-businesses="isCombined"
        :carolina="isCarolina"
      />
      <UAlert
        v-else-if="error"
        color="error"
        icon="i-lucide-circle-alert"
        title="No se pudo cargar el reporte"
        description="Intenta cargar el periodo seleccionado de nuevo."
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
      <div v-else-if="data" class="space-y-6">
        <UAlert
          v-if="data.status !== 'connected'"
          color="warning"
          icon="i-lucide-unplug"
          :title="unavailableTitle"
          :description="unavailableMessage"
        >
          <template #actions>
            <UButton
              label="Reintentar"
              color="warning"
              variant="soft"
              @click="refresh()"
            />
          </template>
        </UAlert>
        <ReportsDashboard
          v-if="data.report"
          :report="data.report"
          :businesses="data.consolidation?.businesses"
          :consolidated="isCombined"
          :all-businesses="isCombined"
          :carolina="isCarolina"
          :details-links="false"
        >
          <template #businesses>
            <ReportsConsolidationSummary
              v-if="data.consolidation"
              :info="data.consolidation"
              :month="month"
              :annual="annual"
              :carolina-only="isCarolina"
            />
          </template>
          <template #materials>
            <ReportsInventoryValuation
              v-if="data.consolidation?.carolinaInventory !== undefined"
              :valuation="data.consolidation.carolinaInventory"
            />
          </template>
        </ReportsDashboard>
      </div>
    </template>
  </UDashboardPanel>
</template>
