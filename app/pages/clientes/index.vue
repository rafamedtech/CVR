<script setup lang="ts">
import type { CustomerListItem } from '~/types/crm'
import { formatPhone } from '~/utils/crm'

useHead({ title: 'Clientes' })

const search = shallowRef('')
const createOpen = shallowRef(false)
const editOpen = shallowRef(false)
const selectedCustomer = shallowRef<CustomerListItem | null>(null)
const { canManageCustomers, isAllWorkshops } = useCrmSession()
const { data: customers, status, refresh } = await useFetch<CustomerListItem[]>('/api/customers', {
  default: () => [],
  key: 'crm-customers'
})

const filteredCustomers = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es-MX')
  if (!term) return customers.value

  return customers.value.filter(customer => [
    customer.fullName,
    customer.phone,
    formatPhone(customer.phone),
    customer.email,
    customer.taxId
  ].some(value => value?.toLocaleLowerCase('es-MX').includes(term)))
})

async function handleCreated() {
  await refresh()
}

function handleEdit(customer: CustomerListItem) {
  selectedCustomer.value = customer
  editOpen.value = true
}

async function handleUpdated() {
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="customers">
    <template #header>
      <UDashboardNavbar title="Clientes">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UTooltip :text="isAllWorkshops ? 'Selecciona una ubicación para poder usar este botón.' : undefined">
            <span class="inline-flex">
              <UButton
                label="Nuevo cliente"
                icon="i-lucide-user-plus"
                :disabled="!canManageCustomers"
                @click="createOpen = true"
              />
            </span>
          </UTooltip>
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar por nombre, teléfono, correo o RFC…"
            class="w-full sm:w-96"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="isAllWorkshops"
        class="mb-4"
        title="Vista consolidada"
        description="Puedes consultar todos los clientes. Selecciona un taller para registrar uno nuevo."
        icon="i-lucide-info"
        color="info"
        variant="subtle"
      />

      <CustomersTable
        :customers="filteredCustomers"
        :loading="status === 'pending'"
        :show-workshop="isAllWorkshops"
        :can-edit="canManageCustomers"
        @edit="handleEdit"
      />

      <CustomersCustomerFormModal
        v-model:open="createOpen"
        @created="handleCreated"
      />
      <CustomersCustomerEditModal
        v-model:open="editOpen"
        :customer="selectedCustomer"
        @updated="handleUpdated"
      />
    </template>
  </UDashboardPanel>
</template>
