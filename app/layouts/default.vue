<script setup lang="ts">
import type { CommandPaletteGroup, NavigationMenuItem } from '@nuxt/ui'

const open = shallowRef(false)
const { session: sessionData } = useCrmSession()

const selectedRole = computed(() => sessionData.value?.workshops.find(workshop => (
  workshop.id === sessionData.value?.selectedWorkshopId
))?.role)
const canViewFinancials = computed(() => (
  sessionData.value?.profile.isSuperAdmin
  || selectedRole.value === 'MANAGER'
  || selectedRole.value === 'CASHIER'
  || sessionData.value?.profile.isReadOnly
  || selectedRole.value === 'READ_ONLY'
))

const isTransport = computed(() => sessionData.value?.selectedWorkshop?.type === 'TRANSPORT')
// Fletes: negocio Transporte o consulta global (super admin / sólo lectura sin negocio seleccionado).
const showFreights = computed(() => isTransport.value || (sessionData.value?.canViewAll === true && !sessionData.value.selectedWorkshopId))

const links = computed<NavigationMenuItem[][]>(() => [[
  ...(!sessionData.value?.profile.isReadOnly && !isTransport.value
    ? [{
        label: 'Resumen',
        icon: 'i-lucide-layout-dashboard',
        to: '/',
        exact: true,
        onSelect: () => { open.value = false }
      }]
    : []),
  ...(sessionData.value?.canViewAll
    ? [{
        label: 'Reportes',
        icon: 'i-lucide-chart-no-axes-combined',
        to: '/reportes',
        onSelect: () => { open.value = false }
      }]
    : []),
  {
    label: 'Clientes',
    icon: 'i-lucide-users',
    to: '/clientes',
    onSelect: () => { open.value = false }
  },
  ...(!isTransport.value
    ? [{
        label: 'Vehículos',
        icon: 'i-lucide-car-front',
        to: '/vehiculos',
        onSelect: () => { open.value = false }
      }, {
        label: 'Órdenes',
        icon: 'i-lucide-clipboard-list',
        to: '/ordenes',
        onSelect: () => { open.value = false }
      }]
    : []),
  ...(showFreights.value
    ? [{
        label: 'Fletes',
        icon: 'i-lucide-truck',
        to: '/fletes',
        onSelect: () => { open.value = false }
      }]
    : []),
  ...(canViewFinancials.value && !isTransport.value
    ? [{
        label: 'Pagos',
        icon: 'i-lucide-hand-coins',
        to: '/pagos',
        onSelect: () => { open.value = false }
      }]
    : []),
  ...(canViewFinancials.value
    ? [{
        label: 'Gastos',
        icon: 'i-lucide-receipt-text',
        to: '/gastos',
        onSelect: () => { open.value = false }
      }]
    : []),
  ...(!sessionData.value?.profile.isReadOnly
    ? [{
        label: 'Configuración',
        icon: 'i-lucide-settings',
        to: '/configuracion',
        onSelect: () => { open.value = false }
      }]
    : [])
]])

const groups = computed<CommandPaletteGroup[]>(() => [{
  id: 'navigation',
  label: 'Ir a',
  items: links.value.flat().map(item => ({
    label: String(item.label ?? ''),
    icon: typeof item.icon === 'string' ? item.icon : undefined,
    to: typeof item.to === 'string' ? item.to : undefined
  }))
}])

useHead({
  titleTemplate: title => title ? `${title} · Control de Talleres` : 'Control de Talleres'
})
</script>

<template>
  <DashboardShell
    v-model:open="open"
    sidebar-id="crm"
    sidebar-class="bg-elevated/40"
    :items="links[0]"
    :groups="groups"
    :sidebar-ui="{ header: 'h-auto py-2' }"
    search-label="Buscar"
    :navigation-ui="{
      link: 'max-lg:gap-2 max-lg:px-3 max-lg:py-2 max-lg:text-base',
      linkLeadingIcon: 'max-lg:size-6',
      linkTrailingIcon: 'max-lg:size-6'
    }"
  >
    <template #header="{ collapsed }">
      <AppBrand :collapsed="collapsed" />
    </template>
    <template #sidebar="{ collapsed }">
      <div v-if="!collapsed && !sessionData?.profile.isReadOnly" class="mt-auto px-3 pb-2">
        <p class="text-xs text-muted">
          {{ sessionData?.selectedWorkshop?.name ?? 'Vista consolidada' }}
        </p>
      </div>
    </template>
    <template #footer="{ collapsed }">
      <UserMenu :collapsed="collapsed" />
    </template>
    <slot />
  </DashboardShell>
</template>
