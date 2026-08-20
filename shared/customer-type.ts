import { z } from 'zod'

export const customerTypes = ['CUSTOMER', 'SUPPLIER', 'OTHER'] as const

export type CustomerType = typeof customerTypes[number]

// Siigo México's customers contract expects `type` as "Customer" | "Supplier" | "Other".
export type SiigoCustomerType = 'Customer' | 'Supplier' | 'Other'

const siigoByCustomerType: Record<CustomerType, SiigoCustomerType> = {
  CUSTOMER: 'Customer',
  SUPPLIER: 'Supplier',
  OTHER: 'Other'
}

const customerTypeBySiigo: Record<SiigoCustomerType, CustomerType> = {
  Customer: 'CUSTOMER',
  Supplier: 'SUPPLIER',
  Other: 'OTHER'
}

export const customerTypeSchema = z.enum(customerTypes)

export function toSiigoCustomerType(type: CustomerType): SiigoCustomerType {
  return siigoByCustomerType[type]
}

export function fromSiigoCustomerType(value: string): CustomerType {
  return customerTypeBySiigo[value as SiigoCustomerType] ?? 'CUSTOMER'
}
