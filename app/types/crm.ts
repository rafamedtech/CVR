export type WorkshopType = 'BODY_SHOP' | 'MECHANICAL' | 'PAINT_STORE'
export type WorkshopRole = 'MANAGER' | 'ADVISOR' | 'TECHNICIAN' | 'CASHIER'
export type TaxRate = 0 | 8 | 16
export type OrderStatus = 'ESTIMATE' | 'AWAITING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'QUALITY_CONTROL' | 'READY' | 'DELIVERED' | 'CANCELLED'
export type OrderPriority = 'NORMAL' | 'HIGH' | 'URGENT'
export type LineItemType = 'SERVICE' | 'PART' | 'LABOR' | 'OTHER'
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'CREDIT' | 'OTHER'
export type ExpenseCategory = 'RENT' | 'PAYROLL' | 'UTILITIES' | 'SUPPLIES' | 'MAINTENANCE' | 'MARKETING' | 'TAXES' | 'OTHER'

export interface WorkshopSummary {
  id: string
  slug: string
  name: string
  type: WorkshopType
  taxRate: TaxRate
  role?: WorkshopRole
}

export interface CrmSession {
  profile: {
    id: string
    email: string
    fullName: string
    isSuperAdmin: boolean
  }
  workshops: WorkshopSummary[]
  selectedWorkshopId: string | null
  selectedWorkshop: WorkshopSummary | null
  canViewAll: boolean
}

export interface CustomerListItem {
  id: string
  workshopId: string
  workshopName: string
  fullName: string
  phone: string
  alternatePhone: string | null
  email: string | null
  taxId: string | null
  address: string | null
  notes: string | null
  vehiclesCount: number
  ordersCount: number
  createdAt: string
}

export interface VehicleListItem {
  id: string
  workshopId: string
  workshopName: string
  customerId: string
  customerName: string
  licensePlate: string
  vin: string | null
  make: string
  model: string
  year: number
  color: string | null
  mileage: number | null
  fuelLevel: number | null
  notes: string | null
}

export interface OrderLineItem {
  id: string
  type: LineItemType
  description: string
  quantity: number
  unitCost: number
  unitPrice: number
  discount: number
  taxRate: number
  subtotal: number
  taxTotal: number
  total: number
  totalCost: number
}

export interface OrderItemDraft {
  type: LineItemType
  description: string
  quantity: number
  unitCost: number
  unitPrice: number
  discount: number
  taxRate: TaxRate
}

export interface OrderPayment {
  id: string
  amount: number
  method: PaymentMethod
  reference: string | null
  notes: string | null
  paidAt: string
  recordedByName: string
}

export interface OrderListItem {
  id: string
  workshopId: string
  workshopName: string
  orderNumber: string
  status: OrderStatus
  priority: OrderPriority
  customerName: string
  customerPhone: string
  vehicleLabel: string
  licensePlate: string
  assignedToName: string | null
  total: number
  paid: number
  balance: number
  promisedAt: string | null
  createdAt: string
}

export interface OrderDetail extends OrderListItem {
  customerId: string
  vehicleId: string
  complaint: string
  diagnosis: string | null
  intakeNotes: string | null
  internalNotes: string | null
  mileageIn: number | null
  fuelLevelIn: number | null
  approvedAt: string | null
  startedAt: string | null
  completedAt: string | null
  deliveredAt: string | null
  subtotal: number
  discountTotal: number
  taxTotal: number
  workshopTaxRate: TaxRate
  items: OrderLineItem[]
  payments: OrderPayment[]
}

export interface ExpenseListItem {
  id: string
  workshopId: string
  workshopName: string
  category: ExpenseCategory
  description: string
  vendor: string | null
  amount: number
  expenseDate: string
  notes: string | null
  recordedByName: string
}

export interface MemberListItem {
  id: string
  fullName: string
  email: string
  phone: string | null
  active: boolean
  isSuperAdmin: boolean
  memberships: Array<{
    workshopId: string
    workshopName: string
    role: WorkshopRole
  }>
}

export interface DashboardData {
  canViewFinancials: boolean
  period: {
    from: string
    to: string
  }
  kpis: {
    sales: number
    collected: number
    costs: number
    grossProfit: number
    expenses: number
    netProfit: number
    receivable: number
    openOrders: number
    completedOrders: number
    averageTicket: number
    averageDays: number
  }
  statusCounts: Array<{ status: OrderStatus, count: number }>
  workshops: Array<{
    id: string
    name: string
    sales: number
    collected: number
    expenses: number
    openOrders: number
  }>
  recentOrders: OrderListItem[]
}
