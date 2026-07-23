import type { CrmSession } from '~/types/crm'

export function useCrmSession() {
  const session = useState<CrmSession | null>('crm-session', () => null)

  const activeWorkshop = computed(() => session.value?.selectedWorkshop ?? null)
  const isAllWorkshops = computed(() => session.value?.canViewAll === true && session.value.selectedWorkshopId === null)
  const canCreateInWorkshop = computed(() => Boolean(session.value?.selectedWorkshopId))
  const currentRole = computed(() => session.value?.workshops.find(workshop => (
    workshop.id === session.value?.selectedWorkshopId
  ))?.role ?? null)
  const isSuperAdmin = computed(() => session.value?.profile.isSuperAdmin === true)
  const canManageCustomers = computed(() => (
    canCreateInWorkshop.value
    && (isSuperAdmin.value || currentRole.value === 'MANAGER' || currentRole.value === 'ADVISOR')
  ))
  const canManageOrders = canManageCustomers
  const canRecordPayments = computed(() => (
    canCreateInWorkshop.value
    && (isSuperAdmin.value || ['MANAGER', 'ADVISOR', 'CASHIER'].includes(currentRole.value ?? ''))
  ))

  function setSession(value: CrmSession | null) {
    session.value = value
  }

  async function selectWorkshop(workshopId: string | null) {
    const cookie = useCookie<string>('crm-workshop', {
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    })
    cookie.value = workshopId ?? 'all'
    await reloadNuxtApp({ force: true })
  }

  return {
    session: readonly(session),
    activeWorkshop,
    isAllWorkshops,
    canCreateInWorkshop,
    currentRole,
    isSuperAdmin,
    canManageCustomers,
    canManageOrders,
    canRecordPayments,
    setSession,
    selectWorkshop
  }
}
