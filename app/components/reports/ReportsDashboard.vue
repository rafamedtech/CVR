<script setup lang="ts">
import type { BusinessReportSummary, ConsolidationInfo } from '~/types/reports'
import type { ExpenseCategory, LineItemType, PaymentMethod } from '~/types/crm'
import { reportFormatDate } from '~/utils/datetime'

const props = withDefaults(defineProps<{ report: BusinessReportSummary, consolidated: boolean, allBusinesses?: boolean, carolina?: boolean, detailsLinks?: boolean, businesses?: ConsolidationInfo['businesses'] }>(), { detailsLinks: true })
const annual = computed(() => props.report.period.mode === 'annual')
const periodLabel = computed(() => `${reportFormatDate(props.report.period.start)} – ${reportFormatDate(props.report.period.end)}`)
const lines = computed(() => props.report.salesByLine.map(item => ({ ...item, label: lineItemTypeLabels[item.key as LineItemType] ?? item.label })))
const categories = computed(() => props.report.operatingExpenseCategories.map(item => ({ ...item, label: expenseCategoryLabels[item.key as ExpenseCategory] ?? item.label })))
const methods = computed(() => props.report.paymentMethods.map(item => ({ ...item, label: paymentMethodLabels[item.key as PaymentMethod] ?? item.label })))
const countOrders = (count: number) => `${count} ${count === 1 ? 'orden' : 'órdenes'}`
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6">
    <section aria-labelledby="report-summary" class="space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="report-summary" class="text-xl font-semibold text-highlighted">
          Resultado del {{ annual ? 'año' : 'mes' }}
        </h2>
        <p class="text-xs text-muted">
          {{ periodLabel }} · MXN · {{ report.taxBasis === 'before-tax' ? 'ventas antes de IVA' : 'ventas con IVA cuando aplica' }}
        </p>
      </div>
      <ReportsSummaryCards :metrics="report.metrics" :annual="annual" :before-tax="report.taxBasis === 'before-tax'" />
      <div class="grid gap-4 xl:grid-cols-3">
        <ReportsProfitStatement
          :metrics="report.metrics"
          :annual="annual"
          :before-tax="report.taxBasis === 'before-tax'"
          class="xl:col-span-2"
        />
        <ReportsMonthPace :report="report" />
      </div>
      <ReportsCashFlowChart :data="report.dailyMovements" :annual="annual" />
    </section>

    <section aria-labelledby="report-sales" class="space-y-3">
      <ReportsSectionHeading
        id="report-sales"
        title="Ventas"
        marker="bg-primary"
        :amount="report.metrics.sales"
      />
      <ReportsBusinessSalesChannels
        v-if="allBusinesses"
        :channels="report.salesChannels ?? []"
        :businesses="businesses ?? []"
      />
      <ReportsSalesChannels
        v-else-if="carolina && report.salesChannels?.length"
        :channels="report.salesChannels"
      />
      <slot name="businesses" />
      <ReportsBreakdownCard
        v-if="consolidated && !allBusinesses"
        title="Ventas por taller"
        description="Participación de cada negocio en las ventas del periodo."
        icon="i-lucide-building-2"
        color="primary"
        :items="report.salesByWorkshop"
        empty-icon="i-lucide-building-2"
        empty-title="Sin ventas en los talleres"
        :count-label="countOrders"
      />
      <div class="grid gap-4 xl:grid-cols-3">
        <ReportsBreakdownCard
          :title="allBusinesses ? 'Ventas por línea o tipo de trabajo' : carolina ? 'Ventas por línea' : 'Ventas por tipo de trabajo'"
          :description="allBusinesses ? 'Líneas de productos de Carolina y trabajos de los talleres.' : carolina ? 'Líneas de productos de Carolina Pinturas.' : 'Servicios, refacciones y mano de obra de las órdenes.'"
          icon="i-lucide-wrench"
          color="primary"
          :items="lines"
          uppercase-values
          empty-icon="i-lucide-wrench"
          empty-title="Sin trabajos registrados"
          :count-label="count => `${count} ${count === 1 ? 'partida' : 'partidas'}`"
        />
        <ReportsRankingCard
          :title="allBusinesses ? 'Productos y trabajos destacados' : carolina ? 'Productos destacados' : 'Trabajos destacados'"
          description="Conceptos con mayor venta en el periodo."
          icon="i-lucide-clipboard-list"
          empty="Sin trabajos registrados"
          :items="report.topServices"
          uppercase-values
          :count-label="count => `${count.toLocaleString('es-MX')} uds.`"
        />
        <ReportsRankingCard
          title="Clientes principales"
          description="Concentración de ventas por cliente."
          icon="i-lucide-users"
          empty="Sin clientes con ventas"
          :items="report.topCustomers"
          uppercase-values
          :count-label="countOrders"
        />
      </div>
    </section>

    <section aria-labelledby="report-materials" class="space-y-3">
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
        uppercase-values
        :count-label="count => `${count} ${count === 1 ? 'gasto' : 'gastos'}`"
        color="material"
        exact-amounts
      />
    </section>

    <section aria-labelledby="report-operating" class="space-y-3">
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
        uppercase-values
        empty-icon="i-lucide-receipt"
        empty-title="Sin gastos operativos"
        :count-label="count => `${count} ${count === 1 ? 'gasto' : 'gastos'}`"
      >
        <template v-if="detailsLinks !== false" #footer>
          <UButton
            to="/gastos"
            :label="allBusinesses ? 'Ver gastos de talleres' : 'Ver gastos a detalle'"
            trailing-icon="i-lucide-arrow-up-right"
            color="neutral"
            variant="link"
            class="px-0"
          />
        </template>
      </ReportsBreakdownCard>
    </section>

    <section aria-labelledby="report-collections" class="space-y-3">
      <ReportsSectionHeading
        id="report-collections"
        title="Cobranza y flujo"
        marker="bg-success"
        :amount="report.metrics.collections"
      />
      <div class="grid gap-4 xl:grid-cols-2">
        <ReportsRankingCard
          title="Saldo por cobrar"
          :description="carolina ? 'Saldo vigente de los pedidos del periodo.' : 'Saldo vigente de las órdenes creadas en el periodo.'"
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
            >
              <template #value="{ field }">
                <span
                  :class="{
                    'text-error': field.key === 'flow' && report.metrics.netCashFlow < 0,
                    'text-success': field.key === 'flow' && report.metrics.netCashFlow > 0
                  }"
                >{{ field.value }}</span>
              </template>
            </DetailFields>
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
          uppercase-values
          empty-icon="i-lucide-hand-coins"
          empty-title="Sin cobros"
          :count-label="count => `${count} ${count === 1 ? 'movimiento' : 'movimientos'}`"
        >
          <template v-if="detailsLinks !== false" #footer>
            <UButton
              to="/pagos"
              :label="allBusinesses ? 'Ver pagos de talleres' : 'Ver pagos a detalle'"
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
