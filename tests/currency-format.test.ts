import assert from 'node:assert/strict'
import test from 'node:test'
import { reportCurrency as sharedReportCurrency } from '@rafamedtech/nuxt-shared/utils'
import { formatCurrency } from '../app/utils/format/currency'
import { reportCurrency } from '../app/utils/reportPeriods'

const amounts = [1234.56, -1234.56, 0]
const mxn = ['$1,234.56', '-$1,234.56', '$0.00']

test('reportes usa el formateador MXN compartido con dos decimales', () => {
  assert.equal(reportCurrency, sharedReportCurrency)
  assert.deepEqual(amounts.map(reportCurrency.format), mxn)
})

test('CRM distingue MXN, USD, cero y valores ausentes', () => {
  assert.deepEqual(amounts.map(amount => formatCurrency(amount)), mxn)
  assert.deepEqual(amounts.map(amount => formatCurrency(amount, 'USD')), [
    'USD\u00a01,234.56', '-USD\u00a01,234.56', 'USD\u00a00.00'
  ])
  assert.equal(formatCurrency(null), '—')
  assert.equal(formatCurrency(undefined, 'USD'), '—')
})
