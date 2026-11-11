import type { BusinessReportData } from '../../../app/types/reports'
import { resolveReportPeriod } from '../../../shared/report-period'
import { getWorkshopDashboard } from '../../utils/workshop-dashboard'
import { isCarolinaReportsConfigured, readCarolinaReport } from '../../utils/carolina-reports'

export default defineEventHandler(async (event): Promise<BusinessReportData> => {
  const context = await requireCrmUser(event)
  requireGlobalReadAccess(context)
  const query = getQuery(event)
  const business = typeof query.business === 'string' ? query.business : 'all'
  if (business === 'carolina-pinturas') {
    let period: ReturnType<typeof resolveReportPeriod>['period']
    try {
      period = resolveReportPeriod(query).period
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'El rango de fechas no es válido.' })
    }
    const result: BusinessReportData = { business, businessName: 'Carolina Pinturas', report: null, consolidation: null, status: 'not-configured' }
    if (!isCarolinaReportsConfigured()) return result
    try {
      const carolina = await readCarolinaReport(period)
      return {
        ...result, report: carolina.report, status: 'connected',
        consolidation: { status: 'connected', businesses: [{ id: business, name: result.businessName, metrics: carolina.report.metrics }], internalOperations: carolina.internalOperations }
      }
    } catch {
      return { ...result, status: 'unavailable' }
    }
  }
  if (business === 'all') {
    const dashboard = await getWorkshopDashboard(context, query, { includeCarolina: true, allWorkshops: true, beforeTax: true, reportOnly: true })
    return { business, businessName: 'Todos los negocios', report: dashboard.report, consolidation: dashboard.consolidation, status: dashboard.consolidation?.status ?? 'unavailable' }
  }
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(business)) {
    throw createError({ statusCode: 400, statusMessage: 'Selecciona un negocio válido.' })
  }
  const workshop = await usePrisma().workshop.findFirst({ where: { id: business, active: true } })
  if (!workshop) throw createError({ statusCode: 404, statusMessage: 'No se encontró el taller seleccionado.' })
  const dashboard = await getWorkshopDashboard({ ...context, workshopId: workshop.id, selectedWorkshop: workshop }, query, { beforeTax: true, reportOnly: true })
  return { business, businessName: workshop.name, report: dashboard.report, consolidation: null, status: 'connected' }
})
