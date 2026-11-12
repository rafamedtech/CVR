export default defineEventHandler(async (event) => {
  // Authorize the authenticated account, even when the selected user is read-only.
  const context = await requireCrmUser(event, { ignoreUserSwitch: true })
  if (!canSwitchCrmUsers(context.profile)) {
    throw createError({ statusCode: 403, statusMessage: 'No tienes permiso para cambiar de usuario.' })
  }

  const body = await readBody(event)
  const profileId = body?.profileId
  if (profileId !== null && (typeof profileId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(profileId))) {
    throw createError({ statusCode: 400, statusMessage: 'Selecciona un usuario válido.' })
  }

  if (profileId === null || profileId === context.profile.id) {
    deleteCookie(event, 'crm-user-switch', { path: '/' })
  } else {
    const profile = await usePrisma().profile.findFirst({
      where: {
        id: profileId,
        active: true,
        OR: [
          { isSuperAdmin: true },
          { isReadOnly: true },
          { memberships: { some: { workshop: { active: true } } } }
        ]
      },
      select: { id: true }
    })
    if (!profile) {
      throw createError({ statusCode: 404, statusMessage: 'Este usuario no tiene acceso activo al CRM.' })
    }
    setCookie(event, 'crm-user-switch', profile.id, {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'strict',
      path: '/'
    })
  }
  deleteCookie(event, 'crm-workshop', { path: '/' })
  return { success: true }
})
