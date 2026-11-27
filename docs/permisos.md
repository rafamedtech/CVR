# Permisos y trazabilidad

Matriz operativa de CVRTRANSPORT (CVR-02). La autorización vive en `server/utils/auth.ts` y se aplica en cada ruta de `server/api`; los checks del cliente son solo UX. Carolina Pinturas tiene su propia matriz en `siigo-pinturas/docs/permisos.md`.

## Matriz por taller

C = consulta · R = registra · A = autoriza, edita o elimina · — = sin acceso

| Flujo | Super admin | MANAGER | ADVISOR | CASHIER | TECHNICIAN | READ_ONLY (taller) | Consulta global |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Clientes y vehículos | R/A | R | R | C | C | C | C |
| Órdenes: crear | R | R | R | — | — | — | — |
| Órdenes: editar, cambiar estado, eliminar | A | — | — | — | — | — | — |
| Órdenes: consultar | C | C | C | C | C (asignadas) | C | C |
| Conceptos de la orden | A | — | — | — | — | — | — |
| Pagos de orden: registrar, editar, eliminar | A | — | — | — | — | — | — |
| Pagos: listado | C | C | — | C | — | C | C |
| Gastos del taller o de orden | R/A | R/A | — | R/A | — | C | C |
| Gastos del centro global | R/A | — | — | — | — | — | C |
| Reporte consolidado y valuación | C | — | — | — | — | — | C |
| Historial de cambios (`/api/audit`) | C | — | — | — | — | — | C |
| Usuarios del taller | R/A | R/A | — | — | — | — | — |

Los accesos cruzados se impiden en el servidor: cada consulta filtra por el taller de la sesión (`workshopWhere`, `expenseAccessWhere`, `customerAccessWhere`, `vehicleAccessWhere`). Un registro de otro taller responde 404.

### Flujos pendientes

Caja, tesorería, conciliación y almacén de talleres no existen todavía. Sus roles se crearán con sus módulos para no tener permisos sin rutas:

| Flujo | Tarea | Responsable operativo (CVR-01) |
| --- | --- | --- |
| Cuentas de caja y bancos, conciliación | CVR-06 | El otro administrador |
| Corte de tienda | CVR-09 (en Carolina Pinturas) | Mostrador (América) |
| Fletes de Transporte | CVR-03 | Administrador de CVR; conciliación de pagos, el otro administrador |
| Nómina (detalle individual restringido) | CVR-13 | Administración |

## Trazabilidad

`audit_events` guarda, en la misma transacción que el cambio, quién (perfil, correo, rol y, si actuó con «cambiar usuario», el administrador real en `switchedFromId`), qué (entidad, acción), cuándo (registro y fecha efectiva), dónde (taller), de qué documento (`sourceType`/`sourceId`) y por qué (`reason`). Incluye la foto previa del registro y, en ediciones, el resultado.

| Registro | Eventos | Motivo |
| --- | --- | --- |
| Pagos de orden | alta, edición, eliminación | Obligatorio al eliminar |
| Gastos | alta, edición, eliminación | Obligatorio al eliminar |
| Órdenes | edición, eliminación (la foto incluye conceptos y pagos borrados en cascada y los gastos que quedan sin orden) | Opcional al eliminar |
| Conceptos de orden | alta, edición, eliminación | — |

La tabla es de solo inserción (trigger `audit_events_immutable`), con RLS activo y sin acceso para `anon`/`authenticated`. Se escribe con `recordAudit` (`server/utils/audit.ts`) y se consulta en `/ordenes/[id]` → «Historial de cambios».
