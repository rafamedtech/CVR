import { z } from 'zod'
import { taxRateSchema } from '../utils/tax'

const settingsSchema = z.object({
  taxRate: taxRateSchema
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER'])
  const workshopId = requireSelectedWorkshop(context)
  const body = await readCrmBody(event, settingsSchema)
  const prisma = usePrisma()

  const workshop = await prisma.workshop.update({
    where: { id: workshopId },
    data: { taxRate: body.taxRate }
  })

  return { taxRate: Number(workshop.taxRate) }
})
