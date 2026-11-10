<script setup lang="ts">
import type { DashboardData } from '~/types/crm'

useHead({ title: 'Resumen' })
const { activeWorkshop } = useCrmSession()
const { selectedMonth, currentMonth, annual, periodQuery, syncPeriod } = useReportPeriod()
const { data, status, error, refresh } = await useFetch<DashboardData>('/api/dashboard', {
  query: periodQuery,
  key: 'crm-dashboard',
  immediate: Boolean(activeWorkshop.value),
  watch: false
})

async function selectMonth() {
  await syncPeriod()
  if (activeWorkshop.value) await refresh()
}
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar
        :title="activeWorkshop?.name ?? 'Resumen'"
        :toggle="{ size: 'xl' }"
        :ui="{ title: 'text-base lg:text-sm' }"
      >
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
              @select="selectMonth"
            />
          </div>
          <div class="lg:hidden">
            <WorkshopSwitcher size="xl" :allow-all="false" />
          </div>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-calendar-range"
            :label="annual ? 'Anual' : 'Mensual'"
            :aria-pressed="annual"
            aria-label="Cambiar entre reporte mensual y anual"
            @click="annual = !annual; selectMonth()"
          />
          <div class="hidden lg:block">
            <WorkshopSwitcher :allow-all="false" />
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar class="py-4 lg:hidden">
        <div class="w-full">
          <DashboardMonthFilter
            v-model="selectedMonth"
            block
            :max-value="currentMonth"
            :annual="annual"
            :has-selection="true"
            @select="selectMonth"
          />
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UEmpty
        v-if="!activeWorkshop"
        title="Selecciona un taller"
        description="Elige Carrocería o Mecánica en el selector para ver su resumen."
        icon="i-lucide-building-2"
        class="py-16"
      />
      <div v-else-if="status === 'pending'" class="space-y-6">
        <USkeleton class="h-72 rounded-2xl" />
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <USkeleton v-for="index in 4" :key="index" class="h-24 rounded-xl" />
        </div>
      </div>

      <UAlert
        v-else-if="error"
        title="No se pudo cargar el resumen"
        description="Intenta cargar el reporte de nuevo."
        color="error"
        icon="i-lucide-circle-alert"
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
        <ReportsDashboard v-if="data.canViewFinancials && data.report" :report="data.report" :consolidated="false" />

        <section aria-labelledby="dashboard-operation" class="space-y-4">
          <h2 id="dashboard-operation" class="font-semibold text-highlighted">
            Operación del taller
          </h2>
          <DashboardKpiGrid :kpis="data.kpis" :can-view-financials="false" />
          <div class="grid gap-4 xl:grid-cols-2">
            <DashboardStatusBreakdown :items="data.statusCounts" />
            <DashboardTrend v-if="!data.canViewFinancials" :items="data.trend" :can-view-financials="false" />
          </div>
        </section>

        <DashboardRecentOrders :orders="data.recentOrders" />

        <DashboardUpcomingDeliveries :orders="data.upcomingDeliveries" :annual="annual" />
      </div>
    </template>
  </UDashboardPanel>
</template>
