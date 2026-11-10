# Reporte de todos los negocios

En **Resumen**, el administrador general puede elegir **Todos los negocios**
para sumar todos los talleres de CVR y Carolina Pinturas. También puede volver
al taller seleccionado. Los periodos mensual y anual y el alcance se conservan
como parámetros de la URL.

## Conexión de Carolina

Configurar exclusivamente en el servidor de CVR, en el entorno que se publique:

- `CAROLINA_REPORTS_SUPABASE_URL`: URL del proyecto Supabase de Carolina.
- `CAROLINA_REPORTS_SUPABASE_SECRET_KEY`: clave privada del mismo proyecto.

Las credenciales locales quedan en `.env`, ignorado por Git. No usar un prefijo
`NUXT_PUBLIC_` ni incluir valores privados en este documento. En Vercel hay que
configurar ambas variables para cada entorno que deba mostrar el consolidado.

El adaptador `server/utils/carolina-reports.ts` usa la biblioteca Supabase ya
instalada y realiza únicamente SELECT sobre `sales_orders`, `sales_order_items`,
`sales_order_payments`, `siigo_customers`, `siigo_products` y `expenses`.
No cambia Carolina, sus usuarios, las tablas, los permisos ni las políticas RLS.
La clave permanece en el servidor; el endpoint comprueba `requireSuperAdmin`
antes de consultar cualquier dato consolidado.

Las consultas usan páginas de 500 registros y fechas explícitas. Los conceptos
y los pagos de cada pedido se consultan por separado para evitar truncamientos
de relaciones anidadas. Cada lectura tiene un tiempo máximo compartido de 20 s.
Si Carolina falla o falta configuración, la página identifica el resultado
como **Reporte parcial: solo talleres**; nunca representa esa ausencia como cero.

## Criterios del cálculo

- Las ventas del consolidado se calculan **antes de IVA** para ambos orígenes.
  El reporte individual del taller conserva su criterio previo.
- CVR incluye órdenes aprobadas y posteriores por fecha de creación, con sus
  fechas en la zona horaria del taller. Carolina excluye borradores y cancelados
  por fecha del pedido, conservando sus fechas de calendario.
- Carolina usa los mismos criterios de su reporte: material = categoría
  `Compra de materiales` o gasto asociado a pago de compra; gastos convertidos
  a MXN con el tipo de cambio registrado; descuentos generales distribuidos
  entre los productos para reconciliar sus ventas con el pedido.
- Cobros y saldos conservan los importes registrados, incluido IVA. La cobertura
  se calcula sobre el total de órdenes con IVA, no sobre las ventas netas.
  Los saldos son vigentes, incluidos pagos posteriores al periodo; los cobros
  solo incluyen pagos recibidos dentro de las fechas seleccionadas.
- Se suman importes y luego se recalculan márgenes, porcentajes, variaciones y
  ticket promedio; no se promedian porcentajes de distintos negocios.
- Las operaciones internas **permanecen en los totales**, por decisión del usuario.
  Se muestran las ventas y cobros a clientes marcados como internos en Carolina,
  y los gastos de insumos de CVR cuyo proveedor registrado contiene
  `Carolina Pinturas`. No se supone que esos importes deban coincidir.
- Los clientes y conceptos de diferentes bases permanecen identificados por
  negocio; no se deduplican por nombre o por identificadores coincidentes.
- Los costos y gastos representan los egresos registrados en ambos sistemas.
  Esta integración no incorpora un cálculo de costo de inventario consumido.

## Verificación

Las pruebas en `tests/consolidated-report.test.ts` cubren la suma, la base de IVA,
los descuentos, saldos, operaciones internas, identificadores de distintos
orígenes, periodos incompatibles y paginación superior al límite de 1,000 filas.
Se contrastaron los datos reales de septiembre de Carolina con su reporte:
ventas 312,938.50 MXN, material 173,974.19 MXN y operación 57,431.00 MXN.
