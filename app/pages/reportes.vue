<script setup lang="ts">
import type { BusinessReportData } from '~/types/reports'
import type { WorkshopType } from '~/types/crm'

useHead({ title: 'Reportes' })
const route = useRoute()
const { session, canViewReports } = useCrmSession()
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
const business = shallowRef(typeof route.query.business === 'string' && businessOptions.value.some(option => option.value === route.query.business) ? route.query.business : 'all')
const { data, status, error, refresh } = await useFetch<BusinessReportData>('/api/reports/summary', {
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
          <div class="hidden lg:block">
            <DashboardMonthFilter
              v-model="selectedMonth"
              :max-value="currentMonth"
              :annual="annual"
              :has-selection="true"
              @select="updateReport"
            />
          </div>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-calendar-range"
            :label="annual ? 'Anual' : 'Mensual'"
            :aria-pressed="annual"
            aria-label="Cambiar entre reporte mensual y anual"
            @click="annual = !annual; updateReport()"
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
          <div class="shrink-0 lg:hidden">
            <DashboardMonthFilter
              v-model="selectedMonth"
              compact
              :max-value="currentMonth"
              :annual="annual"
              :has-selection="true"
              @select="updateReport"
            />
          </div>
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
      <div v-else-if="status === 'pending'" class="space-y-6" aria-label="Cargando reporte">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <USkeleton v-for="index in 4" :key="index" class="h-36 rounded-xl" />
        </div>
        <USkeleton class="h-96 rounded-xl" />
      </div>
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
        </ReportsDashboard>
      </div>
    </template>
  </UDashboardPanel>
</template>
