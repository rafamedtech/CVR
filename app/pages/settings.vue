<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { session } = useCrmSession()
const links = computed<NavigationMenuItem[]>(() => [{
  label: 'General',
  icon: 'i-lucide-building-2',
  to: '/settings',
  exact: true
}, ...(session.value?.profile.isSuperAdmin || session.value?.workshops.some(workshop => (
  workshop.id === session.value?.selectedWorkshopId && workshop.role === 'MANAGER'
))
  ? [{
      label: 'Usuarios',
      icon: 'i-lucide-users',
      to: '/settings/members'
    }]
  : [])])
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-10' }">
    <template #header>
      <UDashboardNavbar title="Configuración">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-4xl">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
