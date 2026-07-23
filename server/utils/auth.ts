import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import type { Profile, Workshop, WorkshopMember } from '../../generated/prisma/client'

type ProfileWithMemberships = Profile & {
  memberships: Array<WorkshopMember & { workshop: Workshop }>
}

export interface CrmRequestContext {
  profile: ProfileWithMemberships
  workshopId: string | null
  selectedWorkshop: Workshop | null
  isSuperAdmin: boolean
}

async function ensureDefaultWorkshops() {
  const prisma = usePrisma()

  return Promise.all([
    prisma.workshop.upsert({
      where: { slug: 'carroceria' },
      update: {},
      create: {
        slug: 'carroceria',
        name: 'Taller de Carrocería',
        type: 'BODY_SHOP'
      }
    }),
    prisma.workshop.upsert({
      where: { slug: 'mecanica' },
      update: {},
      create: {
        slug: 'mecanica',
        name: 'Taller Mecánico',
        type: 'MECHANICAL'
      }
    })
  ])
}

async function bootstrapFirstUser(userId: string, email: string) {
  const prisma = usePrisma()
  const profileCount = await prisma.profile.count()

  if (profileCount > 0) {
    return null
  }

  const configuredEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  if (configuredEmail && configuredEmail !== email.toLowerCase()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Este usuario no está autorizado para inicializar el sistema.'
    })
  }

  const workshops = await ensureDefaultWorkshops()
  const fullName = email.split('@')[0]?.replace(/[._-]/g, ' ') || 'Administrador'

  return prisma.profile.create({
    data: {
      id: userId,
      email,
      fullName,
      isSuperAdmin: true,
      memberships: {
        create: workshops.map(workshop => ({
          workshopId: workshop.id,
          role: 'MANAGER'
        }))
      }
    },
    include: {
      memberships: {
        include: { workshop: true }
      }
    }
  })
}

export async function requireCrmUser(event: H3Event): Promise<CrmRequestContext> {
  const claims = await serverSupabaseUser(event)
  const userId = claims?.sub
  const email = typeof claims?.email === 'string' ? claims.email : null

  if (!userId || !email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Tu sesión expiró. Inicia sesión nuevamente.'
    })
  }

  const prisma = usePrisma()
  let profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { workshop: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!profile) {
    profile = await bootstrapFirstUser(userId, email)
  }

  if (!profile || !profile.active) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tu usuario no tiene acceso al CRM.'
    })
  }

  const selected = getCookie(event, 'crm-workshop')
  let selectedWorkshop: Workshop | null = null

  if (profile.isSuperAdmin) {
    if (selected && selected !== 'all') {
      selectedWorkshop = await prisma.workshop.findFirst({
        where: { id: selected, active: true }
      })
    }
  } else {
    const membership = profile.memberships.find(item => item.workshopId === selected)
      ?? profile.memberships.find(item => item.workshop.active)

    if (!membership) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Tu usuario no está asignado a un taller activo.'
      })
    }

    selectedWorkshop = membership.workshop
  }

  return {
    profile,
    workshopId: selectedWorkshop?.id ?? null,
    selectedWorkshop,
    isSuperAdmin: profile.isSuperAdmin
  }
}

export function requireSelectedWorkshop(context: CrmRequestContext) {
  if (!context.workshopId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selecciona un taller antes de crear o modificar información.'
    })
  }

  return context.workshopId
}

export function requireWorkshopRole(context: CrmRequestContext, roles: Array<'MANAGER' | 'ADVISOR' | 'TECHNICIAN' | 'CASHIER'>) {
  if (context.isSuperAdmin) return

  const membership = context.profile.memberships.find(item => item.workshopId === context.workshopId)
  if (!membership || !roles.includes(membership.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'No tienes permisos para realizar esta acción.'
    })
  }
}

export function currentWorkshopRole(context: CrmRequestContext) {
  if (context.isSuperAdmin) return null
  return context.profile.memberships.find(item => item.workshopId === context.workshopId)?.role ?? null
}

export function assignedOrderWhere(context: CrmRequestContext) {
  return currentWorkshopRole(context) === 'TECHNICIAN'
    ? { assignedToId: context.profile.id }
    : {}
}

export function workshopWhere(context: CrmRequestContext) {
  return context.workshopId ? { workshopId: context.workshopId } : {}
}
