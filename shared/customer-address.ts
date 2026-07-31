import { z } from 'zod'
import {
  isSiigoMexicoMunicipalityCode,
  isSiigoMexicoStateCode
} from './siigo-mexico-locations'

export const CUSTOMER_COLONY_MAX_LENGTH = 100

const optionalAddressPart = (maxLength: number) => z.string()
  .trim()
  .max(maxLength)
  .optional()
  .default('')

const customerCitySchema = z.object({
  country_code: z.string()
    .trim()
    .length(2, 'El código de país debe tener 2 caracteres.')
    .transform(value => value.toUpperCase()),
  state_code: z.string()
    .trim()
    .refine(
      isSiigoMexicoStateCode,
      'Selecciona un estado válido del catálogo de Siigo México.'
    ),
  city_code: z.string()
    .trim()
    .min(1, 'Selecciona una ciudad o municipio.')
    .max(10, 'El código de ciudad o municipio no puede exceder 10 caracteres.')
}).superRefine((city, context) => {
  if (
    isSiigoMexicoStateCode(city.state_code)
    && city.city_code
    && !isSiigoMexicoMunicipalityCode(city.state_code, city.city_code)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['city_code'],
      message: 'Selecciona una ciudad o municipio válido para el estado.'
    })
  }
})

export const customerAddressSchema = z.object({
  address: z.string()
    .trim()
    .min(1, 'Escribe la calle o dirección del cliente.')
    .max(256, 'La dirección no puede exceder 256 caracteres.'),
  interior_number: optionalAddressPart(20),
  exterior_number: optionalAddressPart(20),
  colony: optionalAddressPart(CUSTOMER_COLONY_MAX_LENGTH),
  locality: optionalAddressPart(20),
  city: customerCitySchema,
  postal_code: z.string()
    .trim()
    .regex(/^[A-Za-z0-9]{0,5}$/, 'El código postal debe ser alfanumérico y tener máximo 5 caracteres.')
    .optional()
    .default('')
})

export type CustomerAddressInput = z.input<typeof customerAddressSchema>
export type CustomerAddressPayload = z.output<typeof customerAddressSchema>

export interface CustomerAddressForm {
  address: string
  interior_number: string
  exterior_number: string
  colony: string
  locality: string
  city: {
    country_code: string
    state_code: string
    city_code: string
  }
  postal_code: string
}

export interface CustomerAddress {
  address: string
  interior_number: string | null
  exterior_number: string | null
  colony: string | null
  locality: string | null
  city: {
    country_code: string
    state_code: string
    city_code: string
  }
  postal_code: string | null
}

export function emptyCustomerAddress(): CustomerAddressForm {
  return {
    address: '',
    interior_number: '',
    exterior_number: '',
    colony: '',
    locality: '',
    city: {
      country_code: 'MX',
      state_code: '',
      city_code: ''
    },
    postal_code: ''
  }
}
