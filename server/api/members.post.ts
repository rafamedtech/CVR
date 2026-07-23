import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

const memberSchema = z.object({
  email: z.email('Escribe un correo válido.'),
  fullName: z.string().trim().min(2, 'Escribe el nombre.').max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  workshopId: z.uuid('Selecciona un taller.'),
  role: z.enum(['MANAGER', 'ADVISOR', 'TECHNICIAN', 'CASHIER'])
})

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER'])
  const body = await readCrmBody(event, memberSchema)
  const prisma = usePrisma()

  if (!context.isSuperAdmin && body.workshopId !== context.workshopId) {
    throw createError({ statusCode: 403, statusMessage: 'No puedes agregar usuarios a otro taller.' })
  }

  const workshop = await prisma.workshop.findFirst({
    where: { id: body.workshopId, active: true }
  })
  if (!workshop) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el taller.' })
  }

  const existing = await prisma.profile.findUnique({ where: { email: body.email } })
  if (existing) {
    await prisma.workshopMember.upsert({
      where: {
        profileId_workshopId: {
          profileId: existing.id,
          workshopId: body.workshopId
        }
      },
      update: { role: body.role },
      create: {
        profileId: existing.id,
        workshopId: body.workshopId,
        role: body.role
      }
    })
    return { id: existing.id, invited: false }
  }

  const supabase = serverSupabaseServiceRole(event)
  const redirectTo = process.env.NUXT_PUBLIC_AUTH_REDIRECT_URL
    || `${getRequestURL(event).origin}/confirm`
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(body.email, {
    redirectTo,
    data: { full_name: body.fullName }
  })

  if (error || !data.user) {
    throw createError({
      statusCode: 400,
      statusMessage: error?.message ?? 'No fue posible enviar la invitación.'
    })
  }

  await prisma.profile.create({
    data: {
      id: data.user.id,
      email: body.email,
      fullName: body.fullName,
      phone: body.phone || null,
      memberships: {
        create: {
          workshopId: body.workshopId,
          role: body.role
        }
      }
    }
  })

  return { id: data.user.id, invited: true }
})
