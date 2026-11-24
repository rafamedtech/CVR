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

const identityItems = computed<DropdownMenuItem[]>(() => [{
  label: isReadOnly.value ? 'Sólo lectura' : session.value?.profile.isSuperAdmin ? 'Administrador general' : 'Usuario de taller',
  icon: session.value?.profile.isSuperAdmin ? 'i-lucide-shield-check' : 'i-lucide-user'
}])

const items = computed<DropdownMenuItem[][]>(() => [[...switchItems.value, {
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
  <UserMenuBase
    :name="session?.profile.fullName"
    :identity-items="identityItems"
    :items="items"
    :collapsed="collapsed"
    collapsed-content-class="w-52"
    :loading="switching"
    @update:open="loadUsers"
  >
    <template #leading>
      <UAvatar :text="initials" size="2xs" />
    </template>
  </UserMenuBase>
</template>
