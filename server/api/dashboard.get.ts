import { getWorkshopDashboard } from '../utils/workshop-dashboard'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSelectedWorkshop(context)
  return getWorkshopDashboard(context, getQuery(event))
})
