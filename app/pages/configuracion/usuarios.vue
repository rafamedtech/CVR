<script setup lang="ts">
import type { MemberAccessPreset, MemberListItem } from '~/types/crm'

useHead({ title: 'Usuarios' })

const search = shallowRef('')
const createOpen = shallowRef(false)
const activePreset = shallowRef<MemberAccessPreset | null>(null)
const { session, isAllWorkshops } = useCrmSession()
const { data: members, status, refresh } = await useFetch<MemberListItem[]>('/api/members', {
  default: () => [],
  key: 'crm-members'
})

const filteredMembers = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es-MX')
  if (!term) return members.value
  return members.value.filter(member => (
    member.fullName.toLocaleLowerCase('es-MX').includes(term)
    || member.email.toLocaleLowerCase('es-MX').includes(term)
  ))
})

function openMemberForm(preset: MemberAccessPreset | null = null) {
  activePreset.value = preset
  createOpen.value = true
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-highlighted">
          Usuarios y permisos
        </h1>
        <p class="mt-1 text-sm text-muted">
          Vincula cuentas existentes de Supabase y asigna sus permisos.
        </p>
      </div>
      <UButton label="Vincular usuario" icon="i-lucide-user-plus" @click="openMemberForm()" />
    </div>

    <SettingsAccessPlan
      v-if="session?.profile.isSuperAdmin"
      :members="members"
      :workshops="session.workshops"
      :current-user-id="session.profile.id"
      @configure="openMemberForm"
    />

    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Buscar usuario…"
      class="w-full sm:max-w-sm"
    />

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div v-if="status === 'pending'" class="space-y-3 p-5">
        <USkeleton v-for="index in 3" :key="index" class="h-14" />
      </div>
      <ul v-else-if="filteredMembers.length" role="list" class="divide-y divide-default">
        <li v-for="member in filteredMembers" :key="member.id" class="flex flex-wrap items-center justify-between gap-4 p-4">
          <div class="flex min-w-0 items-center gap-3">
            <UAvatar :text="member.fullName.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()" />
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">
                {{ member.fullName }}
              </p>
              <p class="truncate text-sm text-muted">
                {{ member.email }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <UBadge
              v-if="member.isSuperAdmin"
              label="Administrador general"
              color="primary"
              variant="subtle"
            />
            <UBadge
              v-for="membership in member.memberships"
              :key="membership.workshopId"
              :label="`${membership.workshopName} · ${workshopRoleLabels[membership.role]}`"
              color="neutral"
              variant="subtle"
            />
          </div>
        </li>
      </ul>
      <div v-else class="py-12 text-center text-sm text-muted">
        No se encontraron usuarios.
      </div>
    </UCard>

    <SettingsMemberFormModal
      v-model:open="createOpen"
      :workshops="session?.workshops ?? []"
      :selected-workshop-id="session?.selectedWorkshopId ?? null"
      :allow-workshop-selection="isAllWorkshops || Boolean(session?.profile.isSuperAdmin)"
      :allow-super-admin="Boolean(session?.profile.isSuperAdmin)"
      :preset="activePreset"
      @created="refresh"
    />
  </div>
</template>
