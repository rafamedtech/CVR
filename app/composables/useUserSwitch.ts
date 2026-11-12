import type { DropdownMenuItem } from '@nuxt/ui'

export function useUserSwitch() {
  const { session } = useCrmSession()
  const toast = useToast()
  const switching = shallowRef(false)
  const { data: users, status, execute } = useFetch('/api/session-users', {
    immediate: false,
    watch: false
  })

  async function switchUser(profileId: string | null) {
    if (switching.value) return
    switching.value = true
    try {
      await $fetch('/api/session-user', { method: 'PUT', body: { profileId } })
      await reloadNuxtApp({ force: true, path: '/' })
    } catch {
      toast.add({ title: 'No se pudo cambiar de usuario', description: 'Intenta nuevamente.', color: 'error' })
    } finally {
      switching.value = false
    }
  }

  async function loadUsers(open: boolean) {
    if (open && session.value?.userSwitch && status.value !== 'pending') await execute()
  }

  const switchItems = computed<DropdownMenuItem[]>(() => {
    if (!session.value?.userSwitch) return []
    const children: DropdownMenuItem[] = (users.value ?? []).map(user => ({
      label: `${user.fullName} · ${user.email}`,
      icon: user.id === session.value?.profile.id ? 'i-lucide-check' : 'i-lucide-user',
      disabled: switching.value || user.id === session.value?.profile.id,
      onSelect: () => switchUser(user.id)
    }))
    if (!children.length) {
      children.push({
        label: status.value === 'error' ? 'Reintentar cargar usuarios' : 'Cargando usuarios…',
        disabled: status.value !== 'error',
        onSelect: () => execute()
      })
    }
    return [
      ...(session.value.profile.id !== session.value.userSwitch.id
        ? [{
            label: `Volver a ${session.value.userSwitch.fullName}`,
            icon: 'i-lucide-undo-2',
            disabled: switching.value,
            onSelect: () => switchUser(null)
          }]
        : []),
      { label: 'Cambiar usuario', icon: 'i-lucide-users-round', children }
    ]
  })

  return { switchItems, loadUsers, switching }
}
