import type {
  CustomerType,
  ExpenseCategory,
  Currency,
  LineItemType,
  OrderPriority,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  TaxRate,
  WorkshopRole,
  WorkshopType
} from '~/types/crm'
import type { CustomerAddress } from '#shared/customer-address'
import {
  SIIGO_MEXICO_STATES,
  getSiigoMexicoMunicipalities
} from '#shared/siigo-mexico-locations'

export const taxRateValues: readonly TaxRate[] = [0, 8, 16]

export const currencyOptions: Array<{ label: string, value: Currency }> = [
  { label: 'Pesos (MXN)', value: 'MXN' },
  { label: 'Dólares (USD)', value: 'USD' }
]

export const taxRateOptions: Array<{ label: string, value: TaxRate }> = [
  { label: 'NO APLICA', value: 0 },
  { label: '8%', value: 8 },
  { label: '16%', value: 16 }
]

export { formatPhone, normalizePhone } from '@rafamedtech/nuxt-shared/utils'

export function formatCustomerAddress(address: CustomerAddress | null) {
  if (!address) return 'No registrado'

  const street = [
    address.address,
    address.exterior_number ? `Ext. ${address.exterior_number}` : '',
    address.interior_number ? `Int. ${address.interior_number}` : ''
  ].filter(Boolean).join(' · ')
  const area = [address.colony, address.locality].filter(Boolean).join(', ')
  const stateName = SIIGO_MEXICO_STATES.find(state => state.value === address.city.state_code)?.label
    ?? address.city.state_code
  const cityName = getSiigoMexicoMunicipalities(address.city.state_code)
    .find(city => city.value === address.city.city_code)?.label
    ?? address.city.city_code
  const location = [
    cityName,
    stateName,
    address.postal_code ? `C.P. ${address.postal_code}` : '',
    address.city.country_code
  ].filter(Boolean).join(' · ')

  return [street, area, location].filter(Boolean).join('\n')
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  ESTIMATE: 'Cotización',
  AWAITING_APPROVAL: 'Por aprobar',
  APPROVED: 'Aprobada',
  IN_PROGRESS: 'En proceso',
  QUALITY_CONTROL: 'Control de calidad',
  READY: 'Lista para entregar',
  DELIVERED: 'Entregada',
  LIQUIDATED: 'Liquidada',
  CANCELLED: 'Cancelada'
}

export const orderStatusColors: Record<OrderStatus, 'neutral' | 'warning' | 'info' | 'secondary' | 'success' | 'error'> = {
  ESTIMATE: 'neutral',
  AWAITING_APPROVAL: 'warning',
  APPROVED: 'info',
  IN_PROGRESS: 'info',
  QUALITY_CONTROL: 'secondary',
  READY: 'success',
  DELIVERED: 'success',
  LIQUIDATED: 'success',
  CANCELLED: 'error'
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  NO_PAYMENTS: 'Sin pagos',
  PARTIALLY_PAID: 'Abonado',
  PAID: 'Pagado'
}

export const paymentStatusColors: Record<PaymentStatus, 'neutral' | 'warning' | 'success'> = {
  NO_PAYMENTS: 'neutral',
  PARTIALLY_PAID: 'warning',
  PAID: 'success'
}

export const orderPriorityLabels: Record<OrderPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente'
}

export const lineItemTypeLabels: Record<LineItemType, string> = {
  SERVICE: 'Servicio',
  PART: 'Parte',
  LABOR: 'Mano de obra',
  OTHER: 'Otro'
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CREDIT: 'Crédito',
  OTHER: 'Otro'
}

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  RENT: 'Renta',
  PAYROLL: 'Nómina',
  UTILITIES: 'Servicios',
  SUPPLIES: 'Insumos',
  MAINTENANCE: 'Mantenimiento',
  MARKETING: 'Marketing',
  TAXES: 'Impuestos',
  OTHER: 'Otro'
}

export const customerTypeLabels: Record<CustomerType, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Proveedor',
  OTHER: 'Otro'
}

export const workshopRoleLabels: Record<WorkshopRole, string> = {
  MANAGER: 'Gerente',
  ADVISOR: 'Asesor / recepción',
  TECHNICIAN: 'Técnico',
  CASHIER: 'Caja / contabilidad',
  READ_ONLY: 'Sólo lectura'
}

export const workshopTypeLabels: Record<WorkshopType, string> = {
  BODY_SHOP: 'Carrocería',
  MECHANICAL: 'Mecánica',
  PAINT_STORE: 'Tienda de pinturas'
}

export { formatCurrency } from './format/currency'
export { formatWorkshopDate as formatDate, formatWorkshopDayMonth as formatDayMonth } from './datetime'
