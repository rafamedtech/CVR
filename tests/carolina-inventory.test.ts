import assert from 'node:assert/strict'
import test from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { buildCarolinaInventory, readCarolinaInventory } from '../server/utils/carolina-inventory'

const warehouses = [{ id: 'a', code: '2', name: 'Principal' }, { id: 'b', code: '10', name: 'Secundario' }, { id: 'c', code: '1', name: 'Vacío' }]
const balance = (warehouse_id: string, product_id: string, quantity: string, unit_cost: string | null, cost_currency: string | null = 'MXN') => ({ warehouse_id, product_id, quantity, product: { unit_cost, cost_currency } })

test('inventory values positive physical stock by currency and warehouse with decimal precision', () => {
  const result = buildCarolinaInventory(warehouses, [
    balance('a', 'paint', '3', '0.1'), balance('b', 'paint', '2', '0.1'),
    balance('a', 'import', '1.5', '10.25', 'USD'), balance('a', 'free', '1', '0'),
    balance('a', 'zero', '0', '100'), balance('b', 'negative', '-2', '100')
  ])
  assert.deepEqual(result.totals, [{ currencyCode: 'MXN', amount: 0.5 }, { currencyCode: 'USD', amount: 15.375 }])
  assert.deepEqual(result.warehouses.map(row => row.id), ['c', 'a', 'b'])
  assert.deepEqual(result.warehouses[0]?.totals, [])
  assert.equal(result.warehouses[1]?.totals[0]?.amount, 0.3)
  assert.equal(result.productsWithoutCost, 0)
})

test('inventory excludes missing costs and currencies and counts distinct products across warehouses', () => {
  const result = buildCarolinaInventory(warehouses, [
    balance('a', 'missing', '1', null), balance('b', 'missing', '2', null),
    balance('a', 'no-currency', '1', '2', null), balance('a', 'zero', '0', null)
  ])
  assert.equal(result.productsWithoutCost, 2)
  assert.deepEqual(result.totals, [])
  assert.equal(result.warehouses[1]?.productsWithoutCost, 2)
  assert.equal(result.warehouses[2]?.productsWithoutCost, 1)
  assert.deepEqual(buildCarolinaInventory([], []), { totals: [], productsWithoutCost: 0, warehouses: [] })
})

test('Carolina inventory matches the Pinturas T00 valuation fixture', async () => {
  const centro = { id: 'w1', code: 'CTR', name: 'Centro' }
  const norte = { id: 'w2', code: 'NTE', name: 'Norte' }
  const sur = { id: 'w3', code: 'SUR', name: 'Sur' }
  const client = createClient('https://carolina.example', 'test-key', {
    global: {
      fetch: async (input) => {
        const url = new URL(String(input))
        if (url.pathname.endsWith('/inventory_warehouses')) {
          return Response.json([sur, norte, centro])
        }
        assert.equal(url.pathname, '/rest/v1/inventory_balances')
        assert.equal(url.searchParams.get('quantity'), 'gt.0')
        return Response.json([
          balance('w1', 'p1', '2.5', '10.50'),
          balance('w1', 'p3', '1', null, null),
          balance('w2', 'p1', '1.5', '10.50'),
          balance('w2', 'p2', '3', '4', 'USD'),
          balance('w2', 'p3', '3', null, null)
        ])
      }
    }
  })

  assert.deepEqual(await readCarolinaInventory(client, new AbortController().signal), {
    totals: [{ currencyCode: 'MXN', amount: 42 }, { currencyCode: 'USD', amount: 12 }],
    productsWithoutCost: 1,
    warehouses: [
      { ...centro, totals: [{ currencyCode: 'MXN', amount: 26.25 }], productsWithoutCost: 1 },
      { ...norte, totals: [{ currencyCode: 'MXN', amount: 15.75 }, { currencyCode: 'USD', amount: 12 }], productsWithoutCost: 1 },
      { ...sur, totals: [], productsWithoutCost: 0 }
    ]
  })
})
