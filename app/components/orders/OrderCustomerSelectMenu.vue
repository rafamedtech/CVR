<script setup lang="ts">
import type { CustomerListItem } from '~/types/crm'

interface SelectedCustomer {
  id: string
  fullName: string
}

const props = withDefaults(defineProps<{
  customers?: CustomerListItem[]
  selectedCustomer?: SelectedCustomer | null
  disabled?: boolean
}>(), {
  customers: () => [],
  selectedCustomer: null,
  disabled: false
})
const customerId = defineModel<string>({ required: true })

const options = computed(() => {
  const customerOptions = props.customers.map(customer => ({
    label: customer.fullName,
    value: customer.id
  }))

  if (props.selectedCustomer && !customerOptions.some(option => option.value === props.selectedCustomer?.id)) {
    customerOptions.unshift({
      label: props.selectedCustomer.fullName,
      value: props.selectedCustomer.id
    })
  }

  return customerOptions
})
</script>

<template>
  <USelectMenu
    v-model="customerId"
    :items="options"
    value-key="value"
    searchable
    placeholder="Selecciona un cliente"
    class="w-full"
    :disabled="disabled"
  />
</template>
