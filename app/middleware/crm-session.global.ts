import type { CrmSession } from '~/types/crm'

export default defineNuxtRouteMiddleware(async (to) => {
  if (['/login', '/forgot-password', '/confirm'].includes(to.path)) return

  const user = useSupabaseUser()
  const authSession = useSupabaseSession()
  const { session, setSession } = useCrmSession()
  const userId = user.value?.sub

  if (!userId && !authSession.value) {
    setSession(null)
    return navigateTo('/login', { replace: true })
  }
  // Auth updates the session before its asynchronous getClaims() updates the user.
  // With a session but no claims, let the API validate identity and load access.
  if (!userId || (session.value?.userSwitch?.id ?? session.value?.profile.id) !== userId || to.path === '/elegir-taller') {
    setSession(null)
    try {
      const requestFetch = useRequestFetch()
      const profile = await requestFetch<CrmSession>('/api/session')
      setSession(profile)
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode ?? 500
      throw createError({
        statusCode,
        statusMessage: statusCode === 403
          ? 'Tu cuenta todavía no tiene acceso al CRM. Revisa su vinculación en Configuración → Usuarios.'
          : 'No se pudo cargar tu perfil y los negocios. Intenta cargar la página nuevamente.'
      })
    }
  }

  if (session.value?.profile.isReadOnly && ['/', '/elegir-taller'].includes(to.path)) {
    return navigateTo('/reportes', { replace: true })
  }
})
