<script setup lang="ts">
import type { DashboardOverviewData } from '~/types/crm'

useHead({ title: 'Resumen' })
const { session, activeWorkshop, isReadOnly, isSuperAdmin, currentRole, canManageOrders, canViewReports } = useCrmSession()
const contextKey = computed(() => `${session.value?.profile.id ?? ''}:${activeWorkshop.value?.id ?? ''}`)
const { data: response, status, error, refresh } = useFetch<DashboardOverviewData>('/api/dashboard/overview', {
  lazy: true,
  server: false,
  key: computed(() => `crm-overview:${contextKey.value}`),
  immediate: Boolean(activeWorkshop.value) || isReadOnly.value
})
const lastSuccessful = shallowRef<{ context: string, data: DashboardOverviewData }>()
watch([response, status], ([result, state]) => {
  if (state === 'success' && result) lastSuccessful.value = { context: contextKey.value, data: result }
}, { immediate: true })
const data = computed(() => response.value ?? (lastSuccessful.value?.context === contextKey.value
  ? lastSuccessful.value.data
  : undefined))
const initialLoading = computed(() => !data.value && (status.value === 'idle' || status.value === 'pending'))
const canViewFinancials = computed(() => data.value?.canViewFinancials
  ?? (isSuperAdmin.value || isReadOnly.value || ['MANAGER', 'CASHIER', 'READ_ONLY'].includes(currentRole.value ?? '')))
const updatedLabel = computed(() => data.value
  ? formatDashboardUpdatedAt(data.value.updatedAt, data.value.timeZone)
  : '')
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <DashboardNavbar title="Resumen" :toggle="{ size: 'xl' }">
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
      </DashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        v-if="!activeWorkshop && !isReadOnly"
        title="Selecciona un taller"
        description="Elige Carrocería o Mecánica en el selector para ver su resumen."
        icon="i-lucide-building-2"
        class="py-16"
      />
      <RetryAlert
        v-if="error && (activeWorkshop || isReadOnly)"
        title="No se pudo actualizar el resumen"
        description="Intenta cargar la actividad de nuevo."
        :loading="status === 'pending'"
        @retry="refresh()"
      />
      <div v-if="(activeWorkshop || isReadOnly) && (data || initialLoading)" class="space-y-6" :aria-busy="status === 'pending' || initialLoading">
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
