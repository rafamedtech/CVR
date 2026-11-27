<!-- Generado: 2026-11-27 | commit: c9e2ef5 | archivos: nuxt.config.ts, .env.example, server/utils/carolina-*.ts -->
# Integraciones — CVRTRANSPORT

## Variables de entorno (solo nombres)
NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY — cliente Supabase Auth (públicas)
NUXT_SUPABASE_SECRET_KEY — solo servidor (vincular usuarios)
DATABASE_URL (pooler 6543, `pgbouncer=true`), DIRECT_URL (5432, migraciones)
BOOTSTRAP_ADMIN_EMAIL — primer super admin
CAROLINA_REPORTS_SUPABASE_URL, CAROLINA_REPORTS_SUPABASE_SECRET_KEY — lectura de Carolina (solo servidor)

## Supabase Auth
`@nuxtjs/supabase` (SSR, cookies). Redirect `/confirm`. Registro público desactivado. Perfil = `profiles.id`.

## Carolina Pinturas (otra base Supabase, solo SELECT)
Consumidor: `GET /api/reports/summary` (guarda `requireGlobalReadAccess`). Falla o sin configuración → «Reporte parcial: solo talleres». Páginas de 500, timeout 20 s.
`server/utils/carolina-reports.ts`:
- sales_orders: id, order_date, total, tax_total, customer_id, customer_name_snapshot, status_key → siigo_customers.is_internal_order_customer
- sales_order_items: id, order_id, product_name_snapshot, total, tax_amount, quantity → siigo_products.account_group_name
- sales_order_payments: id, order_id, payment_date, payment_method, amount
- expenses: id, expense_date, category, amount, exchange_rate, provider_name_snapshot, purchase_payment_id
`server/utils/carolina-inventory.ts`:
- inventory_warehouses: id, code, name
- inventory_balances: warehouse_id, product_id, quantity → siigo_products.unit_cost, cost_currency
**Contrato:** renombrar/eliminar estas columnas en `siigo-pinturas` rompe el consolidado. Criterios: `docs/consolidated-reports.md`.

## Capa `@rafamedtech/nuxt-shared` (versión exacta en package.json)
Componentes Detail*/List*/Reports*/Auth*/App*, `DashboardShell`, `DashboardNavbar`, utilidades de formato, redondeo y reportes, catálogo Siigo México (`shared/siigo-mexico-locations.ts` reexporta).

## Despliegue
Vercel (Nitro auto). Migraciones fuera del build. Guía: `docs/deploy-vercel.md`. CI: `.github/workflows/ci.yml`.
