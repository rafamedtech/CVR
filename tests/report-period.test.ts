import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveReportPeriod } from '../shared/report-period'
import { reportDayEnd } from '../shared/report'

const now = new Date('2026-11-10T04:00:00Z')

test('summary and business reports share the local day and full comparison period', () => {
  const monthly = resolveReportPeriod({}, now)
  assert.equal(monthly.startKey, '2026-11-01')
  assert.equal(monthly.endKey, '2026-11-09')
  assert.equal(monthly.period.elapsedDays, 9)
  assert.equal(monthly.period.totalDays, 30)
  const annual = resolveReportPeriod({ view: 'annual' }, now)
  assert.equal(annual.startKey, '2026-01-01')
  assert.equal(annual.endKey, monthly.endKey)
  assert.equal(annual.period.totalDays, 365)
})

test('historical monthly and annual business reports retain the requested dates', () => {
  const month = resolveReportPeriod({ from: '2026-09-01', to: '2026-09-30', monthEnd: '2026-09-30', view: 'monthly', business: 'carolina-pinturas' }, now)
  assert.equal(month.period.elapsedDays, 30)
  assert.equal(month.period.mode, 'monthly')
  const year = resolveReportPeriod({ from: '2024-01-01', to: '2024-12-31', monthEnd: '2024-12-31', view: 'annual' }, now)
  assert.equal(year.period.elapsedDays, 366)
  assert.equal(year.period.totalDays, 366)
})

test('report periods reject future dates, invalid days, unknown views and mismatched ranges', () => {
  assert.throws(() => resolveReportPeriod({ view: 'weekly' }, now))
  assert.throws(() => resolveReportPeriod({ from: '2026-02-01', to: '2026-02-30', monthEnd: '2026-02-28' }, now))
  assert.throws(() => resolveReportPeriod({ from: '2026-11-01', to: '2026-11-30', monthEnd: '2026-11-30' }, now))
  assert.throws(() => resolveReportPeriod({ from: '2026-09-02', to: '2026-09-30', monthEnd: '2026-09-30' }, now))
  assert.throws(() => resolveReportPeriod({ from: '2026-09-01', to: '2026-09-30', monthEnd: '2026-10-31' }, now))
})

test('year boundaries follow the workshop calendar and end at the last local millisecond', () => {
  const timeZone = 'America/Tijuana'
  const localYearEnd = new Date('2026-01-01T07:59:59.999Z')
  const { startKey, endKey, fullEndKey, period } = resolveReportPeriod({ view: 'annual' }, localYearEnd, timeZone)
  assert.equal(startKey, '2025-01-01')
  assert.equal(endKey, '2025-12-31')
  assert.equal(fullEndKey, endKey)
  assert.equal(period.elapsedDays, 365)
  assert.deepEqual(reportDayEnd(endKey, timeZone), localYearEnd)
  assert.equal(reportDayEnd('2026-03-08', timeZone).toISOString(), '2026-03-09T06:59:59.999Z')
  assert.throws(() => resolveReportPeriod({ from: '2026-01-01', to: '2026-01-01', monthEnd: '2026-01-31' }, localYearEnd, timeZone), /Rango de fechas inválido/)
  assert.equal(resolveReportPeriod({}, new Date('2026-01-01T08:00:00Z'), timeZone).period.elapsedDays, 1)
})
