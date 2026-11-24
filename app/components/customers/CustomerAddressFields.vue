<script setup lang="ts">
import {
  CUSTOMER_COLONY_MAX_LENGTH,
  type CustomerAddressForm
} from '#shared/customer-address'

const address = defineModel<CustomerAddressForm>({ required: true })
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

    <SiigoMexicoLocationFields
      v-model:state-code="address.city.state_code"
      v-model:municipality-code="address.city.city_code"
      state-name="address.city.state_code"
      municipality-name="address.city.city_code"
      virtualize-municipalities
    />

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
