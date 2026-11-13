# Auditoría de /finanzas

## Fuente y contrato

La pantalla lee `/api/finances`; la API consulta `public."Finance"` mediante Prisma, con `workspaceId` obtenido del usuario autenticado. No deriva movimientos de leads, propuestas o proyectos. El esquema no tiene entidad de factura, relación pago-factura ni fecha de cobro separada. `date` es la fecha contable del movimiento (guardada sin zona horaria); los límites se calculan en UTC para preservar los días registrados.

Cada fila representa una cuota/movimiento. "Facturado" en esta pantalla significa importe de las cuotas registradas, no emisión fiscal de comprobantes. No se infieren facturas completas desde anticipos ni se fusionan cuotas por descripción, importe o cliente. Los IDs repetidos se cuentan una sola vez en los cálculos; filas con distintos IDs se conservan.

## Errores anteriores

- La API sumaba solo `INCOME`, ignorando `ADVANCE` e `isPaid`.
- La UI calculaba cobrado restando pendientes de ingresos que no incluían pendientes.
- El neto incluía ingresos no cobrados y gastos no pagados.
- La proyección multiplicaba el acumulado anual por 12.
- Las tarjetas y movimientos consultaban el año actual; el gráfico usaba los últimos seis meses sin selector común.
- El fin de período excluía los últimos 999 milisegundos del día y dependía del huso del servidor.

## Criterios corregidos

| Indicador | Cálculo |
| --- | --- |
| Facturado | INCOME + ADVANCE + PENDING, una vez por ID |
| Cobrado | INCOME y ADVANCE con isPaid=true |
| Pendiente | PENDING, cualquiera sea isPaid, más INCOME/ADVANCE sin cobrar |
| Gastos de caja | EXPENSE con isPaid=true |
| Resultado neto de caja | Cobrado − gastos de caja |
| Margen de caja | Neto / cobrado; cero si no hubo cobros |
| Proyección del año actual | Cobrado del año seleccionado hasta hoy / número de mes actual × 12 |
| Años cerrados | Total cobrado real del año |
| Años futuros o sin base | Sin base |

Las monedas se muestran por separado, sin tipo de cambio implícito. Los cálculos suman centavos enteros. El período mensual o anual se aplica a tarjetas, gráfico, estado de cobros y movimientos. El gráfico mensual agrupa por día y el anual por mes. La proyección siempre usa el año completo seleccionado como base, independientemente del mes visible. Es una estimación lineal, no un compromiso de ingresos.

## Privacidad y preservación

Ocultar importes sustituye montos y porcentajes, retira el gráfico y su tooltip, oculta la barra proporcional y persiste la preferencia en localStorage. Para editar un movimiento se deben mostrar importes. La opción es privacidad visual; no restringe los datos disponibles para un usuario autenticado.

No hay migraciones, seeds ejecutados ni escrituras a movimientos reales. No se modificaron los handlers POST/PATCH/DELETE ni el formulario. PENDING conserva precedencia sobre isPaid en registros heredados, por lo que un segundo pago pendiente no se transforma en cobrado por la bandera heredada.

## Validación

- `npx tsx --test tests/finance.test.ts`: ocho casos iniciales para categorías, estado de cuotas, IDs, monedas, centavos, límites, proyección y conciliación de gráficos.
- `npm run build`: compilación completa con valores públicos ficticios de Supabase para el prerenderizado de login; sin conexión a base de datos.
- Chromium/Playwright: 320, 390, 768, 1024 y 1440 px sin desborde horizontal; navegación mensual/anual/año; ocultación y persistencia; cero errores de página.
- Vista previa aislada con fixtures ficticios, sin acceso a producción. El middleware y la API de fixtures de esa copia no forman parte de esta rama.
- La base real se inspeccionó únicamente mediante SELECT con el conector de Supabase. Los detalles financieros y capturas no se incluyen en este repositorio público.

## Límites del modelo actual

No se puede distinguir automáticamente una factura total de una cuota duplicada con distinto ID, ni reconstruir una fecha de cobro diferente de `date`. Se preservan las filas reales; para una conciliación contable por factura haría falta modelar esa relación explícitamente. No se presenta esta ausencia como una deduplicación verificada de operaciones comerciales.
