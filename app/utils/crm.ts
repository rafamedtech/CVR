import type {
  ExpenseCategory,
  LineItemType,
  OrderPriority,
  OrderStatus,
  PaymentMethod,
  WorkshopRole,
  WorkshopType
} from '~/types/crm'

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
