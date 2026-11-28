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
| Fletes de Transporte: registrar, confirmar salida y entrega, cancelar | R/A | R | — | — | — | — | — |
| Fletes: editar datos, eliminar (motivo obligatorio) | A | — | — | — | — | — | — |
| Fletes: consultar e historial del flete | C | C | C | C | C | C | C |
| Costos directos del flete (importes, proveedores, eventos de gastos en el historial) | C | C | — | C | — | C | C |
| Costos directos y diésel del flete: registrar | R/A | R/A | — | R/A | — | — | — |
| Historial de cambios de órdenes (`/api/audit?orderId=`) | C | — | — | — | — | — | C |
| Usuarios del taller | R/A | R/A | — | — | — | — | — |

Los accesos cruzados se impiden en el servidor: cada consulta filtra por el taller de la sesión (`workshopWhere`, `expenseAccessWhere`, `customerAccessWhere`, `vehicleAccessWhere`, `freightAccessWhere`). Un registro de otro taller responde 404.

**Transporte (CVR-03).** Es un `Workshop` con `type: TRANSPORT`: usa las mismas membresías y roles. Las filas de fletes aplican a los integrantes del negocio Transporte. Un usuario de Carrocería o Mecánica no ve fletes (404) y la consulta global los ve todos. Las escrituras exigen tener Transporte seleccionado (`requireTransportWorkshop`), y en Transporte no se registran órdenes ni vehículos (`rejectTransportWorkshop`). Asesor y técnico ven el flete y su importe, pero no sus costos (`canViewFreightCosts`, mismo criterio que `/api/expenses`). Un flete cancelado admite costos, porque el gasto pudo ocurrir antes de cancelar. Al eliminar un flete, sus gastos se conservan sin flete; la foto del flete en la bitácora guarda sus ids. El otro administrador, responsable de conciliar los pagos de Transporte, puede tener el rol CASHIER: consulta y registra costos, y su conciliación llega en CVR-06/CVR-08.

### Flujos pendientes

Caja, tesorería, conciliación y almacén de talleres no existen todavía. Sus roles se crearán con sus módulos para no tener permisos sin rutas:

| Flujo | Tarea | Responsable operativo (CVR-01) |
| --- | --- | --- |
| Cuentas de caja y bancos, conciliación | CVR-06 | El otro administrador |
| Corte de tienda | CVR-09 (en Carolina Pinturas) | Mostrador (América) |
| Nómina (detalle individual restringido) | CVR-13 | Administración |

## Trazabilidad

`audit_events` guarda, en la misma transacción que el cambio, quién (perfil, correo, rol y, si actuó con «cambiar usuario», el administrador real en `switchedFromId`), qué (entidad, acción), cuándo (registro y fecha efectiva), dónde (taller), de qué documento (`sourceType`/`sourceId`) y por qué (`reason`). Incluye la foto previa del registro y, en ediciones, el resultado.

| Registro | Eventos | Motivo |
| --- | --- | --- |
| Pagos de orden | alta, edición, eliminación | Obligatorio al eliminar |
| Gastos | alta, edición, eliminación | Obligatorio al eliminar |
| Órdenes | edición, eliminación (la foto incluye conceptos y pagos borrados en cascada y los gastos que quedan sin orden) | Opcional al eliminar |
| Conceptos de orden | alta, edición, eliminación | — |
| Fletes | alta, edición, cambio de estado (`status`, con fecha efectiva del evento), eliminación | Obligatorio al eliminar y al cancelar |

La tabla es de solo inserción (trigger `audit_events_immutable`), con RLS activo y sin acceso para `anon`/`authenticated`. Se escribe con `recordAudit` (`server/utils/audit.ts`) y se consulta en `/ordenes/[id]` y `/fletes/[id]` → «Historial de cambios». Los gastos ligados a un flete se registran con `sourceType: freight`.
