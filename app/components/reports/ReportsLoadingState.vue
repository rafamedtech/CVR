<script setup lang="ts">
defineProps<{ annual: boolean, allBusinesses: boolean, carolina: boolean }>()

const summaryCards = [
  { title: 'Ventas netas', marker: 'bg-primary' },
  { title: 'Compras de material', marker: 'bg-violet-500' },
  { title: 'Gastos operativos', marker: 'bg-warning' },
  { title: 'Margen de ganancia', marker: 'bg-success' }
]
const sections = [
  { id: 'report-materials', title: 'Compras de material', marker: 'bg-violet-500', cards: [{ title: 'Proveedores de material', description: 'Gastos de insumos registrados en el periodo, agrupados por proveedor.' }] },
  { id: 'report-operating', title: 'Gastos operativos', marker: 'bg-warning', cards: [{ title: 'Gastos operativos por categoría', description: 'Renta, nómina, servicios y demás gastos, sin compras de material.' }] },
  { id: 'report-collections', title: 'Cobranza y flujo', marker: 'bg-success', cards: [{ title: 'Saldo por cobrar' }, { title: 'Cobros por método', description: 'Cómo entra el dinero al negocio durante el periodo.' }] }
]
</script>

<template>
  <div class="min-w-0 space-y-6" aria-busy="true" aria-label="Cargando reporte">
    <span role="status" class="sr-only">Cargando datos del reporte</span>
    <section aria-labelledby="report-summary" class="space-y-3">
      <h2 id="report-summary" class="text-xl font-semibold text-primary">
        Resultado del {{ annual ? 'año' : 'mes' }}
      </h2>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailStatCard
          v-for="card in summaryCards"
          :key="card.title"
          :title="card.title"
          loading
        >
          <template #title>
            <h3 class="flex items-center gap-2 text-xs font-normal text-muted uppercase">
              <span class="h-3.5 w-1 rounded-full" :class="card.marker" />
              {{ card.title }}
            </h3>
          </template>
          <div class="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <USkeleton class="h-3 w-12" />
            <span>vs.</span>
            <USkeleton class="h-3 w-16" />
            <span>del {{ annual ? 'año' : 'mes' }} anterior</span>
          </div>
          <p v-if="card.title === 'Margen de ganancia'" class="mt-auto pt-4 text-xs text-muted">
            Utilidad neta sobre ventas
          </p>
          <USkeleton v-else class="mt-4 h-3 w-3/4" />
        </DetailStatCard>
      </div>
      <div class="grid gap-4 xl:grid-cols-3">
        <ReportsProfitStatement
          :annual="annual"
          before-tax
          loading
          class="xl:col-span-2"
        />
        <DetailCard class="min-w-0">
          <!-- The pace heading also depends on the returned period and elapsed days. -->
          <USkeleton class="h-6 w-40 max-w-full" />
          <USkeleton class="h-4 w-24" />
          <USkeleton class="h-1.5 w-full" />
          <USkeleton class="mt-4 h-8 w-32" />
          <DetailFields :fields="[{ label: 'Venta diaria' }, { label: `${annual ? 'Año anterior' : 'Mes anterior'} / día` }]" loading class="mt-4 border-t border-default pt-3" />
        </DetailCard>
      </div>
      <DetailCard class="min-w-0">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <DetailSectionHeading :title="`Venta y costo por ${annual ? 'mes' : 'semana'}`" :ui="{ title: 'text-lg' }" />
            <p class="mt-1 text-sm text-muted">
              {{ annual ? 'Cuánto se vendió y cuánto se gastó en material y operación.' : 'Totales de lunes a domingo, incluyendo solo los días transcurridos del mes.' }}
            </p>
          </div>
          <DetailFields
            :fields="['Ventas', 'Material', 'Operativos', 'Resultado'].map(label => ({ label }))"
            :columns="4"
            loading
            class="w-full grid-cols-4! sm:w-auto"
          />
        </div>
        <p v-if="!annual" class="text-xs text-muted">
          Tendencia de ventas semanales
        </p>
        <USkeleton class="h-64 w-full" />
      </DetailCard>
    </section>

    <section aria-labelledby="report-sales" class="space-y-3">
      <ReportsSectionHeading
        id="report-sales"
        title="Ventas"
        marker="bg-primary"
        loading
      />
      <template v-if="allBusinesses">
        <h3 class="text-xl font-semibold text-highlighted">
          Ventas por canal
        </h3>
        <div class="grid gap-4 xl:grid-cols-2">
          <ReportsLoadingCard title="Carolina Pinturas" description="Participación de mostrador, vendedor y clientes internos en las ventas de Carolina." />
          <ReportsLoadingCard title="Talleres" description="Participación de cada taller en las ventas de Carrocería y Mecánica." />
        </div>
      </template>
      <ReportsLoadingCard v-else-if="carolina" title="Ventas por canal" />
      <template v-if="allBusinesses || carolina">
        <h3 class="text-xl font-semibold text-highlighted">
          {{ carolina ? 'Detalle de Carolina Pinturas' : 'Resultados por negocio' }}
        </h3>
        <ReportsLoadingCard v-if="allBusinesses" title="Negocio" :labels="['Ventas netas', 'Material', 'Operación', 'Utilidad neta', 'Cobrado']" />
      </template>
      <div class="grid gap-4 xl:grid-cols-3">
        <ReportsLoadingCard :title="allBusinesses ? 'Ventas por línea o tipo de trabajo' : carolina ? 'Ventas por línea' : 'Ventas por tipo de trabajo'" :description="allBusinesses ? 'Líneas de productos de Carolina y trabajos de los talleres.' : carolina ? 'Líneas de productos de Carolina Pinturas.' : 'Servicios, refacciones y mano de obra de las órdenes.'" />
        <ReportsLoadingCard :title="allBusinesses ? 'Productos y trabajos destacados' : carolina ? 'Productos destacados' : 'Trabajos destacados'" description="Conceptos con mayor venta en el periodo." />
        <ReportsLoadingCard title="Clientes principales" description="Concentración de ventas por cliente." />
      </div>
    </section>

    <section
      v-for="section in sections"
      :key="section.id"
      :aria-labelledby="section.id"
      class="space-y-3"
    >
      <ReportsSectionHeading
        :id="section.id"
        :title="section.title"
        :marker="section.marker"
        loading
      />
      <div class="grid gap-4" :class="{ 'xl:grid-cols-2': section.cards.length === 2 }">
        <ReportsLoadingCard
          v-for="card in section.cards"
          :key="card.title"
          :title="card.title"
          :description="card.description"
        />
      </div>
    </section>
  </div>
</template>
