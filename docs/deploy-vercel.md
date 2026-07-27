# Deploy en Vercel

Este proyecto usa Nuxt 4 con Nitro, Prisma y Supabase. Vercel detecta el framework
automáticamente; no requiere `vercel.json` ni un directorio de salida personalizado.

## Antes de importar el repositorio

1. Confirma que los cambios que quieres publicar estén guardados en Git y enviados a GitHub.
2. En Supabase, abre **Connect** y copia:
   - La conexión **Transaction pooler** (puerto 6543) para `DATABASE_URL`.
   - La conexión **Session pooler** (puerto 5432) para ejecutar migraciones localmente como `DIRECT_URL`.
3. Usa el usuario PostgreSQL `prisma` descrito en el README.
4. En la URL transaccional agrega:

   ```text
   ?pgbouncer=true
   ```

5. Ejecuta las migraciones desde tu equipo, no desde el build de Vercel:

   ```bash
   pnpm db:migrate:deploy
   ```

6. Ejecuta `prisma/enable-rls.sql` en el SQL Editor de Supabase si todavía no lo hiciste.

## Crear el proyecto

1. En Vercel, selecciona **Add New → Project**.
2. Importa el repositorio de GitHub `rafamedtech/CVR`.
3. Usa el equipo `rafamedtech's projects`.
4. Conserva estos ajustes:
   - Framework Preset: **Nuxt.js** (detectado automáticamente).
   - Root Directory: `.`.
   - Install Command: automático.
   - Build Command: `pnpm build`.
   - Output Directory: automático; no escribas `.output`.
   - Node.js: `24.x`, fijado por `package.json` y alineado con el runtime de Nitro.
5. No pulses **Deploy** hasta terminar las variables de entorno.

## Variables de entorno en Vercel

Agrega estas variables a **Production**, **Preview** y **Development**:

| Variable | Valor |
| --- | --- |
| `NUXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NUXT_PUBLIC_SUPABASE_KEY` | Publishable key de Supabase |
| `NUXT_SUPABASE_SECRET_KEY` | Secret key de Supabase; márcala como Sensitive |
| `DATABASE_URL` | Transaction pooler 6543 con `pgbouncer=true`; márcala como Sensitive |
| `BOOTSTRAP_ADMIN_EMAIL` | Correo del primer administrador autorizado |

No agregues `DIRECT_URL` a Vercel. Se utiliza localmente para migraciones y no es necesaria
durante el build ni durante la ejecución de la aplicación.

## Supabase Auth después del primer deploy

Cuando Vercel asigne la URL de producción:

1. En Supabase abre **Authentication → URL Configuration**.
2. Configura **Site URL** con la URL de producción exacta.
3. Agrega a **Redirect URLs**:

   ```text
   http://localhost:3000/**
   https://URL-DE-PRODUCCION/confirm
   https://*-rafamedtechs-projects.vercel.app/**
   ```

4. Mantén la URL de producción exacta además del wildcard de previews.
5. Crea o invita en Supabase Auth al usuario de `BOOTSTRAP_ADMIN_EMAIL`.

## Validación del primer deploy

1. Abre `/login` y confirma que carga sin error.
2. Solicita recuperación de contraseña y confirma que el enlace vuelve a `/confirm`.
3. Inicia sesión con `BOOTSTRAP_ADMIN_EMAIL`.
4. Confirma que aparecen Taller de Carrocería y Taller Mecánico.
5. Abre clientes, vehículos, órdenes y gastos para comprobar lectura de base de datos.
6. En **Configuración → Usuarios**, comprueba que la consulta de usuarios de Supabase funciona.

Si el build falla, revisa primero que las cinco variables estén disponibles en Production.
Si la aplicación construye pero las APIs responden 500/503, revisa `DATABASE_URL` y que use
el puerto 6543. Si Supabase reporta prepared statements, confirma que incluya
`pgbouncer=true`.
