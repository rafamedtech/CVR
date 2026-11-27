<!-- Generado: 2026-11-27 | commit: c9e2ef5 | archivos: 37 rutas + 14 utils + 15 shared -->
# Backend — CVRTRANSPORT

Nitro (`server/`). Toda ruta llama `requireCrmUser(event)` → `CrmRequestContext` (perfil, taller seleccionado, rol). `server/utils/*` se autoimporta.

## Autorización (`server/utils/auth.ts`)
- `requireCrmUser` — sesión Supabase + `Profile` activo; resuelve taller de la sesión y cambio de usuario (`session-user`). `isReadOnly` bloquea métodos distintos de GET/HEAD/OPTIONS.
- `requireSelectedWorkshop` — exige taller elegido en la sesión.
- `requireWorkshopRole(ctx, roles)` — rol en `WorkshopMember`; super admin pasa siempre; READ_ONLY no escribe.
- `requireSuperAdmin` — `Profile.isSuperAdmin` y no read-only. Ediciones de órdenes, partidas y pagos.
- `requireGlobalReadAccess` — super admin o read-only global. Reportes consolidados.
- Filtros Prisma: `workshopWhere`, `assignedOrderWhere` (técnico solo ve asignadas), `customerAccessWhere`, `vehicleAccessWhere`, `expenseAccessWhere` (`expenses.ts`).

## Rutas `server/api`
Formato: `MÉTODO ruta → guardas → modelos/utils`. Roles: M=MANAGER, A=ADVISOR, C=CASHIER, R=READ_ONLY, SA=super admin.

### Sesión y usuarios
GET  /api/session → user → workshop
GET  /api/session-users → user (canSwitchCrmUsers) → profile
PUT  /api/session-user → user (canSwitchCrmUsers) → cambia usuario efectivo
GET  /api/members → M + taller → profile
POST /api/members → M → workshop, profile (vincula usuario Supabase existente)
GET  /api/workshop-members → taller → workshopMember
PATCH /api/settings → M + taller → workshop (tasa IVA: `tax.ts`)

### Clientes y vehículos
GET  /api/customers → user → customer (`serializeCustomerAddress`)
POST /api/customers → M,A + taller → customer (`customerAddressData`, `isIdentifyingPhone`)
GET  /api/customers/[id] → user → customer + órdenes (`orderListSelect`)
PATCH /api/customers/[id] → M,A + taller → customer
PATCH /api/customers/[id]/workshops → user → customer_workshops
GET  /api/vehicles → user → vehicle
POST /api/vehicles → M,A + taller → vehicle, customer
GET  /api/vehicles/[id] → user → vehicle + órdenes
PATCH /api/vehicles/[id] → M,A + taller → vehicle, customer
PATCH /api/vehicles/[id]/workshops → user → vehicle_workshops

### Órdenes de servicio
GET  /api/orders → user → serviceOrder (`orderListSelect`, `serializeOrderListItem`, `assignedOrderWhere`)
POST /api/orders → M,A + taller → serviceOrder, workshopMember (`calculateLineItem`, `calculateOrderTotals`)
GET  /api/orders/[id] → user → serviceOrder (`currentWorkshopRole`)
PATCH /api/orders/[id] → SA → serviceOrder, orderItem (`recalculateOrder`)
DELETE /api/orders/[id] → SA → serviceOrder
POST /api/orders/[id]/items → SA → orderItem (`recalculateOrder`)
PATCH /api/orders/[id]/items/[itemId] → SA → orderItem
DELETE /api/orders/[id]/items/[itemId] → SA → orderItem
POST /api/orders/[id]/payments → SA → payment (+ audit)
PATCH /api/orders/[id]/payments/[paymentId] → SA → payment (+ audit)
DELETE /api/orders/[id]/payments/[paymentId] → SA + motivo obligatorio → payment (+ audit)

### Pagos y gastos
GET  /api/payments → M,C,R → payment
GET  /api/expenses → M,C,R → expense (`expenseAccessWhere`)
POST /api/expenses → user (+ `resolveExpenseWorkshopId`: taller, orden o centro global) → expense (+ audit)
PATCH /api/expenses/[id] → M,C / SA → expense (+ audit)
DELETE /api/expenses/[id] → M,C + taller + motivo obligatorio → expense (+ audit)
GET  /api/expense-order-options → M,C + taller → serviceOrder

### Historial de cambios
GET  /api/audit?orderId= → global read → auditEvent (orden + conceptos, pagos y gastos ligados)

### Dashboard y reportes
GET  /api/dashboard → taller → `workshop-dashboard.getWorkshopDashboard`
GET  /api/dashboard/overview → taller → `dashboard-overview.getDashboardOverview`
GET  /api/reports/summary → global read → `getWorkshopDashboard` + `carolina-reports.readCarolinaReport` + `carolina-inventory` → `business-report.buildBusinessReport` + `shared/combine-reports`

## server/utils
auth.ts — guardas y filtros de acceso (arriba). Matriz: `docs/permisos.md`
audit.ts — `recordAudit(tx, ctx, input)` en la misma transacción; `auditActorRole`
orders.ts — cálculo de partidas/totales, `recalculateOrder`, select y serialización de listados
expenses.ts — acceso y asignación de gastos (taller / orden / global)
customer-address.ts — domicilio Siigo ↔ cliente
workshop-dashboard.ts (320 l) — métricas por taller y periodo
dashboard-overview.ts — KPIs, actividad, pendientes de la portada
business-report.ts — reporte por negocio con base antes de IVA
carolina-reports.ts / carolina-inventory.ts — lectura de Carolina (ver integraciones.md)
report-pagination.ts — `readReportPages` (páginas de 500)
prisma.ts — `usePrisma` · validation.ts — `readCrmBody` (Zod) · tax.ts · phone.ts

## shared/ (cliente + servidor)
audit (motivo de eliminación, `AuditEventView`) · combine-reports · currency (MXN/USD, `roundMoney`) · customer-address (Zod) · customer-type (↔ Siigo) · date · expense (Zod) · order-assignee · order-number (prefijo por taller) · order-tax · payment-status · payment (Zod) · report-period · report-sales-channels · report · siigo-mexico-locations (reexport de la capa)

## Pruebas
`tests/*.test.ts` con `tsx --test` (sin BD): auth-pilot, read-only-access, global-expense-access, consolidated-report, carolina-inventory, order-*, payment-status, report*, currency*, date, phone, customer-address, session-workshops, user-switch, workshop-start, expense*, dashboard-overview, crm-session-loading.
