import { calculateInventoryValuation } from '@rafamedtech/nuxt-shared/utils'
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
  const orderedWarehouses = [...warehouses].sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }))
  return calculateInventoryValuation(orderedWarehouses, balances.map(balance => ({
    warehouseId: balance.warehouse_id,
    productId: balance.product_id,
    quantity: balance.quantity,
    unitCost: balance.product.unit_cost,
    costCurrency: balance.product.cost_currency
  })))
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
