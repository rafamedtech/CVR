import { getDashboardOverview } from '../../utils/dashboard-overview'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  if (!context.isReadOnly) requireSelectedWorkshop(context)
  return getDashboardOverview(context)
})
