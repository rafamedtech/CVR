<script setup lang="ts">
import { parseDate, type CalendarDate } from '@internationalized/date'
import type { DashboardData } from '~/types/crm'

useHead({ title: 'Resumen' })

const now = new Date()

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateInput(date: CalendarDate) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date.toDate('UTC'))
}

const from = shallowRef<CalendarDate>(parseDate(toDateString(new Date(now.getFullYear(), now.getMonth(), 1))))
const to = shallowRef<CalendarDate>(parseDate(toDateString(now)))
const fromOpen = ref(false)
const toOpen = ref(false)
const { isAllWorkshops, activeWorkshop } = useCrmSession()

const { data, status, refresh } = await useFetch<DashboardData>('/api/dashboard', {
  query: computed(() => ({
    from: from.value.toString(),
    to: to.value.toString()
  })),
  key: 'crm-dashboard',
  watch: false
})

async function applyRange() {
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar :title="isAllWorkshops ? 'Resumen consolidado' : activeWorkshop?.name ?? 'Resumen'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/orders"
            label="Ver órdenes"
            icon="i-lucide-clipboard-list"
            color="neutral"
            variant="outline"
          />
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar class="py-4">
        <template #left>
          <div class="flex flex-wrap items-end gap-2">
            <UFormField label="Desde">
              <UPopover v-model:open="fromOpen">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-calendar-days"
                  :label="formatDateInput(from)"
                  class="w-40 justify-start font-normal"
                />

                <template #content>
                  <UCalendar v-model="from" locale="es-MX" @update:model-value="fromOpen = false" />
                </template>
              </UPopover>
            </UFormField>
            <UFormField label="Hasta">
              <UPopover v-model:open="toOpen">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-calendar-days"
                  :label="formatDateInput(to)"
                  class="w-40 justify-start font-normal"
                />

                <template #content>
                  <UCalendar v-model="to" locale="es-MX" @update:model-value="toOpen = false" />
                </template>
              </UPopover>
            </UFormField>
            <UButton label="Aplicar" icon="i-lucide-filter" @click="applyRange" />
          </div>
        </template>
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

        <div class="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <DashboardRecentOrders :orders="data.recentOrders" />
          <DashboardStatusBreakdown :items="data.statusCounts" />
        </div>

        <DashboardWorkshopPerformance
          v-if="isAllWorkshops && data.canViewFinancials"
          :workshops="data.workshops"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
