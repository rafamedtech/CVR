<!-- Generado: 2026-11-27 | commit: c9e2ef5 | archivos: prisma/schema.prisma + 18 migraciones -->
# Datos — CVRTRANSPORT

PostgreSQL (Supabase) vía Prisma 7. Migraciones: **Prisma Migrate** en `prisma/migrations` (`pnpm db:migrate` local, `db:migrate:deploy` en despliegue). RLS: `prisma/enable-rls.sql` revoca acceso directo a `anon`/`authenticated`; todo pasa por el servidor. Seed DEMO: `prisma/seed.ts`.

## Modelos (tabla)
Workshop (workshops) → members, customers, vehicles, orders, expenses. Tipo `WorkshopType`.
Profile (profiles) — id = auth.users.id; `isSuperAdmin`, `isReadOnly`, `active` → memberships, createdOrders, assignedOrders, recordedPayments, recordedExpenses
WorkshopMember (workshop_members) — profile + workshop + `role: WorkshopRole`
Customer (customers) — domicilio con códigos Siigo (`02/02004`) → workshops (CustomerWorkshop), vehicles, orders
CustomerWorkshop (customer_workshops) — visibilidad cliente↔taller
Vehicle (vehicles) → customer, workshops (VehicleWorkshop), orders
VehicleWorkshop (vehicle_workshops)
ServiceOrder (service_orders) — único `workshopId + orderNumber` → workshop, customer, vehicle, createdBy, assignedTo?, items, payments, expenses
OrderItem (order_items) → order
Payment (payments) → order, recordedBy
Expense (expenses) → workshop? (null = centro global), order?, recordedBy
AuditEvent (audit_events) — solo inserción (trigger), sin FK: entidad, acción, taller, actor, rol, `switchedFromId`, motivo, fecha efectiva, documento origen, foto y cambios. Ver `docs/permisos.md`

## Enums
WorkshopType: BODY_SHOP MECHANICAL PAINT_STORE
WorkshopRole: MANAGER ADVISOR TECHNICIAN CASHIER READ_ONLY
OrderStatus: ESTIMATE AWAITING_APPROVAL APPROVED IN_PROGRESS QUALITY_CONTROL READY DELIVERED LIQUIDATED CANCELLED
OrderPriority: NORMAL HIGH URGENT
LineItemType: SERVICE PART LABOR OTHER
PaymentMethod: CASH CARD TRANSFER CHECK CREDIT OTHER
PaymentStatus: NO_PAYMENTS PARTIALLY_PAID PAID
Currency: MXN USD
CustomerType: CUSTOMER SUPPLIER OTHER
ExpenseCategory: RENT PAYROLL UTILITIES SUPPLIES MAINTENANCE MARKETING TAXES OTHER

## Reglas de cálculo
Totales y saldo de la orden: `server/utils/orders.ts` (`calculateLineItem`, `recalculateOrder`), IVA por taller (`shared/order-tax.ts`), estado de pago `shared/payment-status.ts`. Conversión USD→MXN `shared/currency.ts` (`roundMoney`, política binaria de CVR).
