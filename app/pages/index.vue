<script setup lang="ts">
import type { DashboardData } from '~/types/crm'

useHead({ title: 'Resumen' })

const now = new Date()
const from = shallowRef(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
const to = shallowRef(now.toISOString().slice(0, 10))
const { isAllWorkshops, activeWorkshop } = useCrmSession()

const { data, status, refresh } = await useFetch<DashboardData>('/api/dashboard', {
  query: { from, to },
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

      <UDashboardToolbar>
        <template #left>
          <div class="flex flex-wrap items-end gap-2">
            <UFormField label="Desde">
              <UInput v-model="from" type="date" />
            </UFormField>
            <UFormField label="Hasta">
              <UInput v-model="to" type="date" />
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
