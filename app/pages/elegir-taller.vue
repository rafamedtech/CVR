<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Elige tu taller' })

const { session, selectWorkshop, setSession } = useCrmSession()
const supabase = useSupabaseClient()
const pendingId = shallowRef<string | null>(null)
const error = shallowRef('')
const workshops = computed(() => (session.value?.workshops ?? [])
  .filter(workshop => ['BODY_SHOP', 'MECHANICAL'].includes(workshop.type))
  .toSorted((a, b) => a.type.localeCompare(b.type)))

async function startWorkshop(workshopId: string) {
  if (pendingId.value || !workshops.value.some(workshop => workshop.id === workshopId)) return
  pendingId.value = workshopId
  error.value = ''
  try {
    await selectWorkshop(workshopId, '/')
  } catch {
    error.value = 'Intenta seleccionar el taller nuevamente.'
    pendingId.value = null
  }
}

async function signOut() {
  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) {
    error.value = 'No se pudo cerrar la sesión. Intenta nuevamente.'
    return
  }
  setSession(null)
  await navigateTo('/login')
}
</script>

<template>
  <main class="flex min-h-dvh items-start justify-center bg-elevated/40 p-8 sm:p-12">
    <AppBrand />
    <WorkshopStartModal
      :workshops="workshops"
      :pending-id="pendingId"
      :error="error"
      @select="startWorkshop"
      @sign-out="signOut"
    />
  </main>
</template>
