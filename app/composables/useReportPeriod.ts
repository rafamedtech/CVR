import type { LocationQueryRaw } from 'vue-router'
import { parseDate, type DateValue } from '@internationalized/date'

export function useReportPeriod() {
  const route = useRoute()
  const router = useRouter()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Tijuana', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const currentMonth = parseDate(today)
  const routeMonth = typeof route.query.month === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(route.query.month) && route.query.month <= today.slice(0, 7)
    ? parseDate(`${route.query.month}-01`)
    : currentMonth
  const selectedMonth = shallowRef<DateValue>(routeMonth)
  const annual = shallowRef(route.query.view === 'annual')
  const month = computed(() => `${selectedMonth.value.year}-${String(selectedMonth.value.month).padStart(2, '0')}`)
  const periodQuery = computed(() => {
    const year = selectedMonth.value.year
    const endOfMonth = `${month.value}-${String(new Date(year, selectedMonth.value.month, 0).getDate()).padStart(2, '0')}`
    return {
      from: annual.value ? `${year}-01-01` : `${month.value}-01`,
      to: annual.value ? (year === currentMonth.year ? today : `${year}-12-31`) : month.value === today.slice(0, 7) ? today : endOfMonth,
      monthEnd: annual.value ? `${year}-12-31` : endOfMonth,
      view: annual.value ? 'annual' : 'monthly'
    }
  })
  async function syncPeriod(extra: Record<string, string> = {}) {
    const query: LocationQueryRaw = { ...route.query, month: month.value, view: annual.value ? 'annual' : undefined }
    delete query.scope
    delete query.business
    await router.replace({ query: { ...query, ...extra } })
  }
  return { selectedMonth, currentMonth, annual, month, periodQuery, syncPeriod }
}
