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

const options = computed(() => props.customers.map(customer => ({
  label: customer.fullName,
  value: customer.id
})))
const selected = computed(() => {
  const customer = props.selectedCustomer
  return customer ? { label: customer.fullName, value: customer.id } : undefined
})
</script>

<template>
  <CustomerPicker
    v-model="customerId"
    :items="options"
    :selected="selected"
    :disabled="disabled"
  />
</template>
