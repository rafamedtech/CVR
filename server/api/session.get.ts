export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const prisma = usePrisma()

  const workshops = context.isSuperAdmin || context.isReadOnly
    ? await prisma.workshop.findMany({
        where: { active: true },
        orderBy: { name: 'asc' }
      })
    : context.profile.memberships
        .filter(item => item.workshop.active)
        .map(item => ({
          ...item.workshop,
          role: item.role
        }))

  return {
    profile: {
      id: context.profile.id,
      email: context.profile.email,
      fullName: context.profile.fullName,
      isSuperAdmin: context.isSuperAdmin,
      isReadOnly: context.isReadOnly
    },
    workshops: workshops.map(workshop => ({
      id: workshop.id,
      slug: workshop.slug,
      name: workshop.name,
      type: workshop.type,
      taxRate: Number(workshop.taxRate),
      role: context.isReadOnly ? 'READ_ONLY' : 'role' in workshop ? workshop.role : undefined
    })),
    selectedWorkshopId: context.workshopId,
    selectedWorkshop: context.selectedWorkshop
      ? {
          id: context.selectedWorkshop.id,
          slug: context.selectedWorkshop.slug,
          name: context.selectedWorkshop.name,
          type: context.selectedWorkshop.type,
          taxRate: Number(context.selectedWorkshop.taxRate)
        }
      : null,
    canViewAll: context.isSuperAdmin || context.isReadOnly
  }
})
