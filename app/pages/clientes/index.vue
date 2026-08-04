<script setup lang="ts">
import type { CustomerListItem } from '~/types/crm'
import { formatPhone } from '~/utils/crm'

useHead({ title: 'Clientes' })

const search = shallowRef('')
const createOpen = shallowRef(false)
const editOpen = shallowRef(false)
const assignmentsOpen = shallowRef(false)
const selectedCustomer = shallowRef<CustomerListItem | null>(null)
const { session, canManageCustomers, isAllWorkshops, isSuperAdmin } = useCrmSession()
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
const canEditCustomers = computed(() => canManageCustomers.value || isSuperAdmin.value)

async function handleCreated() {
  await refresh()
}

function handleEdit(customer: CustomerListItem) {
  selectedCustomer.value = customer
  editOpen.value = true
}

function handleAssignWorkshops(customer: CustomerListItem) {
  selectedCustomer.value = customer
  assignmentsOpen.value = true
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

      <UDashboardToolbar :ui="{ left: 'w-full sm:w-auto' }">
        <template #left>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            size="lg"
            placeholder="Buscar por nombre, teléfono, correo o RFC…"
            class="w-full sm:w-96"
            :ui="{
              base: 'sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:ps-9',
              leading: 'sm:ps-2.5'
            }"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <CustomersTable
        :customers="filteredCustomers"
        :loading="status === 'pending'"
        :can-edit="canEditCustomers"
        :can-assign-workshops="isSuperAdmin"
        @edit="handleEdit"
        @assign-workshops="handleAssignWorkshops"
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
      <CustomersCustomerWorkshopsModal
        v-model:open="assignmentsOpen"
        :customer="selectedCustomer"
        :workshops="session?.workshops ?? []"
        @updated="handleUpdated"
      />
    </template>
  </UDashboardPanel>
</template>
