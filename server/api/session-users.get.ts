export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event, { ignoreUserSwitch: true })
  if (!canSwitchCrmUsers(context.profile)) {
    throw createError({ statusCode: 403, statusMessage: 'No tienes permiso para cambiar de usuario.' })
  }

  return usePrisma().profile.findMany({
    where: {
      active: true,
      OR: [
        { isSuperAdmin: true },
        { isReadOnly: true },
        { memberships: { some: { workshop: { active: true } } } }
      ]
    },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: 'asc' }
  })
})
