import { Decimal } from '@prisma/client/runtime/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CarolinaInventoryValuation } from '../../app/types/reports'
import { readReportPages } from './report-pagination'

interface WarehouseRow { id: string, code: string, name: string }
interface BalanceRow {
  warehouse_id: string
  product_id: string
  quantity: number | string
  product: { unit_cost: number | string | null, cost_currency: string | null }
}

export function buildCarolinaInventory(warehouses: WarehouseRow[], balances: BalanceRow[]): CarolinaInventoryValuation {
  const inventoryTotals = new Map<string, Decimal>()
  const missingProducts = new Set<string>()
  const byWarehouse = new Map<string, BalanceRow[]>()
  for (const balance of balances) {
    if (!new Decimal(balance.quantity).greaterThan(0)) continue
    const rows = byWarehouse.get(balance.warehouse_id) ?? []
    rows.push(balance)
    byWarehouse.set(balance.warehouse_id, rows)
  }
  const serialize = (totals: Map<string, Decimal>) => [...totals].sort(([a], [b]) => a.localeCompare(b))
    .map(([currencyCode, amount]) => ({ currencyCode, amount: amount.toNumber() }))
  const locations = [...warehouses].sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true })).map((warehouse) => {
    const totals = new Map<string, Decimal>()
    let productsWithoutCost = 0
    for (const balance of byWarehouse.get(warehouse.id) ?? []) {
      const { unit_cost: cost, cost_currency: currency } = balance.product
      if (cost === null || !currency) {
        missingProducts.add(balance.product_id)
        productsWithoutCost++
        continue
      }
      const amount = new Decimal(balance.quantity).times(cost)
      totals.set(currency, (totals.get(currency) ?? new Decimal(0)).plus(amount))
      inventoryTotals.set(currency, (inventoryTotals.get(currency) ?? new Decimal(0)).plus(amount))
    }
    return { ...warehouse, totals: serialize(totals), productsWithoutCost }
  })
  return { totals: serialize(inventoryTotals), productsWithoutCost: missingProducts.size, warehouses: locations }
}

export async function readCarolinaInventory(client: SupabaseClient, signal: AbortSignal) {
  const [warehouses, balances] = await Promise.all([
    readReportPages<WarehouseRow>((from, to) => client.from('inventory_warehouses')
      .select('id,code,name').order('id').range(from, to).abortSignal(signal)
      .overrideTypes<WarehouseRow[], { merge: false }>()),
    // Page balances separately to avoid truncating nested warehouse relationships.
    // Physical quantity includes reservations, just as in siigo-pinturas.
    readReportPages<BalanceRow>((from, to) => client.from('inventory_balances')
      .select('warehouse_id,product_id,quantity,product:siigo_products!product_id(unit_cost,cost_currency)')
      .gt('quantity', 0).order('warehouse_id').order('product_id').range(from, to).abortSignal(signal)
      .overrideTypes<BalanceRow[], { merge: false }>())
  ])
  return buildCarolinaInventory(warehouses, balances)
}
