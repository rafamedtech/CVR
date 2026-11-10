<script setup lang="ts">
import { parseDate, type DateValue } from '@internationalized/date'
import type { DashboardData } from '~/types/crm'

useHead({ title: 'Resumen' })

const route = useRoute()
const router = useRouter()
const annual = shallowRef(route.query.view === 'annual')
const now = new Date()

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Tijuana', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
const currentMonth = parseDate(today)
const routeMonth = typeof route.query.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(route.query.month) && route.query.month <= today.slice(0, 7) ? parseDate(`${route.query.month}-01`) : currentMonth
const selectedMonth = shallowRef<DateValue>(routeMonth)
const hasSelectedMonth = shallowRef(true)
const monthRange = computed(() => {
  const year = selectedMonth.value.year
  const month = selectedMonth.value.month
  const isCurrentMonth = year === currentMonth.year && month === currentMonth.month
  const lastDay = isCurrentMonth ? currentMonth.day : new Date(year, month, 0).getDate()

  return {
    from: annual.value ? `${year}-01-01` : `${year}-${String(month).padStart(2, '0')}-01`,
    to: annual.value ? (year === currentMonth.year ? today : `${year}-12-31`) : `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    monthEnd: annual.value ? `${year}-12-31` : `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  }
})
const { isAllWorkshops } = useCrmSession()

const { data, status, error, refresh } = await useFetch<DashboardData>('/api/dashboard', {
  query: computed(() => ({
    from: monthRange.value.from,
    to: monthRange.value.to,
    monthEnd: monthRange.value.monthEnd,
    view: annual.value ? 'annual' : 'monthly'
  })),
  key: 'crm-dashboard',
  watch: false
})

async function selectMonth() {
  hasSelectedMonth.value = true
  await router.replace({ query: { ...route.query, month: `${selectedMonth.value.year}-${String(selectedMonth.value.month).padStart(2, '0')}`, view: annual.value ? 'annual' : undefined } })
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar
        :title="annual ? 'Resumen anual' : 'Resumen mensual'"
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
              :has-selection="hasSelectedMonth"
              @select="selectMonth"
            />
          </div>
          <div class="lg:hidden">
            <WorkshopSwitcher size="xl" />
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
            <WorkshopSwitcher />
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
            :has-selection="hasSelectedMonth"
            @select="selectMonth"
          />
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="space-y-6">
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
        <ReportsDashboard
          v-if="data.canViewFinancials && data.report"
          :report="data.report"
          :consolidated="isAllWorkshops"
        />

        <section aria-labelledby="dashboard-operation" class="space-y-4">
          <h2 id="dashboard-operation" class="font-semibold text-highlighted">
            Operación del taller
          </h2>
          <DashboardKpiGrid :kpis="data.kpis" :can-view-financials="false" />
          <div class="grid gap-4 xl:grid-cols-2">
            <DashboardStatusBreakdown :items="data.statusCounts" />
            <DashboardTrend v-if="!data.canViewFinancials" :items="data.trend" :can-view-financials="false" />
            <DashboardWorkshopPerformance v-else-if="isAllWorkshops" :workshops="data.workshops" />
          </div>
        </section>

        <DashboardRecentOrders :orders="data.recentOrders" />

        <DashboardUpcomingDeliveries :orders="data.upcomingDeliveries" :annual="annual" />
      </div>
    </template>
  </UDashboardPanel>
</template>
