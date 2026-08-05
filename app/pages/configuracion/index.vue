<script setup lang="ts">
import type { TaxRate } from '~/types/crm'
import { taxRateOptions } from '~/utils/crm'

useHead({ title: 'Configuración' })

const responsiveControlSize = useResponsiveControlSize()
const {
  session,
  activeWorkshop,
  currentRole,
  isAllWorkshops,
  isSuperAdmin,
  setSession
} = useCrmSession()
const toast = useToast()
const saving = shallowRef(false)
const taxRate = shallowRef<TaxRate>(16)

const canEditTaxRate = computed(() => (
  isSuperAdmin.value || currentRole.value === 'MANAGER'
))

watch(() => activeWorkshop.value?.taxRate, (value) => {
  taxRate.value = value ?? 16
}, { immediate: true })

async function saveTaxRate() {
  if (!activeWorkshop.value || !canEditTaxRate.value) return

  saving.value = true
  try {
    await $fetch<{ taxRate: TaxRate }>('/api/settings', {
      method: 'PATCH',
      body: { taxRate: taxRate.value }
    })

    const currentSession = session.value
    if (currentSession) {
      setSession({
        ...currentSession,
        workshops: currentSession.workshops.map(workshop => workshop.id === activeWorkshop.value?.id
          ? { ...workshop, taxRate: taxRate.value }
          : workshop),
        selectedWorkshop: currentSession.selectedWorkshop
          ? { ...currentSession.selectedWorkshop, taxRate: taxRate.value }
          : null
      })
    }
    toast.add({ title: 'Configuración guardada', color: 'success', icon: 'i-lucide-check' })
  } catch (error) {
    toast.add({ title: 'No se pudo guardar el IVA', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}
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
          <div class="flex items-center justify-between gap-4">
            <dt class="text-muted">
              IVA predeterminado
            </dt>
            <dd class="flex items-center gap-2">
              <USelect
                v-if="activeWorkshop"
                v-model="taxRate"
                :items="taxRateOptions"
                value-key="value"
                :size="responsiveControlSize"
                class="w-32"
                :disabled="!canEditTaxRate || saving"
              />
              <span v-else class="text-highlighted">
                —
              </span>
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
        <UAlert
          v-if="isAllWorkshops"
          class="mt-4"
          title="Selecciona un taller"
          description="El IVA predeterminado se configura por taller."
          icon="i-lucide-info"
          color="info"
          variant="subtle"
        />
        <div v-else class="mt-5 flex items-center justify-between gap-4 border-t border-default pt-4">
          <p class="text-xs text-muted">
            Se aplicará a los nuevos conceptos de órdenes.
          </p>
          <UButton
            label="Guardar IVA"
            icon="i-lucide-save"
            :loading="saving"
            :disabled="!canEditTaxRate"
            @click="saveTaxRate"
          />
        </div>
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
