<script setup lang="ts">
import type { FreightStatus } from '~/types/crm'

defineProps<{ status: FreightStatus }>()
</script>

<template>
  <UBadge
    :label="freightStatusLabels[status]"
    :color="freightStatusColors[status]"
    variant="subtle"
  />
</template>
