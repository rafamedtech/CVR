import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import type { Profile, Workshop, WorkshopMember, WorkshopRole } from '../../generated/prisma/client'

type ProfileWithMemberships = Profile & {
  memberships: Array<WorkshopMember & { workshop: Workshop }>
}

export interface CrmRequestContext {
  userSwitch?: { id: string, fullName: string }
  profile: ProfileWithMemberships
  workshopId: string | null
  selectedWorkshop: Workshop | null
  isSuperAdmin: boolean
  isReadOnly: boolean
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

export function canSwitchCrmUsers(profile: Profile) {
  return profile.active && profile.isSuperAdmin && !profile.isReadOnly
    && profile.email.toLowerCase() === 'rafamed.tech@gmail.com'
}

export async function requireCrmUser(event: H3Event, options: { ignoreUserSwitch?: boolean } = {}): Promise<CrmRequestContext> {
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

  const actor = profile
  const userSwitch = canSwitchCrmUsers(actor) ? { id: actor.id, fullName: actor.fullName } : undefined
  const targetId = getCookie(event, 'crm-user-switch')
  if (userSwitch && targetId && !options.ignoreUserSwitch) {
    const target = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(targetId)
      ? await prisma.profile.findUnique({
          where: { id: targetId },
          include: { memberships: { include: { workshop: true }, orderBy: { createdAt: 'asc' } } }
        })
      : null
    if (target?.active && (target.isSuperAdmin || target.isReadOnly || target.memberships.some(item => item.workshop.active))) {
      profile = target
    } else {
      deleteCookie(event, 'crm-user-switch', { path: '/' })
    }
  }

  const selected = getCookie(event, 'crm-workshop')
  let selectedWorkshop: Workshop | null = null

  if (profile.isReadOnly) {
    // Global consultation always ignores a previous workshop selection.
    selectedWorkshop = null
  } else if (profile.isSuperAdmin) {
    if (selected && selected !== 'all') {
      selectedWorkshop = await prisma.workshop.findFirst({
        where: { id: selected, active: true }
      })
    }
  } else {
    const membership = profile.memberships.find(item => item.workshopId === selected && item.workshop.active)
      ?? profile.memberships.find(item => item.workshop.active)

    if (!membership) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Tu usuario no está asignado a un taller activo.'
      })
    }

    selectedWorkshop = membership.workshop
  }

  const role = profile.memberships.find(item => item.workshopId === selectedWorkshop?.id)?.role
  if ((profile.isReadOnly || (!profile.isSuperAdmin && role === 'READ_ONLY')) && !['GET', 'HEAD', 'OPTIONS'].includes(event.method)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tu usuario tiene permisos de sólo lectura.'
    })
  }

  return {
    userSwitch,
    profile,
    workshopId: selectedWorkshop?.id ?? null,
    selectedWorkshop,
    isSuperAdmin: profile.isSuperAdmin && !profile.isReadOnly,
    isReadOnly: profile.isReadOnly
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

export function requireSuperAdmin(context: CrmRequestContext) {
  if (!context.isSuperAdmin || context.isReadOnly) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Sólo los administradores generales pueden realizar esta acción.'
    })
  }
}

export function requireGlobalReadAccess(context: CrmRequestContext) {
  if (!context.isSuperAdmin && !context.isReadOnly) {
    throw createError({ statusCode: 403, statusMessage: 'No tienes acceso a la consulta global.' })
  }
}

export function requireWorkshopRole(context: CrmRequestContext, roles: WorkshopRole[]) {
  if (context.isReadOnly) {
    if (roles.includes('READ_ONLY')) return
    throw createError({ statusCode: 403, statusMessage: 'Tu usuario tiene permisos de sólo lectura.' })
  }
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
  if (context.isReadOnly) return 'READ_ONLY' as const
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

export function customerAccessWhere(context: CrmRequestContext) {
  return context.workshopId
    ? { workshops: { some: { workshopId: context.workshopId } } }
    : {}
}

export function vehicleAccessWhere(context: CrmRequestContext) {
  return context.workshopId
    ? { workshops: { some: { workshopId: context.workshopId } } }
    : {}
}
