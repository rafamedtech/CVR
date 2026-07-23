<script setup lang="ts">
const { session, activeWorkshop, isAllWorkshops } = useCrmSession()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-highlighted">
        Información del sistema
      </h1>
      <p class="mt-1 text-sm text-muted">
        Perfil, contexto de trabajo y configuración regional.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UAvatar
              :text="session?.profile.fullName.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()"
            />
            <div>
              <h2 class="font-semibold text-highlighted">
                {{ session?.profile.fullName }}
              </h2>
              <p class="text-sm text-muted">
                {{ session?.profile.email }}
              </p>
            </div>
          </div>
        </template>
        <UBadge
          :label="session?.profile.isSuperAdmin ? 'Administrador general' : 'Usuario de taller'"
          :color="session?.profile.isSuperAdmin ? 'primary' : 'neutral'"
          variant="subtle"
        />
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-highlighted">
            Contexto actual
          </h2>
        </template>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-muted">
              Vista
            </dt>
            <dd class="font-medium text-highlighted">
              {{ isAllWorkshops ? 'Todos los talleres' : activeWorkshop?.name }}
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted">
              Moneda
            </dt>
            <dd class="text-highlighted">
              MXN
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted">
              IVA predeterminado
            </dt>
            <dd class="text-highlighted">
              16%
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted">
              Zona horaria
            </dt>
            <dd class="text-highlighted">
              America/Tijuana
            </dd>
          </div>
        </dl>
      </UCard>
    </div>

    <UAlert
      title="Preparado para crecer"
      description="El modelo permite agregar nuevas sucursales y la futura tienda de pinturas sin mezclar su operación."
      icon="i-lucide-route"
      color="info"
      variant="subtle"
    />
  </div>
</template>
