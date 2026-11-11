# Revisión de Supabase y egress — 11/11/2026

## Diagnóstico

El chat «Revisar y optimizar egreso de Supabase» identificó que el consumo dominante de la organización provenía de Carolina Pinturas y sus lecturas de PostgreSQL a través del pooler. Esa medición pertenece al 09/11; no representa una medición actual de facturación de CVR.

En CVR se consultaron únicamente conteos y tamaños agregados, sin modificar datos. La base configurada en `DATABASE_URL` contenía 58 órdenes, 20 clientes, 52 vehículos, 53 pagos y 142 gastos. El volumen actual es pequeño, pero había muchas relaciones completas descargadas para mostrar unos pocos campos.

La aplicación ya reutiliza un cliente Prisma por proceso, limita su pool a una conexión y mantiene las respuestas API privadas con `no-store`. Las lecturas de Carolina para reportes ya tienen proyecciones explícitas, filtros de fecha y paginación, sin descargar snapshots completos de productos. No se encontraron suscripciones Realtime ni polling periódico de datos en el código revisado.

## Optimizaciones aplicadas

- Proyección compartida `orderListSelect`: trae sólo los campos que usa el resumen de orden, incluyendo únicamente el importe MXN de cada pago y los campos necesarios de cliente, vehículo, taller y responsable. Se usa en órdenes, historiales de clientes/vehículos y dashboard.
- El dashboard selecciona sólo los campos necesarios de conceptos, gastos, cobros y talleres. Para calcular cuentas por cobrar descarga únicamente el total y los importes pagados, conservando el cálculo por orden y el tratamiento de sobrepagos.
- Las rutas de reportes omiten las tres consultas operativas del dashboard que no utilizan: próximas entregas, conteo de órdenes abiertas y cuentas por cobrar de todo el historial. El reporte conserva su propio cálculo de saldos del periodo.
- Pagos, gastos, miembros y relaciones de clientes/vehículos seleccionan únicamente los campos que aparecen en sus respuestas.

Se conservaron los filtros por taller, asignación y rol, los contratos de las respuestas y los cálculos monetarios. No se cambiaron el esquema, índices, RLS, credenciales, datos ni permisos. No se agregó caché compartida de información financiera o de autorización.

## Medición con datos reales

Se ejecutaron las consultas anteriores (`HEAD` al iniciar la revisión) y las optimizadas mediante Prisma dentro de una transacción de **sólo lectura**. Se compararon las respuestas serializadas completas: 27 comparaciones entre administrador global, consulta global y administrador de un taller; además, 2 comparaciones del reporte financiero con el modo que omite consultas operativas. Todas coincidieron.

La tabla suma el tamaño JSON de los resultados de las consultas Prisma de cada ruta entre los contextos comprobados. No mide el tamaño de la respuesta HTTP de la ruta —que se conserva— ni los bytes del protocolo PostgreSQL o el egress facturado.

| Lectura | Antes (bytes JSON) | Después | Reducción |
| --- | ---: | ---: | ---: |
| Órdenes | 343,995 | 78,724 | 77.1% |
| Pagos | 303,767 | 64,392 | 78.8% |
| Gastos | 718,858 | 166,798 | 76.8% |
| Clientes | 55,089 | 33,233 | 39.7% |
| Vehículos | 156,517 | 55,588 | 64.5% |
| Usuarios | 7,819 | 3,033 | 61.2% |
| Miembros de taller | 853 | 202 | 76.3% |
| Detalle de cliente | 12,205 | 4,920 | 59.7% |
| Detalle de vehículo | 5,467 | 2,489 | 54.5% |
| Dashboard completo | 256,248 | 39,958 | 84.4% |

La medición del dashboard corresponde al modo completo; omitir sus consultas operativas en reportes supone una reducción adicional que no está cuantificada en esta tabla.

Validaciones locales: 86 pruebas existentes, revisión de tipos y ESLint. La suite se ejecutó con `node --import tsx --test tests/*.test.ts` para evitar la restricción del sandbox sobre el socket IPC del lanzador de `tsx`.

## Alcance y seguimiento

Los cambios están en el código local y requieren despliegue para afectar producción. Esta revisión no consultó el panel de facturación actual, por lo que no permite atribuir un consumo mensual actual a CVR ni prometer permanecer dentro de la cuota.

Los listados conservan la carga completa porque sus búsquedas y filtros actuales funcionan en el cliente. Con este volumen, reducir las columnas elimina la sobrelectura más evidente sin cambiar la experiencia. Si crecen significativamente, el siguiente paso es paginar y filtrar en servidor junto con los cambios correspondientes de interfaz; limitar las filas de la API por sí solo ocultaría registros.

Tras desplegar, comparar 48–72 horas de uso normal por proyecto y origen de tráfico (Database/Shared Pooler, REST, Auth, Storage). La reducción de JSON medida aquí no equivale directamente a una reducción porcentual de la factura total.

Referencias: [Supabase: egress y cuotas](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [Prisma: selección de campos](https://www.prisma.io/docs/orm/prisma-client/queries/select-fields).
