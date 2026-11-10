<script setup lang="ts">
import type { BusinessReportData } from '~/types/reports'

useHead({ title: 'Reportes' })
const route = useRoute()
const { session, isSuperAdmin } = useCrmSession()
const { selectedMonth, currentMonth, annual, month, periodQuery, syncPeriod } = useReportPeriod()
const businessOptions = computed(() => [
  { label: 'Todos los negocios', value: 'all' },
  { label: 'Carolina Pinturas', value: 'carolina-pinturas' },
  ...(session.value?.workshops ?? []).map(workshop => ({ label: workshop.name, value: workshop.id }))
])
const business = shallowRef(typeof route.query.business === 'string' && businessOptions.value.some(option => option.value === route.query.business) ? route.query.business : 'all')
const { data, status, error, refresh } = await useFetch<BusinessReportData>('/api/reports/summary', {
  key: 'crm-business-reports',
  query: computed(() => ({ ...periodQuery.value, business: business.value })),
  immediate: isSuperAdmin.value,
  watch: false
})
const isCarolina = computed(() => business.value === 'carolina-pinturas')
const isCombined = computed(() => business.value === 'all')
const selectedBusinessName = computed(() => businessOptions.value.find(option => option.value === business.value)?.label ?? 'Reportes')
const unavailableTitle = computed(() => isCombined.value ? 'Reporte parcial: solo talleres' : 'Reporte de Carolina no disponible')
const unavailableMessage = computed(() => data.value?.status === 'not-configured'
  ? 'Falta configurar la conexión de reportes de Carolina Pinturas en este entorno.'
  : 'No se pudo consultar Carolina Pinturas. Sus importes no están incluidos en los resultados mostrados.')
async function updateReport() {
  await syncPeriod({ business: business.value })
  if (isSuperAdmin.value) await refresh()
}
</script>

<template>
  <UDashboardPanel id="business-reports">
    <template #header>
      <UDashboardNavbar title="Reportes" :toggle="{ size: 'xl' }" :ui="{ title: 'text-base lg:text-sm' }">
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
      <UDashboardToolbar v-if="isSuperAdmin" class="py-3">
        <div class="flex w-full flex-wrap items-center gap-3">
          <USelect
            v-model="business"
            :items="businessOptions"
            aria-label="Negocio del reporte"
            class="w-full sm:w-72"
            @update:model-value="updateReport"
          />
          <p class="text-xs text-muted">
            {{ isCombined ? 'Suma de Carolina Pinturas, Carrocería y Mecánica' : selectedBusinessName }}
          </p>
          <div class="w-full lg:hidden">
            <DashboardMonthFilter
              v-model="selectedMonth"
              block
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
        v-if="!isSuperAdmin"
        color="warning"
        icon="i-lucide-lock-keyhole"
        title="Acceso restringido"
        description="Los reportes por negocio están disponibles para el administrador general. El resumen de tu taller sigue disponible en Inicio."
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
