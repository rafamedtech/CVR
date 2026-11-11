<script setup lang="ts">
import type { DashboardOverviewData } from '~/types/crm'

useHead({ title: 'Resumen' })
const { activeWorkshop, isReadOnly, canManageOrders, canViewReports } = useCrmSession()
const { data, status, error, refresh } = useFetch<DashboardOverviewData>('/api/dashboard/overview', {
  lazy: true,
  server: false,
  key: 'crm-overview',
  immediate: Boolean(activeWorkshop.value) || isReadOnly.value
})
const updatedLabel = computed(() => data.value
  ? new Intl.DateTimeFormat('es-MX', { timeZone: data.value.timeZone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(data.value.updatedAt))
  : '')
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Resumen" :toggle="{ size: 'xl' }" :ui="{ title: 'text-base lg:text-sm' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            aria-label="Actualizar resumen"
            :loading="status === 'pending'"
            :disabled="!activeWorkshop && !isReadOnly"
            @click="refresh()"
          />
          <WorkshopSwitcher :allow-all="false" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        v-if="!activeWorkshop && !isReadOnly"
        title="Selecciona un taller"
        description="Elige Carrocería o Mecánica en el selector para ver su resumen."
        icon="i-lucide-building-2"
        class="py-16"
      />
      <TableLoadingState v-else-if="!data && (status === 'idle' || status === 'pending')" />
      <UAlert
        v-else-if="error"
        title="No se pudo actualizar el resumen"
        description="Intenta cargar la actividad de nuevo."
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
        <DetailSectionHeading
          title="Actividad reciente"
          color="primary"
          :description="`${activeWorkshop?.name ?? 'Todos los talleres'} · Actualizado el ${updatedLabel}`"
        >
          <template #actions>
            <UButton
              v-if="canViewReports"
              to="/reportes"
              label="Ver reportes"
              icon="i-lucide-chart-no-axes-combined"
              color="neutral"
              variant="outline"
            />
            <UButton
              v-if="canManageOrders"
              to="/ordenes?create=1"
              icon="i-lucide-plus"
              label="Nueva orden"
            />
          </template>
        </DetailSectionHeading>

        <DashboardKpiGrid :kpis="data.kpis" :can-view-financials="data.canViewFinancials" recent />

        <div class="grid items-start gap-6 xl:grid-cols-3">
          <DashboardActivityFeed
            :items="data.activity"
            :can-view-financials="data.canViewFinancials"
            :time-zone="data.timeZone"
            class="min-w-0 xl:col-span-2"
          />
          <div class="min-w-0 space-y-6">
            <DashboardAttention :attention="data.attention" />
            <DashboardUpcomingDeliveries
              :orders="data.upcomingDeliveries"
              :show-financials="data.canViewFinancials"
              upcoming
              compact
            />
          </div>
        </div>

        <DashboardRecentOrders :orders="data.recentOrders" :show-financials="data.canViewFinancials" recent />
      </div>
    </template>
  </UDashboardPanel>
</template>
