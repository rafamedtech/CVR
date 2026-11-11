<script setup lang="ts">
import type { WorkshopSummary } from '~/types/crm'

defineProps<{
  workshops: readonly WorkshopSummary[]
  pendingId: string | null
  error: string
}>()

defineEmits<{
  select: [workshopId: string]
  signOut: []
}>()
</script>

<template>
  <UModal
    :open="true"
    :close="false"
    :dismissible="false"
    title="Elige una vista para iniciar"
    description="Selecciona el taller con el que quieres trabajar hoy."
    :ui="{ content: 'max-w-xl', header: 'pt-6 sm:pt-8', body: 'space-y-4', footer: 'justify-between' }"
  >
    <template #body>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="workshop in workshops"
          :key="workshop.id"
          type="button"
          :disabled="pendingId !== null"
          :aria-busy="pendingId === workshop.id"
          class="group flex flex-col items-start rounded-xl border border-default bg-default p-5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          @click="$emit('select', workshop.id)"
        >
          <span class="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon
              :name="pendingId === workshop.id ? 'i-lucide-loader-circle' : workshop.type === 'BODY_SHOP' ? 'i-lucide-paintbrush' : 'i-lucide-wrench'"
              class="size-6"
              :class="{ 'animate-spin': pendingId === workshop.id }"
            />
          </span>
          <span class="font-semibold text-highlighted">{{ workshop.name }}</span>
          <span class="mt-1 text-sm text-muted">
            {{ workshop.type === 'BODY_SHOP' ? 'Carrocería y pintura' : 'Servicio y reparación mecánica' }}
          </span>
          <span class="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
            {{ pendingId === workshop.id ? 'Abriendo taller…' : 'Entrar al taller' }}
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </span>
        </button>
      </div>
      <UAlert
        v-if="!workshops.length"
        title="No tienes talleres disponibles"
        description="Solicita al administrador que revise tus accesos."
        icon="i-lucide-building-2"
        color="warning"
        variant="subtle"
      />
      <UAlert
        v-if="error"
        :description="error"
        title="No se pudo abrir el taller"
        color="error"
        variant="subtle"
      />
    </template>
    <template #footer>
      <p class="max-w-64 text-xs text-muted">
        Puedes cambiar de taller desde el selector de la aplicación.
      </p>
      <UButton
        label="Cerrar sesión"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="pendingId !== null"
        @click="$emit('signOut')"
      />
    </template>
  </UModal>
</template>
