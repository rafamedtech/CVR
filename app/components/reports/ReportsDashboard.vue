<script setup lang="ts">
import type { BusinessReportSummary } from '~/types/reports'
import type { ExpenseCategory, LineItemType, PaymentMethod } from '~/types/crm'

const props = defineProps<{ report: BusinessReportSummary, consolidated: boolean }>()
const annual = computed(() => props.report.period.mode === 'annual')
const lines = computed(() => props.report.salesByLine.map(item => ({ ...item, label: lineItemTypeLabels[item.key as LineItemType] ?? item.label })))
const categories = computed(() => props.report.operatingExpenseCategories.map(item => ({ ...item, label: expenseCategoryLabels[item.key as ExpenseCategory] ?? item.label })))
const methods = computed(() => props.report.paymentMethods.map(item => ({ ...item, label: paymentMethodLabels[item.key as PaymentMethod] ?? item.label })))
const countOrders = (count: number) => `${count} ${count === 1 ? 'orden' : 'órdenes'}`
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6">
    <section aria-labelledby="report-summary" class="space-y-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="report-summary" class="font-semibold text-highlighted">
          Resultado del {{ annual ? 'año' : 'mes' }}
        </h2>
        <p class="text-xs text-muted">
          {{ report.period.label }} · MXN · ventas con IVA cuando aplica
        </p>
      </div>
      <p class="text-xs text-muted">
        Órdenes aprobadas y posteriores, según su fecha de creación. Comparación con el {{ annual ? 'año' : 'mes' }} anterior completo.
      </p>
      <ReportsSummaryCards :metrics="report.metrics" :annual="annual" />
      <div class="grid gap-4 xl:grid-cols-3">
        <ReportsProfitStatement :metrics="report.metrics" :annual="annual" class="xl:col-span-2" />
        <ReportsMonthPace :report="report" />
      </div>
      <ReportsCashFlowChart :data="report.dailyMovements" :annual="annual" />
    </section>

    <section aria-labelledby="report-sales" class="space-y-4">
      <ReportsSectionHeading
        id="report-sales"
        title="Órdenes y servicios"
        marker="bg-primary"
        :amount="report.metrics.sales"
      />
      <ReportsBreakdownCard
        v-if="consolidated"
        title="Ventas por taller"
        description="Participación de cada taller en las ventas del periodo."
        icon="i-lucide-building-2"
        color="primary"
        :items="report.salesByWorkshop"
        empty-icon="i-lucide-building-2"
        empty-title="Sin ventas en los talleres"
        :count-label="countOrders"
      />
      <div class="grid gap-4 xl:grid-cols-3">
        <ReportsBreakdownCard
          title="Ventas por tipo de trabajo"
          description="Servicios, refacciones y mano de obra de las órdenes."
          icon="i-lucide-wrench"
          color="primary"
          :items="lines"
          empty-icon="i-lucide-wrench"
          empty-title="Sin trabajos registrados"
          :count-label="count => `${count} ${count === 1 ? 'partida' : 'partidas'}`"
        />
        <ReportsRankingCard
          title="Trabajos destacados"
          description="Conceptos con mayor venta en el periodo."
          icon="i-lucide-clipboard-list"
          empty="Sin trabajos registrados"
          :items="report.topServices"
          :count-label="count => `${count.toLocaleString('es-MX')} uds.`"
        />
        <ReportsRankingCard
          title="Clientes principales"
          description="Concentración de ventas por cliente."
          icon="i-lucide-users"
          empty="Sin clientes con ventas"
          :items="report.topCustomers"
          :count-label="countOrders"
        />
      </div>
    </section>

    <section aria-labelledby="report-materials" class="space-y-4">
      <ReportsSectionHeading
        id="report-materials"
        title="Compras de material"
        marker="bg-violet-500"
        :amount="report.metrics.materialPurchases"
      />
      <ReportsRankingCard
        title="Proveedores de material"
        description="Gastos de insumos registrados en el periodo, agrupados por proveedor."
        icon="i-lucide-truck"
        empty="Sin compras de material"
        :items="report.topMaterialProviders"
        :count-label="count => `${count} ${count === 1 ? 'gasto' : 'gastos'}`"
        color="material"
        exact-amounts
      />
    </section>

    <section aria-labelledby="report-operating" class="space-y-4">
      <ReportsSectionHeading
        id="report-operating"
        title="Gastos operativos"
        marker="bg-warning"
        :amount="report.metrics.operatingExpenses"
      />
      <ReportsBreakdownCard
        title="Gastos operativos por categoría"
        description="Renta, nómina, servicios y demás gastos, sin compras de material."
        icon="i-lucide-receipt"
        color="warning"
        :items="categories"
        empty-icon="i-lucide-receipt"
        empty-title="Sin gastos operativos"
        :count-label="count => `${count} ${count === 1 ? 'gasto' : 'gastos'}`"
      >
        <template #footer>
          <UButton
            to="/gastos"
            label="Ver gastos a detalle"
            trailing-icon="i-lucide-arrow-up-right"
            color="neutral"
            variant="link"
            class="px-0"
          />
        </template>
      </ReportsBreakdownCard>
    </section>

    <section aria-labelledby="report-collections" class="space-y-4">
      <ReportsSectionHeading
        id="report-collections"
        title="Cobranza y flujo"
        marker="bg-success"
        :amount="report.metrics.collections"
      />
      <div class="grid gap-4 xl:grid-cols-2">
        <ReportsRankingCard
          title="Saldo por cobrar"
          description="Saldo vigente de las órdenes creadas en el periodo."
          icon="i-lucide-hourglass"
          empty="Sin clientes con adeudo"
          :items="report.topDebtors"
          :count-label="count => `${count} ${count === 1 ? 'orden' : 'órdenes'} con saldo`"
          exact-amounts
        >
          <template #summary>
            <DetailFields
              :fields="[
                { key: 'pending', label: 'Pendiente', value: formatCurrency(report.metrics.outstandingBalance) },
                { key: 'collected', label: 'Cobrado', value: formatCurrency(report.metrics.collections) },
                { key: 'flow', label: 'Flujo neto', value: formatCurrency(report.metrics.netCashFlow) }
              ]"
              :columns="3"
              class="mb-4 rounded-lg bg-elevated/60 p-3"
            />
            <p class="mb-4 text-xs text-muted">
              {{ report.metrics.collectionCoveragePercentage }}% de las ventas del periodo está cubierto. Cobrado incluye pagos recibidos en el periodo, incluso de órdenes anteriores. El flujo neto resta material y gastos operativos a esos cobros.
            </p>
          </template>
        </ReportsRankingCard>
        <ReportsBreakdownCard
          title="Cobros por método"
          description="Cómo entra el dinero al negocio durante el periodo."
          icon="i-lucide-wallet-cards"
          color="success"
          :items="methods"
          empty-icon="i-lucide-hand-coins"
          empty-title="Sin cobros"
          :count-label="count => `${count} ${count === 1 ? 'movimiento' : 'movimientos'}`"
        >
          <template #footer>
            <UButton
              to="/pagos"
              label="Ver pagos a detalle"
              trailing-icon="i-lucide-arrow-up-right"
              color="neutral"
              variant="link"
              class="px-0"
            />
          </template>
        </ReportsBreakdownCard>
      </div>
    </section>
  </div>
</template>
