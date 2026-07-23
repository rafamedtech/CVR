# Control de Talleres

CRM multi-taller construido con Nuxt 4, Nuxt UI, Supabase Auth y PostgreSQL mediante Prisma ORM.

El MVP incluye:

- Aislamiento de información por taller y vista consolidada para el administrador general.
- Roles de gerente, asesor/recepción, técnico y caja/contabilidad.
- Clientes y vehículos.
- Cotizaciones y órdenes de trabajo con flujo de aprobación y entrega.
- Servicios, partes, mano de obra, costos, precios, descuentos e IVA.
- Anticipos, pagos parciales, métodos de pago y saldos pendientes.
- Gastos operativos.
- Indicadores de ventas, costos, utilidad bruta, utilidad neta, cuentas por cobrar y tiempos de entrega.
- Invitaciones de usuarios mediante Supabase Auth.
- Estructura preparada para agregar sucursales y la futura tienda de pinturas.

## Requisitos

- Node.js 20.19 o superior.
- pnpm 11.
- Un proyecto de Supabase.

## 1. Variables de entorno

```bash
cp .env.example .env
```

Completa en `.env`:

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_KEY`: clave publicable de Supabase.
- `NUXT_SUPABASE_SECRET_KEY`: clave secreta, utilizada únicamente en el servidor para invitar usuarios.
- `DATABASE_URL`: conexión de Supavisor en modo sesión, puerto 5432.
- `DIRECT_URL`: conexión directa para migraciones cuando tu red tenga IPv6 o el proyecto tenga IPv4 dedicado.
- `BOOTSTRAP_ADMIN_EMAIL`: correo que podrá convertirse en el primer administrador.

No expongas `NUXT_SUPABASE_SECRET_KEY` en variables públicas o código del navegador.

## 2. Usuario PostgreSQL para Prisma

La [guía oficial de Supabase para Prisma](https://supabase.com/docs/guides/database/prisma) recomienda crear un usuario dedicado. Ejecuta en el SQL Editor de Supabase, cambiando la contraseña:

```sql
create user "prisma"
with password 'UNA_CONTRASENA_SEGURA'
bypassrls
createdb;

grant "prisma" to "postgres";
grant usage, create on schema public to "prisma";
grant all privileges on all tables in schema public to "prisma";
grant all privileges on all sequences in schema public to "prisma";

alter default privileges in schema public
grant all privileges on tables to "prisma";

alter default privileges in schema public
grant all privileges on sequences to "prisma";
```

Usa ese usuario en `DATABASE_URL` y `DIRECT_URL`.

## 3. Instalar y crear la base

```bash
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
```

La migración inicial crea los dos negocios:

- Taller de Carrocería.
- Taller Mecánico.

Después de migrar, ejecuta [`prisma/enable-rls.sql`](./prisma/enable-rls.sql) en el SQL Editor. Este archivo activa RLS y revoca el acceso directo a las tablas desde las claves `anon` y `authenticated`; las operaciones del CRM pasan por el servidor y Prisma.

## 4. Configurar Supabase Auth

En Authentication:

1. Desactiva el registro público.
2. Configura el Site URL de la aplicación.
3. Agrega `http://localhost:3000/confirm` y la URL equivalente de producción a Redirect URLs.
4. Crea o invita manualmente al usuario indicado en `BOOTSTRAP_ADMIN_EMAIL`.

Cuando ese usuario inicie sesión por primera vez y todavía no exista ningún perfil, el sistema lo convierte en administrador general y lo asigna a ambos talleres. A partir de ahí, las demás invitaciones se gestionan desde **Configuración → Usuarios**.

## 5. Cargar datos de muestra

Después de iniciar sesión una vez con el administrador general:

```bash
pnpm db:seed
```

El seed agrega una muestra identificable y repetible para los dos talleres: colaboradores con
todos los roles, clientes, vehículos, órdenes en todos los estados y prioridades, servicios,
partes, mano de obra, otros conceptos, todos los métodos de pago y todas las categorías de
gasto. También incluye órdenes entregadas del mes anterior para probar el filtro de fechas.

Volver a ejecutarlo actualiza únicamente los registros `DEMO`; no duplica la muestra ni elimina
los datos capturados manualmente.

## 5. Desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Comprobaciones

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Estructura relevante

```text
app/
  components/       Componentes por módulo
  composables/      Sesión y contexto de taller
  pages/            Pantallas del CRM
server/
  api/              Operaciones validadas por sesión, rol y taller
  utils/            Prisma, autorización, cálculos y validación
prisma/
  schema.prisma     Modelo multi-taller
  migrations/       Migraciones reproducibles
  seed.ts           Datos DEMO repetibles para ambos talleres
  enable-rls.sql    Protección adicional para Supabase
```

## Decisiones de seguridad

- Supabase gestiona identidad y sesiones SSR mediante cookies.
- El navegador no consulta directamente las tablas del CRM.
- Cada ruta del servidor resuelve el taller permitido a partir del usuario autenticado.
- Un técnico solamente puede consultar y actualizar órdenes que tenga asignadas.
- Las acciones financieras, invitaciones y altas se restringen por rol.
- La clave secreta de Supabase solo se usa en el servidor.

Referencias: [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [Supabase con Prisma](https://supabase.com/docs/guides/database/prisma).
