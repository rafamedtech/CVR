# CVRTRANSPORT — instrucciones para agentes

CRM multi-taller (Carrocería y Mecánica) y reporte consolidado de todos los negocios (incluye Carolina Pinturas). Nuxt 4 + Nuxt UI 4, Supabase Auth (SSR, cookies) y PostgreSQL con Prisma 7. Idioma del producto: español (rutas, textos, mensajes de error); los enums de BD están en inglés (`MANAGER`, `IN_PROGRESS`…).

Si trabajas desde el workspace `CVR/`, su `AGENTS.md` define el flujo entre repos y Notion. Este archivo cubre solo este repo.

## Mapa

Lee primero `docs/CODEMAPS/`: `backend.md` (rutas, guardas, roles), `frontend.md` (páginas y componentes), `data.md` (modelos y enums), `integraciones.md` (variables, Carolina, capa compartida). Otros documentos: `docs/consolidated-reports.md`, `docs/deploy-vercel.md`, `docs/auth-user-recovery.md`, `docs/plan-implementacion-cvr.md`.

## Comandos

```bash
pnpm dev                 # http://localhost:3000
pnpm test                # tsx --test tests/**/*.test.ts (sin BD)
pnpm lint                # eslint
pnpm typecheck           # nuxt typecheck
pnpm build               # prisma generate + nuxt build
pnpm db:migrate          # prisma migrate dev (solo local)
pnpm db:migrate:deploy   # aplicar migraciones (fuera del build de Vercel)
pnpm db:seed             # datos DEMO repetibles
```

Node 24 (`.nvmrc`), pnpm 11. CI (`.github/workflows/ci.yml`) ejecuta `lint` y `typecheck`. Verificación completa antes de un PR: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`.

## Arquitectura que no se debe romper

- **Autorización en el servidor.** Cada ruta de `server/api` empieza con `requireCrmUser(event)` y aplica `requireSelectedWorkshop`, `requireWorkshopRole(ctx, [...])`, `requireSuperAdmin` o `requireGlobalReadAccess` según la operación (`server/utils/auth.ts`). Las consultas Prisma filtran con `workshopWhere`, `assignedOrderWhere`, `customerAccessWhere`, `vehicleAccessWhere` o `expenseAccessWhere`. Nunca confíes en el taller o rol enviados por el cliente.
- **Roles.** `WorkshopRole`: MANAGER, ADVISOR, TECHNICIAN (solo órdenes asignadas), CASHIER, READ_ONLY. `Profile.isSuperAdmin` (administrador general, ve ambos talleres) y `Profile.isReadOnly` (consulta global, bloquea escrituras). Las ediciones de órdenes, partidas y pagos exigen super admin.
- **Validación.** Cuerpos con `readCrmBody(event, zodSchema)` (`server/utils/validation.ts`). Esquemas compartidos cliente/servidor en `shared/`.
- **Dinero.** Totales con `server/utils/orders.ts` (`calculateLineItem`, `recalculateOrder`), IVA por taller (`shared/order-tax.ts`), conversión `shared/currency.ts`. Política de redondeo binaria de CVR (`roundBinaryMoney`); no la mezcles con la decimal de Pinturas.
- **Fechas.** Zona horaria del taller (`app/utils/datetime.ts`); claves `YYYY-MM-DD` en API y BD.
- **Carolina.** `server/utils/carolina-{reports,inventory}.ts` leen la base de Carolina con clave secreta, solo SELECT. Si Carolina falla, el reporte se marca como parcial; nunca se representa como cero. Columnas consumidas en `docs/CODEMAPS/integraciones.md`.
- **Migraciones.** Prisma Migrate en `prisma/migrations`. Después de migrar en un entorno nuevo, ejecutar `prisma/enable-rls.sql`. El navegador nunca consulta tablas directamente.

## Frontend

- Sesión y taller: `useCrmSession()` + `app/middleware/crm-session.global.ts`. Las páginas montan `DashboardNavbar` y `WorkshopSwitcher`.
- Reutiliza componentes de `@rafamedtech/nuxt-shared` (`Detail*`, `List*`, `Reports*`, `App*`, calendarios) antes de crear markup. Catálogo y consumidores: `nuxt-shared/docs/CODEMAPS/componentes.md`. Un componente local con el mismo nombre anula al de la capa.
- Datos: el patrón vigente es `$fetch` desde la página tras resolver la sesión. Sigue el patrón de la página vecina; no mezcles `useFetch` y `$fetch` para el mismo recurso.
- Estado compartido con `useState`; nunca `ref()` exportado a nivel de módulo (se comparte entre peticiones SSR).
- Etiquetas y colores de enums en `app/utils/crm.ts`. Verifica carga, vacío, error, móvil y escritorio.

## Capa compartida

- Versión exacta de `@rafamedtech/nuxt-shared` en `package.json`. Actualiza con `pnpm add -E @rafamedtech/nuxt-shared@<versión>` en un PR propio (manifiesto, lockfile y migración juntos).
- Si necesitas un arreglo urgente de la capa antes de publicarla, usa `pnpm patch` (`patchedDependencies` en `pnpm-workspace.yaml`) y retíralo al subir a la versión que lo incluya. Las versiones recién publicadas deben figurar en `minimumReleaseAgeExclude`.

## Seguridad

- `NUXT_SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL` y `CAROLINA_REPORTS_*` solo en el servidor. Nunca en `NUXT_PUBLIC_*`, `runtimeConfig.public`, `useState` ni respuestas de API.
- No pases entradas del usuario a URLs de `$fetch` del servidor.
- Errores con `createError({ statusCode, statusMessage })` y mensaje en español, como en el resto del código.

## Git

Rama por cambio, nunca directo a `main`. Commits y PRs solo cuando el usuario lo pida.
