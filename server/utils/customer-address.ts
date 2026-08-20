import type { CustomerAddress, CustomerAddressPayload } from '../../shared/customer-address'
import type { CustomerType } from '../../shared/customer-type'

interface StoredCustomerAddress {
  addressLine: string | null
  addressInteriorNumber: string | null
  addressExteriorNumber: string | null
  addressColony: string | null
  addressLocality: string | null
  addressCountryCode: string | null
  addressStateCode: string | null
  addressCityCode: string | null
  addressPostalCode: string | null
}

interface StoredCustomer extends StoredCustomerAddress {
  id: string
  fullName: string
  type: CustomerType
  phone: string
  alternatePhone: string | null
  email: string | null
  taxId: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

const nullable = (value: string) => value || null

export function customerAddressData(address: CustomerAddressPayload): StoredCustomerAddress {
  return {
    addressLine: address.address,
    addressInteriorNumber: nullable(address.interior_number),
    addressExteriorNumber: nullable(address.exterior_number),
    addressColony: nullable(address.colony),
    addressLocality: nullable(address.locality),
    addressCountryCode: address.city.country_code,
    addressStateCode: address.city.state_code,
    addressCityCode: address.city.city_code,
    addressPostalCode: nullable(address.postal_code)
  }
}

export function serializeCustomerAddress(customer: StoredCustomerAddress): CustomerAddress | null {
  if (!customer.addressLine) return null

  // Siigo México's current create/update contract and examples use address.address.
  // Its read documentation also shows address.street; this app preserves the mutation
  // shape verified on 2026-07-30 so stored clients can be sent deterministically later.
  return {
    address: customer.addressLine,
    interior_number: customer.addressInteriorNumber,
    exterior_number: customer.addressExteriorNumber,
    colony: customer.addressColony,
    locality: customer.addressLocality,
    city: {
      country_code: customer.addressCountryCode ?? '',
      state_code: customer.addressStateCode ?? '',
      city_code: customer.addressCityCode ?? ''
    },
    postal_code: customer.addressPostalCode
  }
}

export function serializeCustomer(customer: StoredCustomer) {
  return {
    id: customer.id,
    fullName: customer.fullName,
    type: customer.type,
    phone: customer.phone,
    alternatePhone: customer.alternatePhone,
    email: customer.email,
    taxId: customer.taxId,
    address: serializeCustomerAddress(customer),
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  }
}
