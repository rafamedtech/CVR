<script setup lang="ts">
defineProps<{ title: string, description?: string, labels?: string[] }>()
</script>

<template>
  <DetailCard class="min-w-0" :ui="{ container: 'min-w-0', wrapper: 'min-w-0' }">
    <template #title>
      <DetailSectionHeading :title="title" :description="description" :ui="{ title: 'text-lg' }" />
    </template>
    <dl v-if="labels" class="divide-y divide-default">
      <div v-for="label in labels" :key="label" class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
        <dt class="text-sm text-muted">
          {{ label }}
        </dt>
        <dd><USkeleton class="h-5 w-24" /></dd>
      </div>
    </dl>
    <div v-else class="space-y-4" aria-hidden="true">
      <div v-for="row in 3" :key="row" class="space-y-2">
        <div class="flex items-center justify-between gap-4">
          <USkeleton class="h-4 w-2/5" />
          <USkeleton class="h-4 w-20" />
        </div>
        <USkeleton class="h-1.5 w-full" />
      </div>
    </div>
  </DetailCard>
</template>
