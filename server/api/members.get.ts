export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER'])
  const prisma = usePrisma()

  const profiles = await prisma.profile.findMany({
    where: context.isSuperAdmin && !context.workshopId
      ? {}
      : {
          memberships: {
            some: {
              workshopId: requireSelectedWorkshop(context)
            }
          }
        },
    include: {
      memberships: {
        include: { workshop: true }
      }
    },
    orderBy: { fullName: 'asc' }
  })

  return profiles.map(profile => ({
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    active: profile.active,
    isSuperAdmin: profile.isSuperAdmin,
    memberships: profile.memberships.map(membership => ({
      workshopId: membership.workshopId,
      workshopName: membership.workshop.name,
      role: membership.role
    }))
  }))
})
