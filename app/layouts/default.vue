<script setup lang="ts">
import type { CommandPaletteGroup, NavigationMenuItem } from '@nuxt/ui'
import type { CrmSession } from '~/types/crm'

const open = shallowRef(false)
const { setSession } = useCrmSession()

const { data: sessionData } = await useFetch<CrmSession>('/api/session', {
  key: 'crm-session-data'
})

watch(sessionData, value => setSession(value ?? null), { immediate: true })

const selectedRole = computed(() => sessionData.value?.workshops.find(workshop => (
  workshop.id === sessionData.value?.selectedWorkshopId
))?.role)
const canViewExpenses = computed(() => (
  sessionData.value?.profile.isSuperAdmin
  || selectedRole.value === 'MANAGER'
  || selectedRole.value === 'CASHIER'
))

const links = computed<NavigationMenuItem[][]>(() => [[
  {
    label: 'Resumen',
    icon: 'i-lucide-layout-dashboard',
    to: '/',
    exact: true,
    onSelect: () => { open.value = false }
  },
  {
    label: 'Órdenes',
    icon: 'i-lucide-clipboard-list',
    to: '/ordenes',
    onSelect: () => { open.value = false }
  },
  {
    label: 'Clientes',
    icon: 'i-lucide-users',
    to: '/clientes',
    onSelect: () => { open.value = false }
  },
  {
    label: 'Vehículos',
    icon: 'i-lucide-car-front',
    to: '/vehiculos',
    onSelect: () => { open.value = false }
  },
  ...(canViewExpenses.value
    ? [{
        label: 'Gastos',
        icon: 'i-lucide-receipt-text',
        to: '/gastos',
        onSelect: () => { open.value = false }
      }]
    : []),
  {
    label: 'Configuración',
    icon: 'i-lucide-settings',
    to: '/configuracion',
    onSelect: () => { open.value = false }
  }
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
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="crm"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/40"
      :ui="{
        header: 'h-auto py-2',
        footer: 'lg:border-t lg:border-default'
      }"
    >
      <template #header="{ collapsed }">
        <AppBrand :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          label="Buscar"
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <div v-if="!collapsed" class="mt-auto px-3 pb-2">
          <p class="text-xs text-muted">
            {{ sessionData?.selectedWorkshop?.name ?? 'Vista consolidada' }}
          </p>
        </div>
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />
    <slot />
  </UDashboardGroup>
</template>
