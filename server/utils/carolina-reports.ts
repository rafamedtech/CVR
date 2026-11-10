import { createClient } from '@supabase/supabase-js'
import { readReportPages } from './report-pagination'
import type { BusinessReportSummary, ConsolidationInfo, ReportPeriod, ReportSalesChannelKey } from '../../app/types/reports'
import { buildBusinessReport } from './business-report'
import { reportPreviousPeriod } from '../../shared/report'

interface CarolinaOrderRow {
  id: string
  date: string
  total: string
  tax: string
  customerId: string
  customer: string
  internal: boolean
  paid: string
  items: Array<{ description: string, type: string, total: number, taxTotal: number, quantity: number }>
}
interface CarolinaExpenseRow {
  date: string
  category: string
  amount: string
  vendor: string
}
interface CarolinaPaymentRow {
  date: string
  method: string
  amount: string
  internal: boolean
}

export function isCarolinaReportsConfigured() {
  return Boolean(process.env.CAROLINA_REPORTS_SUPABASE_URL?.trim()
    && process.env.CAROLINA_REPORTS_SUPABASE_SECRET_KEY?.trim())
}

const methodKeys: Record<string, string> = {
  efectivo: 'CASH', transferencia: 'TRANSFER', tarjeta: 'CARD',
  tarjeta_credito: 'CARD', tarjeta_debito: 'CARD', tarjeta_servicios: 'CARD', cheque: 'CHECK', otro: 'OTHER',
  monedero_electronico: 'Monedero electrónico', dinero_electronico: 'Dinero electrónico',
  vales_despensa: 'Vales de despensa', dacion_pago: 'Dación en pago',
  pago_subrogacion: 'Pago por subrogación', pago_consignacion: 'Pago por consignación',
  condonacion: 'Condonación', compensacion: 'Compensación', novacion: 'Novación',
  confusion: 'Confusión', remision_deuda: 'Remisión de deuda',
  prescripcion_caducidad: 'Prescripción o caducidad', satisfaccion_acreedor: 'A satisfacción del acreedor',
  aplicacion_anticipos: 'Aplicación de anticipos', intermediario_pagos: 'Intermediario pagos'
}

export function buildCarolinaReport(period: ReportPeriod, rows: {
  orders: CarolinaOrderRow[]
  expenses: CarolinaExpenseRow[]
  payments: CarolinaPaymentRow[]
}): { report: BusinessReportSummary, internalOperations: NonNullable<ConsolidationInfo['internalOperations']> } {
  const salesChannel = (order: CarolinaOrderRow): ReportSalesChannelKey => order.internal
    ? 'internal'
    : ['MOSTRADOR', 'MOSTRADOR .'].includes(order.customer.toUpperCase()) ? 'counter' : 'seller'
  const currentOrders = rows.orders.filter(order => order.date >= period.start)
  const orders = currentOrders.map(order => ({
    total: Number(order.total), taxTotal: Number(order.tax), salesChannel: salesChannel(order),
    createdAt: new Date(`${order.date}T12:00:00Z`),
    customerId: order.customerId, customer: { fullName: order.customer },
    workshopId: 'carolina-pinturas', workshop: { name: 'Carolina Pinturas' },
    payments: [{ amountMxn: Number(order.paid) }], items: order.items
  }))
  const expenses = rows.expenses.map(expense => ({
    category: expense.category, amountMxn: Number(expense.amount), vendor: expense.vendor,
    expenseDate: new Date(`${expense.date}T00:00:00Z`)
  }))
  const previousStart = reportPreviousPeriod(period.start, period.mode === 'annual')
  const report = buildBusinessReport({
    start: period.start, end: period.end,
    fullEnd: new Date(Date.parse(period.start) + (period.totalDays - 1) * 86400000).toISOString().slice(0, 10),
    previousDays: Math.round((Date.parse(period.start) - Date.parse(previousStart)) / 86400000),
    annual: period.mode === 'annual', timeZone: 'UTC', beforeTax: true,
    channelKeys: ['counter', 'seller', 'internal'],
    orders,
    previousOrders: rows.orders.filter(order => order.date < period.start).map(order => ({ total: Number(order.total), taxTotal: Number(order.tax), salesChannel: salesChannel(order) })),
    expenses: expenses.filter(expense => expense.expenseDate.toISOString().slice(0, 10) >= period.start),
    previousExpenses: expenses.filter(expense => expense.expenseDate.toISOString().slice(0, 10) < period.start),
    payments: rows.payments.map(payment => ({
      amountMxn: Number(payment.amount), paidAt: new Date(`${payment.date}T12:00:00Z`),
      method: methodKeys[payment.method] ?? payment.method.replaceAll('_', ' ')
    }))
  })
  return {
    report,
    internalOperations: {
      sales: currentOrders.filter(order => order.internal).reduce((sum, order) => sum + Number(order.total) - Number(order.tax), 0),
      previousSales: rows.orders.filter(order => order.internal && order.date < period.start).reduce((sum, order) => sum + Number(order.total) - Number(order.tax), 0),
      orderCount: currentOrders.filter(order => order.internal).length,
      collections: rows.payments.filter(payment => payment.internal).reduce((sum, payment) => sum + Number(payment.amount), 0),
      outstandingBalance: currentOrders.filter(order => order.internal).reduce((sum, order) => sum + Math.max(0, Number(order.total) - Number(order.paid)), 0),
      workshopMaterialPurchases: 0
    }
  }
}

// This adapter performs SELECT requests only. It never signs users in or
// forwards browser cookies, and its key is never returned to the client.
export async function readCarolinaReport(period: ReportPeriod) {
  const supabase = createClient(
    process.env.CAROLINA_REPORTS_SUPABASE_URL!,
    process.env.CAROLINA_REPORTS_SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
  const signal = AbortSignal.timeout(20_000)
  const previousStart = reportPreviousPeriod(period.start, period.mode === 'annual')
  interface OrderRow {
    id: string
    order_date: string
    total: number
    tax_total: number
    customer_id: string
    customer_name_snapshot: string
    customer: { is_internal_order_customer: boolean }
  }
  interface ExpenseRow {
    expense_date: string
    category: string
    amount: number
    exchange_rate: number
    provider_name_snapshot: string
    purchase_payment_id: string | null
  }
  interface PaymentRow {
    payment_date: string
    payment_method: string
    amount: number
    order: { customer: { is_internal_order_customer: boolean } }
  }
  interface ItemRow {
    order_id: string
    product_name_snapshot: string
    total: number
    tax_amount: number
    quantity: number
    product: { account_group_name: string | null }
  }
  const [orders, expenses, payments, items] = await Promise.all([
    readReportPages<OrderRow>((from, to) => supabase.from('sales_orders')
      .select('id,order_date,total,tax_total,customer_id,customer_name_snapshot,customer:siigo_customers!customer_id(is_internal_order_customer)')
      .not('status_key', 'in', '(borrador,cancelado)').gte('order_date', previousStart).lte('order_date', period.end)
      .order('id').range(from, to).abortSignal(signal).overrideTypes<OrderRow[], { merge: false }>()),
    readReportPages<ExpenseRow>((from, to) => supabase.from('expenses')
      .select('id,expense_date,category,amount,exchange_rate,provider_name_snapshot,purchase_payment_id')
      .gte('expense_date', previousStart).lte('expense_date', period.end)
      .order('id').range(from, to).abortSignal(signal).overrideTypes<ExpenseRow[], { merge: false }>()),
    readReportPages<PaymentRow>((from, to) => supabase.from('sales_order_payments')
      .select('id,payment_date,payment_method,amount,order:sales_orders!inner(customer:siigo_customers!customer_id(is_internal_order_customer))')
      .gte('payment_date', period.start).lte('payment_date', period.end)
      .order('id').range(from, to).abortSignal(signal).overrideTypes<PaymentRow[], { merge: false }>()),
    readReportPages<ItemRow>((from, to) => supabase.from('sales_order_items')
      .select('id,order_id,product_name_snapshot,total,tax_amount,quantity,product:siigo_products!product_id(account_group_name),order:sales_orders!inner(order_date,status_key)')
      .gte('order.order_date', period.start).lte('order.order_date', period.end).not('order.status_key', 'in', '(borrador,cancelado)')
      .order('id').range(from, to).abortSignal(signal).overrideTypes<ItemRow[], { merge: false }>())
  ])
  const currentIds = orders.filter(order => order.order_date >= period.start).map(order => order.id)
  const paidByOrder = new Map<string, number>()
  // Fetch balances independently so nested PostgREST row limits cannot truncate
  // payments or items, including payments received after the report period.
  for (let index = 0; index < currentIds.length; index += 100) {
    const chunk = currentIds.slice(index, index + 100)
    const balances = await readReportPages<{ order_id: string, amount: number }>((from, to) => supabase.from('sales_order_payments')
      .select('id,order_id,amount').in('order_id', chunk).order('id').range(from, to).abortSignal(signal)
      .overrideTypes<Array<{ order_id: string, amount: number }>, { merge: false }>())
    for (const payment of balances) paidByOrder.set(payment.order_id, (paidByOrder.get(payment.order_id) ?? 0) + Number(payment.amount))
  }
  const itemsByOrder = new Map<string, CarolinaOrderRow['items']>()
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? []
    list.push({ description: item.product_name_snapshot, type: item.product.account_group_name?.trim() || 'Sin línea', total: Number(item.total), taxTotal: Number(item.tax_amount), quantity: Number(item.quantity) })
    itemsByOrder.set(item.order_id, list)
  }
  return buildCarolinaReport(period, {
    orders: orders.map(order => ({
      id: order.id, date: order.order_date, total: String(order.total), tax: String(order.tax_total),
      customerId: order.customer_id, customer: order.customer_name_snapshot,
      internal: order.customer.is_internal_order_customer, paid: String(paidByOrder.get(order.id) ?? 0), items: itemsByOrder.get(order.id) ?? []
    })),
    expenses: expenses.map(expense => ({
      date: expense.expense_date,
      category: expense.category === 'Compra de materiales' || expense.purchase_payment_id !== null ? 'SUPPLIES' : expense.category,
      amount: String(Number(expense.amount) * Number(expense.exchange_rate)), vendor: expense.provider_name_snapshot
    })),
    payments: payments.map(payment => ({ date: payment.payment_date, method: payment.payment_method, amount: String(payment.amount), internal: payment.order.customer.is_internal_order_customer }))
  })
}
