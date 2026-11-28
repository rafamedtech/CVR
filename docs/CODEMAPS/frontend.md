<!-- Generado: 2026-11-27 | commit: c9e2ef5 | archivos: 21 páginas + 78 componentes -->
# Frontend — CVRTRANSPORT

Nuxt 4 `app/`. Módulos: `@nuxt/ui`, `@nuxtjs/supabase`, `@vueuse/nuxt`, `@nuxt/eslint`; capa `@rafamedtech/nuxt-shared`.
Sesión: `app/middleware/crm-session.global.ts` + `useCrmSession()` (perfil, taller, rol). Con Transporte seleccionado, `/`, `/ordenes`, `/vehiculos` y `/pagos` redirigen a `/fletes`, y el menú muestra «Fletes» en lugar de Resumen, Vehículos, Órdenes y Pagos. Casi todas las páginas montan `WorkshopSwitcher` y `DashboardNavbar` (capa).

## Páginas → componentes → API
/ → Dashboard{KpiGrid,ActivityFeed,Attention,UpcomingDeliveries,RecentOrders}, RetryAlert → /api/dashboard/overview
/ordenes → OrdersFilters, OrdersTable, OrdersCreateMenu, OrdersOrderFormModal, ReportsBusinessSelector · `useTableQuery` (estado en URL) → /api/orders, /api/customers, /api/vehicles
/ordenes/[id] → Orders{OrderOverviewCards,OrderReceptionCard,OrderFinancialSummaryCard,OrderItemsCard,OrderPaymentsCard,OrderExpensesCard,OrderFormModal,OrderAuditCard}, DetailStatCard → /api/orders/[id] (+ items, payments), /api/audit (SA y consulta global)
/clientes → CustomersTable, Customers{CustomerFormModal,CustomerEditModal,CustomerWorkshopsModal} → /api/customers
/clientes/[id] → DetailHeader, DetailPageHeader, Customers{CustomerDetailProfile,CustomerDetailVehicles}, OrdersTable → /api/customers/[id]
/vehiculos → VehiclesTable, Vehicles{VehicleFormModal,VehicleEditModal,VehicleWorkshopsModal} → /api/vehicles, /api/customers
/vehiculos/[id] → VehiclesVehicleDetailProfile, OrdersTable → /api/vehicles/[id]
/pagos → PaymentsTable, AppCsvExportButton → /api/payments
/fletes → ListToolbar, CalendarRangePicker, FreightsTable, FreightFormModal · `useTableQuery` → /api/freights, /api/customers
/fletes/[id] → Freights{FreightStatusBadge,FreightStatusModal,FreightCostsCard,FreightFormModal}, AuditHistoryCard, DetailStatCard, DetailFields → /api/freights/[id] (+ status), /api/expenses, /api/audit?freightId=
/gastos → ExpensesFilters, ExpensesTable, ExpensesCreateMenu, Expenses{ExpenseFormModal,ExpenseDeleteModal}, ReportsBusinessSelector → /api/expenses, /api/expense-order-options
/reportes → ReportsPeriodControls, ReportsBusinessSelector, ReportsDashboard, ReportsConsolidationSummary, ReportsInventoryValuation · `useReportPeriod` → /api/reports/summary
/configuracion (layout con UNavigationMenu) → /configuracion (index: IVA) → /api/settings · /configuracion/usuarios → SettingsAccessPlan, SettingsMemberFormModal → /api/members
/elegir-taller → WorkshopStartModal (sin layout)
/login, /forgot-password, /confirm → AuthFormCard, AuthEmailField, AuthPasswordFields, AuthRecoveryNotice (capa) · `useSupabaseClient` (sin layout)

## Componentes (`app/components`)
raíz: AppBrand, AuditHistoryCard (historial de `/api/audit` para órdenes y fletes), DeletionReasonField (motivo en DestructiveConfirmModal #reason), TeamsMenu, UserMenu, WorkshopStartModal, WorkshopSwitcher
customers/: CustomerAddressFields, CustomerDetailProfile, CustomerDetailVehicles, CustomerEditModal, CustomerFormModal, CustomerWorkshopsModal, CustomersMobileList, CustomersTable
dashboard/: ActivityDetails, ActivityFeed, Attention, KpiGrid, MonthFilter, OrdersSection, ProfitSummary, RecentOrders, StatusBreakdown, Trend, UpcomingDeliveries, WorkshopPerformance
freights/: FreightCostsCard, FreightFormModal, FreightStatusBadge, FreightStatusModal, FreightsTable
expenses/: ExpenseDeleteModal, ExpenseEditModal, ExpenseFormModal, ExpenseOrderPopover, ExpensesActionsMenu, ExpensesAssignment, ExpensesCreateMenu, ExpensesFilters, ExpensesMobileList, ExpensesTable, ExpensesWorkshopBadge
orders/: OrderAuditCard, OrderCustomerSelectMenu, OrderExpensesCard, OrderFinancialSummaryCard, OrderFormModal, OrderItemFields, OrderItemsCard, OrderItemsEditor, OrderOverviewCards, OrderPaymentsCard, OrderReceptionCard, OrdersCreateMenu, OrdersFilters, OrdersMobileList, OrdersStatusBadge, OrdersTable, OrdersWorkshopBadge
payments/: PaymentsMobileList, PaymentsTable
reports/: BusinessSalesChannels, BusinessSelector, CashFlowChart.client, ConsolidationSummary, Dashboard, InventoryValuation, LoadingCard, LoadingState, ProfitStatement, SummaryCardsAdapter
settings/: AccessPlan, MemberFormModal
vehicles/: VehicleDetailProfile, VehicleEditModal, VehicleFormModal, VehicleWorkshopsModal, VehicleYearInput, VehiclesMobileList, VehiclesTable
Desde la capa: ver `nuxt-shared/docs/CODEMAPS/componentes.md`.

## Composables y utils
useCrmSession — sesión, taller activo, rol, cambio de taller
useReportPeriod — periodo mensual/anual en URL
useUserSwitch — /api/session-users, /api/session-user
useMobileViewport
app/utils/crm.ts — etiquetas y colores de enums (estado, prioridad, método de pago, categoría de gasto, rol, tipo de taller y su ícono `workshopTypeIcons`, estado y origen de flete)
app/utils/datetime.ts — formateo por zona del taller (`DEFAULT_WORKSHOP_TIME_ZONE`)
app/utils/{currency,errors,reportPeriods,dashboardFormatters}.ts
