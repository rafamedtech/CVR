export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER'])
  const prisma = usePrisma()

  const profiles = await prisma.profile.findMany({
    where: context.isSuperAdmin
      ? {}
      : {
          memberships: {
            some: {
              workshopId: requireSelectedWorkshop(context)
            }
          }
        },
    select: {
      id: true, fullName: true, email: true, phone: true, active: true,
      isSuperAdmin: true, isReadOnly: true,
      memberships: {
        select: { workshopId: true, role: true, workshop: { select: { name: true } } }
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
    isReadOnly: profile.isReadOnly,
    memberships: profile.memberships.map(membership => ({
      workshopId: membership.workshopId,
      workshopName: membership.workshop.name,
      role: membership.role
    }))
  }))
})
