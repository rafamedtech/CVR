# Recuperar una cuenta recreada en Supabase Auth

Para una contraseña olvidada, utiliza `/forgot-password` y el enlace de recuperación
que abre `/confirm`. Esto conserva el UUID y las referencias del CRM.

Si ya se eliminó y recreó la cuenta en Auth, su UUID será distinto del guardado
en `public.profiles`. El inicio de sesión no recupera automáticamente los permisos
por correo. No borres el perfil del CRM: contiene los permisos y las referencias
históricas de órdenes, pagos y gastos.

Desde una máquina autorizada con `DIRECT_URL` (o `DATABASE_URL`) y acceso a
`auth.users`, revisa primero el diagnóstico:

```bash
pnpm db:relink-auth admin@cvrtransportinc.com
```

Aplica la reparación de la cuenta identificada:

```bash
pnpm db:relink-auth admin@cvrtransportinc.com --apply
```

El comando exige un correo confirmado, un único perfil coincidente y que el UUID
anterior ya no exista en Auth. Rechaza fusiones y relaciones sin actualización en
cascada. Sólo cambia el UUID y la fecha de actualización del perfil; PostgreSQL
actualiza las referencias mediante `ON UPDATE CASCADE`. Antes de confirmar la
transacción, verifica que se conserven todos los campos del perfil y la cantidad
de referencias, y que no queden referencias al UUID anterior. Ante un error,
revierte la transacción. Repetirlo después de la reparación no modifica datos.

Después, cierra la sesión anterior e inicia sesión con la cuenta nueva. Este
procedimiento no cambia la contraseña ni requiere desplegar la aplicación.
