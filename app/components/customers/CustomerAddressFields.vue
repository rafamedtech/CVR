<script setup lang="ts">
import {
  CUSTOMER_COLONY_MAX_LENGTH,
  type CustomerAddressForm
} from '#shared/customer-address'
import {
  SIIGO_MEXICO_STATES,
  getSiigoMexicoMunicipalities,
  isSiigoMexicoMunicipalityCode,
  isSiigoMexicoStateCode
} from '#shared/siigo-mexico-locations'

const responsiveControlSize = useResponsiveControlSize()
const address = defineModel<CustomerAddressForm>({ required: true })

const municipalityOptions = computed(() =>
  getSiigoMexicoMunicipalities(address.value.city.state_code)
)
const isMunicipalityDisabled = computed(() =>
  !isSiigoMexicoStateCode(address.value.city.state_code)
)
const municipalityPlaceholder = computed(() =>
  isMunicipalityDisabled.value
    ? 'Selecciona primero un estado'
    : 'Selecciona una ciudad o municipio'
)

watch(
  () => address.value.city.state_code,
  (stateCode) => {
    const cityCode = address.value.city.city_code
    if (cityCode && !isSiigoMexicoMunicipalityCode(stateCode, cityCode)) {
      address.value.city.city_code = ''
    }
  }
)
</script>

<template>
  <div class="contents">
    <div class="sm:col-span-2">
      <h3 class="text-base font-semibold text-highlighted">
        Domicilio fiscal
      </h3>
    </div>

    <UFormField
      name="address.address"
      label="Calle o dirección"
      required
      class="sm:col-span-2"
    >
      <UInput
        v-model="address.address"
        class="w-full"
        maxlength="256"
        autocomplete="street-address"
      />
    </UFormField>

    <UFormField name="address.exterior_number" label="Número exterior">
      <UInput
        v-model="address.exterior_number"
        class="w-full"
        maxlength="20"
      />
    </UFormField>

    <UFormField name="address.interior_number" label="Número interior">
      <UInput
        v-model="address.interior_number"
        class="w-full"
        maxlength="20"
      />
    </UFormField>

    <UFormField name="address.colony" label="Colonia">
      <UInput
        v-model="address.colony"
        class="w-full"
        :maxlength="CUSTOMER_COLONY_MAX_LENGTH"
        autocomplete="address-level3"
      />
    </UFormField>

    <UFormField name="address.locality" label="Localidad">
      <UInput
        v-model="address.locality"
        class="w-full"
        maxlength="20"
        autocomplete="address-level2"
      />
    </UFormField>

    <UFormField
      name="address.city.country_code"
      label="Código de país"
      required
    >
      <UInput
        v-model="address.city.country_code"
        class="w-full uppercase"
        maxlength="2"
        autocomplete="country"
      />
    </UFormField>

    <UFormField
      name="address.city.state_code"
      label="Estado"
      required
    >
      <USelectMenu
        v-model="address.city.state_code"
        :items="SIIGO_MEXICO_STATES"
        value-key="value"
        label-key="label"
        :filter-fields="['label', 'value']"
        :search-input="{ placeholder: 'Buscar estado o código…' }"
        placeholder="Selecciona un estado"
        :size="responsiveControlSize"
        class="w-full"
      />
    </UFormField>

    <UFormField
      name="address.city.city_code"
      label="Ciudad o municipio"
      required
    >
      <USelectMenu
        v-model="address.city.city_code"
        :items="municipalityOptions"
        value-key="value"
        label-key="label"
        :filter-fields="['label']"
        :search-input="{ placeholder: 'Buscar ciudad o municipio…' }"
        :placeholder="municipalityPlaceholder"
        :disabled="isMunicipalityDisabled"
        virtualize
        :size="responsiveControlSize"
        class="w-full"
      />
    </UFormField>

    <UFormField name="address.postal_code" label="Código postal">
      <UInput
        v-model="address.postal_code"
        class="w-full"
        maxlength="5"
        autocomplete="postal-code"
        inputmode="numeric"
      />
    </UFormField>
  </div>
</template>
