<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const supabase = useSupabaseClient()
const colorMode = useColorMode()
const { session, setSession, isReadOnly } = useCrmSession()
const { switchItems, loadUsers, switching } = useUserSwitch()

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
  label: isReadOnly.value ? 'Sólo lectura' : session.value?.profile.isSuperAdmin ? 'Administrador general' : 'Usuario de taller',
  icon: session.value?.profile.isSuperAdmin ? 'i-lucide-shield-check' : 'i-lucide-user'
}], [...switchItems.value, {
  label: colorMode.value === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro',
  icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
  onSelect: () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }
}, ...(!isReadOnly.value
  ? [{
      label: 'Configuración',
      icon: 'i-lucide-settings',
      to: '/configuracion'
    }]
  : [])], [{
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
    @update:open="loadUsers"
  >
    <UButton
      :label="collapsed ? undefined : session?.profile.fullName"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :loading="switching"
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
    >
      <template #leading>
        <UAvatar :text="initials" size="2xs" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
