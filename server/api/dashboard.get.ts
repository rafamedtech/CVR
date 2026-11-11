import { getWorkshopDashboard } from '../utils/workshop-dashboard'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  if (context.isReadOnly) {
    return getWorkshopDashboard(context, getQuery(event), { includeCarolina: true, allWorkshops: true, beforeTax: true })
  }
  requireSelectedWorkshop(context)
  return getWorkshopDashboard(context, getQuery(event))
})
