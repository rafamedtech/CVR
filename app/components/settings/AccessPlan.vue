<script setup lang="ts">
import type {
  MemberAccessPreset,
  MemberListItem,
  WorkshopSummary
} from '~/types/crm'

const props = defineProps<{
  members: readonly MemberListItem[]
  workshops: readonly WorkshopSummary[]
  currentUserId: string
}>()

const emit = defineEmits<{
  configure: [preset: MemberAccessPreset]
}>()

const presets: MemberAccessPreset[] = [
  {
    key: 'javier-mechanical',
    fullName: 'Javier',
    accessType: 'WORKSHOP',
    workshopSlug: 'mecanica',
    role: 'MANAGER'
  },
  {
    key: 'paulo-body-shop',
    fullName: 'Paulo',
    accessType: 'WORKSHOP',
    workshopSlug: 'carroceria',
    role: 'MANAGER'
  },
  {
    key: 'second-admin',
    fullName: '',
    accessType: 'SUPER_ADMIN'
  }
]

function workshopFor(preset: MemberAccessPreset) {
  return props.workshops.find(workshop => workshop.slug === preset.workshopSlug)
}

function assignedMember(preset: MemberAccessPreset) {
  if (preset.accessType === 'SUPER_ADMIN') {
    return props.members.find(member => (
      member.isSuperAdmin && member.id !== props.currentUserId
    ))
  }

  const workshop = workshopFor(preset)
  const expectedName = preset.fullName.toLocaleLowerCase('es-MX')

  return props.members.find(member => (
    member.fullName.toLocaleLowerCase('es-MX').includes(expectedName)
    && member.memberships.some(membership => (
      membership.workshopId === workshop?.id && membership.role === preset.role
    ))
  ))
}

const accessCards = computed(() => presets.map((preset) => {
  const member = assignedMember(preset)
  const workshop = workshopFor(preset)

  return {
    preset,
    member,
    title: preset.accessType === 'SUPER_ADMIN'
      ? 'Segundo administrador'
      : preset.fullName,
    description: preset.accessType === 'SUPER_ADMIN'
      ? 'Vista global y administración de ambos talleres'
      : `${workshop?.name ?? 'Taller'} · Encargado`
  }
}))
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h2 class="font-semibold text-highlighted">
          Equipo inicial
        </h2>
        <p class="mt-1 text-sm text-muted">
          Vincula las cuentas que ya creaste en Supabase con su acceso en la aplicación.
        </p>
      </div>
    </template>

    <div class="grid gap-3 md:grid-cols-3">
      <div
        v-for="card in accessCards"
        :key="card.preset.key"
        class="flex min-h-40 flex-col rounded-lg border border-default p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex size-10 items-center justify-center rounded-full bg-elevated">
            <UIcon
              :name="card.preset.accessType === 'SUPER_ADMIN' ? 'i-lucide-shield-check' : 'i-lucide-wrench'"
              class="size-5 text-primary"
            />
          </div>
          <UBadge
            :label="card.member ? 'Configurado' : 'Pendiente'"
            :color="card.member ? 'success' : 'warning'"
            variant="subtle"
          />
        </div>

        <div class="mt-4">
          <h3 class="font-medium text-highlighted">
            {{ card.title }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ card.description }}
          </p>
          <p v-if="card.member" class="mt-2 truncate text-xs text-muted">
            {{ card.member.email }}
          </p>
        </div>

        <UButton
          v-if="!card.member"
          class="mt-auto pt-4"
          label="Vincular cuenta"
          color="neutral"
          variant="outline"
          block
          @click="emit('configure', card.preset)"
        />
      </div>
    </div>
  </UCard>
</template>
