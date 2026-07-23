<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const supabase = useSupabaseClient()
const colorMode = useColorMode()
const { session, setSession } = useCrmSession()

const initials = computed(() => session.value?.profile.fullName
  .split(' ')
  .slice(0, 2)
  .map(part => part[0])
  .join('')
  .toUpperCase() || 'U')

const items = computed<DropdownMenuItem[][]>(() => [[{
  type: 'label',
  label: session.value?.profile.fullName ?? 'Usuario'
}, {
  label: session.value?.profile.isSuperAdmin ? 'Administrador general' : 'Usuario de taller',
  icon: session.value?.profile.isSuperAdmin ? 'i-lucide-shield-check' : 'i-lucide-user'
}], [{
  label: colorMode.value === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro',
  icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
  onSelect: () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }
}, {
  label: 'Configuración',
  icon: 'i-lucide-settings',
  to: '/settings'
}], [{
  label: 'Cerrar sesión',
  icon: 'i-lucide-log-out',
  onSelect: async () => {
    await supabase.auth.signOut()
    setSession(null)
    await navigateTo('/login')
  }
}]])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-52' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="collapsed ? undefined : session?.profile.fullName"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
    >
      <template #leading>
        <UAvatar :text="initials" size="2xs" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
