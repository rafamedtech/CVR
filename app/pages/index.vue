<script setup lang="ts">
import type { DashboardOverviewData } from '~/types/crm'

useHead({ title: 'Resumen' })
const { activeWorkshop, isReadOnly, isSuperAdmin, currentRole, canManageOrders, canViewReports } = useCrmSession()
const { data, status, error, refresh } = useFetch<DashboardOverviewData>('/api/dashboard/overview', {
  lazy: true,
  server: false,
  key: 'crm-overview',
  immediate: Boolean(activeWorkshop.value) || isReadOnly.value
})
const initialLoading = computed(() => !data.value && (status.value === 'idle' || status.value === 'pending'))
const canViewFinancials = computed(() => data.value?.canViewFinancials
  ?? (isSuperAdmin.value || isReadOnly.value || ['MANAGER', 'CASHIER', 'READ_ONLY'].includes(currentRole.value ?? '')))
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
      <div v-else-if="data || initialLoading" class="space-y-6" :aria-busy="status === 'pending' || initialLoading">
        <span v-if="initialLoading" role="status" class="sr-only">Cargando resumen…</span>
        <DetailSectionHeading
          title="Actividad reciente"
          color="primary"
          :description="`${activeWorkshop?.name ?? 'Todos los talleres'}${updatedLabel ? ` · Actualizado el ${updatedLabel}` : ''}`"
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

        <DashboardKpiGrid
          :kpis="data?.kpis"
          :can-view-financials="canViewFinancials"
          :loading="initialLoading"
          recent
        />

        <div class="grid items-start gap-6 xl:grid-cols-3">
          <DashboardActivityFeed
            :items="data?.activity ?? []"
            :can-view-financials="canViewFinancials"
            :time-zone="data?.timeZone ?? 'America/Tijuana'"
            :loading="initialLoading"
            class="min-w-0 xl:col-span-2"
          />
          <div class="min-w-0 space-y-6">
            <DashboardAttention :attention="data?.attention" :loading="initialLoading" />
            <DashboardUpcomingDeliveries
              :orders="data?.upcomingDeliveries ?? []"
              :show-financials="canViewFinancials"
              :loading="initialLoading"
              upcoming
              compact
            />
          </div>
        </div>

        <DashboardRecentOrders
          :orders="data?.recentOrders ?? []"
          :show-financials="canViewFinancials"
          :loading="initialLoading"
          recent
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
