import type {
  ExpenseCategory,
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

export const taxRateOptions: Array<{ label: string, value: TaxRate }> = [
  { label: 'NO APLICA', value: 0 },
  { label: '8%', value: 8 },
  { label: '16%', value: 16 }
]

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 10)
}

export function formatPhone(value: string | null | undefined) {
  const digits = normalizePhone(value ?? '')
  if (digits.length <= 3) return digits ? `(${digits}${digits.length === 3 ? ')' : ''}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

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
  CANCELLED: 'Cancelada'
}

export const orderStatusColors: Record<OrderStatus, 'neutral' | 'warning' | 'info' | 'primary' | 'secondary' | 'success' | 'error'> = {
  ESTIMATE: 'neutral',
  AWAITING_APPROVAL: 'warning',
  APPROVED: 'info',
  IN_PROGRESS: 'primary',
  QUALITY_CONTROL: 'secondary',
  READY: 'success',
  DELIVERED: 'success',
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

export const workshopRoleLabels: Record<WorkshopRole, string> = {
  MANAGER: 'Gerente',
  ADVISOR: 'Asesor / recepción',
  TECHNICIAN: 'Técnico',
  CASHIER: 'Caja / contabilidad'
}

export const workshopTypeLabels: Record<WorkshopType, string> = {
  BODY_SHOP: 'Carrocería',
  MECHANICAL: 'Mecánica',
  PAINT_STORE: 'Tienda de pinturas'
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(value)
}

export function formatDate(value: string | Date | null, withTime = false) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' as const } : {})
  }).format(new Date(value))
}

export function formatDayMonth(value: string | Date | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short'
  }).format(new Date(value))
}
