export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const workshopId = requireSelectedWorkshop(context)
  const prisma = usePrisma()

  const memberships = await prisma.workshopMember.findMany({
    where: {
      workshopId,
      profile: { active: true }
    },
    include: { profile: true },
    orderBy: { profile: { fullName: 'asc' } }
  })

  return memberships.map(membership => ({
    id: membership.profile.id,
    fullName: membership.profile.fullName,
    role: membership.role
  }))
})
