<script setup lang="ts">
import { parseDate, type DateValue } from '@internationalized/date'
import type { DashboardData } from '~/types/crm'

useHead({ title: 'Resumen' })

const now = new Date()

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const currentMonth = parseDate(toDateString(now))
const selectedMonth = shallowRef<DateValue>(currentMonth)
const hasSelectedMonth = shallowRef(false)
const monthRange = computed(() => {
  const year = selectedMonth.value.year
  const month = selectedMonth.value.month
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const lastDay = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate()

  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    monthEnd: `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  }
})
const { isAllWorkshops, activeWorkshop } = useCrmSession()

const { data, status, refresh } = await useFetch<DashboardData>('/api/dashboard', {
  query: computed(() => ({
    from: monthRange.value.from,
    to: monthRange.value.to,
    monthEnd: monthRange.value.monthEnd
  })),
  key: 'crm-dashboard',
  watch: false
})

async function selectMonth() {
  hasSelectedMonth.value = true
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar
        :title="isAllWorkshops ? 'Resumen consolidado' : activeWorkshop?.name ?? 'Resumen'"
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
              :has-selection="hasSelectedMonth"
              @select="selectMonth"
            />
          </div>
          <div class="lg:hidden">
            <WorkshopSwitcher size="xl" />
          </div>
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
            :has-selection="hasSelectedMonth"
            @select="selectMonth"
          />
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton v-for="index in 8" :key="index" class="h-32 rounded-xl" />
      </div>

      <div v-else-if="data" class="space-y-6">
        <DashboardKpiGrid
          :kpis="data.kpis"
          :can-view-financials="data.canViewFinancials"
        />

        <div class="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <DashboardTrend
            class="h-full"
            :items="data.trend"
            :can-view-financials="data.canViewFinancials"
          />
          <DashboardStatusBreakdown
            class="h-full"
            :items="data.statusCounts"
          />
        </div>

        <DashboardRecentOrders :orders="data.recentOrders" />

        <DashboardUpcomingDeliveries :orders="data.upcomingDeliveries" />

        <DashboardWorkshopPerformance
          v-if="isAllWorkshops && data.canViewFinancials"
          :workshops="data.workshops"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
