/** Listado de fletes del negocio seleccionado o, en consulta global, de todos. */
export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const canViewCosts = canViewFreightCosts(context)
  const freights = await usePrisma().freight.findMany({
    where: freightAccessWhere(context),
    select: freightListSelect,
    orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }]
  })
  return freights.map(freight => serializeFreightListItem(freight, canViewCosts))
})
