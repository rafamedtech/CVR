import type { LocationQueryRaw } from 'vue-router'
import { parseDate, type DateValue } from '@internationalized/date'
import { calendarDateKeyInTimeZone } from '@rafamedtech/nuxt-shared/utils'
import { DEFAULT_WORKSHOP_TIME_ZONE } from '~/utils/datetime'

export function useReportPeriod() {
  const router = useRouter()
  const { query: initialQuery } = router.currentRoute.value
  const today = calendarDateKeyInTimeZone(new Date(), DEFAULT_WORKSHOP_TIME_ZONE)
  const currentMonth = parseDate(today)
  const routeMonth = typeof initialQuery.month === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(initialQuery.month) && initialQuery.month <= today.slice(0, 7)
    ? parseDate(`${initialQuery.month}-01`)
    : currentMonth
  const selectedMonth = shallowRef<DateValue>(routeMonth)
  const annual = shallowRef(initialQuery.view === 'annual')
  const month = computed(() => selectedMonth.value.toString().slice(0, 7))
  const periodQuery = computed(() => {
    const selected = selectedMonth.value
    const year = month.value.slice(0, 4)
    const endOfMonth = selected.set({ day: selected.calendar.getDaysInMonth(selected) }).toString().slice(0, 10)
    return {
      from: annual.value ? `${year}-01-01` : `${month.value}-01`,
      to: annual.value ? (selected.year === currentMonth.year ? today : `${year}-12-31`) : month.value === today.slice(0, 7) ? today : endOfMonth,
      monthEnd: annual.value ? `${year}-12-31` : endOfMonth,
      view: annual.value ? 'annual' : 'monthly'
    }
  })
  async function syncPeriod(extra: Record<string, string> = {}) {
    const route = router.currentRoute.value
    const query: LocationQueryRaw = { ...route.query, month: month.value, view: annual.value ? 'annual' : undefined }
    delete query.scope
    delete query.business
    await router.replace({ query: { ...query, ...extra }, hash: route.hash })
  }
  return { selectedMonth, currentMonth, annual, month, periodQuery, syncPeriod }
}
