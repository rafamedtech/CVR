import assert from 'node:assert/strict'
import test from 'node:test'
import {
  customerAddressSchema,
  emptyCustomerAddress
} from '../shared/customer-address'
import {
  SIIGO_MEXICO_STATES,
  getSiigoMexicoMunicipalities,
  isSiigoMexicoMunicipalityCode,
  isSiigoMexicoStateCode
} from '../shared/siigo-mexico-locations'
import { customerAddressData, serializeCustomer, serializeCustomerAddress } from '../server/utils/customer-address'

test('normaliza el domicilio con la forma de mutación de Siigo México', () => {
  const address = customerAddressSchema.parse({
    address: '  Av. Principal 123  ',
    interior_number: '',
    exterior_number: '123',
    colony: 'Centro',
    locality: 'Tijuana',
    city: {
      country_code: 'mx',
      state_code: '02',
      city_code: '02004'
    },
    postal_code: '22000'
  })

  assert.deepEqual(address, {
    address: 'Av. Principal 123',
    interior_number: '',
    exterior_number: '123',
    colony: 'Centro',
    locality: 'Tijuana',
    city: {
      country_code: 'MX',
      state_code: '02',
      city_code: '02004'
    },
    postal_code: '22000'
  })
})

test('inicializa el código de país como MX sin bloquear su edición', () => {
  const address = emptyCustomerAddress()

  assert.equal(address.city.country_code, 'MX')
  address.city.country_code = 'US'
  assert.equal(address.city.country_code, 'US')
})

test('acepta los campos opcionales omitidos y los persiste como null', () => {
  const address = customerAddressSchema.parse({
    address: 'Av. Principal 123',
    city: {
      country_code: 'MX',
      state_code: '02',
      city_code: '02004'
    }
  })

  assert.deepEqual(customerAddressData(address), {
    addressLine: 'Av. Principal 123',
    addressInteriorNumber: null,
    addressExteriorNumber: null,
    addressColony: null,
    addressLocality: null,
    addressCountryCode: 'MX',
    addressStateCode: '02',
    addressCityCode: '02004',
    addressPostalCode: null
  })
})

test('rechaza códigos geográficos requeridos o códigos postales inválidos', () => {
  const result = customerAddressSchema.safeParse({
    address: 'Av. Principal 123',
    city: {
      country_code: 'MX',
      state_code: '',
      city_code: ''
    },
    postal_code: '22000-1234'
  })

  assert.equal(result.success, false)
})

test('expone los 32 estados con códigos únicos compatibles con Siigo México', () => {
  assert.equal(SIIGO_MEXICO_STATES.length, 32)
  assert.equal(new Set(SIIGO_MEXICO_STATES.map(state => state.value)).size, 32)
  assert.deepEqual(
    SIIGO_MEXICO_STATES.find(state => state.label === 'Ciudad de México'),
    { label: 'Ciudad de México', value: '09' }
  )
  assert.equal(isSiigoMexicoStateCode('02'), true)
  assert.equal(isSiigoMexicoStateCode('2'), false)
  assert.equal(isSiigoMexicoStateCode('99'), false)
})

test('expone los municipios del estado seleccionado con códigos Siigo únicos', () => {
  const bajaCaliforniaMunicipalities = getSiigoMexicoMunicipalities('02')
  const allMunicipalities = SIIGO_MEXICO_STATES.flatMap(state =>
    getSiigoMexicoMunicipalities(state.value)
  )

  assert.deepEqual(
    bajaCaliforniaMunicipalities.find(municipality => municipality.label === 'Tijuana'),
    { label: 'Tijuana', value: '02004' }
  )
  assert.equal(allMunicipalities.length, 2461)
  assert.equal(new Set(allMunicipalities.map(municipality => municipality.value)).size, 2461)
  assert.equal(
    new Set(bajaCaliforniaMunicipalities.map(municipality => municipality.value)).size,
    bajaCaliforniaMunicipalities.length
  )
  assert.equal(getSiigoMexicoMunicipalities('').length, 0)
  assert.equal(isSiigoMexicoMunicipalityCode('02', '02004'), true)
  assert.equal(isSiigoMexicoMunicipalityCode('03', '02004'), false)
})

test('rechaza un código de estado ajeno al catálogo de Siigo México', () => {
  const result = customerAddressSchema.safeParse({
    address: 'Av. Principal 123',
    city: {
      country_code: 'MX',
      state_code: '99',
      city_code: '02004'
    }
  })

  assert.equal(result.success, false)
})

test('rechaza un municipio que no pertenece al estado seleccionado', () => {
  const result = customerAddressSchema.safeParse({
    address: 'Av. Principal 123',
    city: {
      country_code: 'MX',
      state_code: '03',
      city_code: '02004'
    }
  })

  assert.equal(result.success, false)
})

test('acepta nombres de colonia mayores a 20 caracteres', () => {
  const colony = 'Fraccionamiento Hacienda de las Fuentes Residencial'
  const address = customerAddressSchema.parse({
    address: 'Av. Principal 123',
    colony,
    city: {
      country_code: 'MX',
      state_code: '02',
      city_code: '02004'
    }
  })

  assert.equal(address.colony, colony)
})

test('normaliza un domicilio persistido al mismo objeto usado para mutaciones', () => {
  const address = serializeCustomerAddress({
    addressLine: 'Av. Principal 123',
    addressInteriorNumber: 'A',
    addressExteriorNumber: '123',
    addressColony: 'Centro',
    addressLocality: 'Tijuana',
    addressCountryCode: 'MX',
    addressStateCode: '02',
    addressCityCode: '02004',
    addressPostalCode: '22000'
  })

  assert.deepEqual(address, {
    address: 'Av. Principal 123',
    interior_number: 'A',
    exterior_number: '123',
    colony: 'Centro',
    locality: 'Tijuana',
    city: {
      country_code: 'MX',
      state_code: '02',
      city_code: '02004'
    },
    postal_code: '22000'
  })
})

test('la respuesta de mutación expone el domicilio anidado y oculta sus columnas internas', () => {
  const customer = serializeCustomer({
    id: '6b6ceb28-b2eb-4b98-b3dd-26648a933c81',
    fullName: 'Cliente de prueba',
    phone: '6641234567',
    alternatePhone: null,
    email: null,
    taxId: null,
    addressLine: 'Av. Principal 123',
    addressInteriorNumber: null,
    addressExteriorNumber: '123',
    addressColony: null,
    addressLocality: 'Tijuana',
    addressCountryCode: 'MX',
    addressStateCode: '02',
    addressCityCode: '02004',
    addressPostalCode: '22000',
    notes: null,
    createdAt: new Date('2026-07-30T00:00:00.000Z'),
    updatedAt: new Date('2026-07-30T00:00:00.000Z')
  })

  assert.equal('addressLine' in customer, false)
  assert.deepEqual(customer.address?.city, {
    country_code: 'MX',
    state_code: '02',
    city_code: '02004'
  })
})
