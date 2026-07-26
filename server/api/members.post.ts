import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

const memberSchema = z.object({
  email: z.email('Escribe un correo válido.').transform(email => email.trim().toLowerCase()),
  fullName: z.string().trim().min(2, 'Escribe el nombre.').max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  accessType: z.enum(['WORKSHOP', 'SUPER_ADMIN']),
  workshopId: z.string(),
  role: z.enum(['MANAGER', 'ADVISOR', 'TECHNICIAN', 'CASHIER'])
}).superRefine((value, context) => {
  if (value.accessType === 'WORKSHOP' && !z.uuid().safeParse(value.workshopId).success) {
    context.addIssue({
      code: 'custom',
      path: ['workshopId'],
      message: 'Selecciona un taller.'
    })
  }
})

async function findSupabaseUserByEmail(event: Parameters<typeof serverSupabaseServiceRole>[0], email: string) {
  const supabase = serverSupabaseServiceRole(event)
  const perPage = 1000

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw createError({
        statusCode: 502,
        statusMessage: 'No fue posible consultar los usuarios de Supabase.'
      })
    }

    const user = data.users.find(candidate => candidate.email?.toLowerCase() === email)
    if (user) return user
    if (data.users.length < perPage) return null
  }
}

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER'])
  const body = await readCrmBody(event, memberSchema)
  const prisma = usePrisma()

  if (body.accessType === 'SUPER_ADMIN' && !context.isSuperAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Sólo un administrador general puede dar este acceso.' })
  }

  if (
    body.accessType === 'WORKSHOP'
    && !context.isSuperAdmin
    && body.workshopId !== context.workshopId
  ) {
    throw createError({ statusCode: 403, statusMessage: 'No puedes agregar usuarios a otro taller.' })
  }

  if (body.accessType === 'WORKSHOP') {
    const workshop = await prisma.workshop.findFirst({
      where: { id: body.workshopId, active: true }
    })
    if (!workshop) {
      throw createError({ statusCode: 404, statusMessage: 'No se encontró el taller.' })
    }
  }

  const authUser = await findSupabaseUserByEmail(event, body.email)
  if (!authUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No existe una cuenta con ese correo en Supabase Auth. Créala primero y vuelve a intentar.'
    })
  }

  const existing = await prisma.profile.findFirst({
    where: {
      OR: [
        { id: authUser.id },
        { email: { equals: body.email, mode: 'insensitive' } }
      ]
    }
  })

  if (existing && existing.id !== authUser.id) {
    throw createError({
      statusCode: 409,
      statusMessage: 'El correo ya está vinculado a otra identidad. Revisa la cuenta antes de continuar.'
    })
  }

  if (body.accessType === 'WORKSHOP' && existing?.isSuperAdmin) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este usuario ya es administrador general y no necesita acceso por taller.'
    })
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.profile.upsert({
      where: { id: authUser.id },
      update: {
        email: body.email,
        fullName: body.fullName,
        phone: body.phone || null,
        active: true,
        ...(body.accessType === 'SUPER_ADMIN' ? { isSuperAdmin: true } : {})
      },
      create: {
        id: authUser.id,
        email: body.email,
        fullName: body.fullName,
        phone: body.phone || null,
        isSuperAdmin: body.accessType === 'SUPER_ADMIN'
      }
    })

    if (body.accessType === 'WORKSHOP') {
      await transaction.workshopMember.upsert({
        where: {
          profileId_workshopId: {
            profileId: authUser.id,
            workshopId: body.workshopId
          }
        },
        update: { role: body.role },
        create: {
          profileId: authUser.id,
          workshopId: body.workshopId,
          role: body.role
        }
      })
    }
  })

  return {
    id: authUser.id,
    accessType: body.accessType
  }
})
