# Aporte individual — integrante 2, A1 Suite automatizada

## Actualización verificada del 11 de noviembre de 2026

Esta actualización sustituye las cifras y pendientes de cobertura de las mediciones anteriores conservadas abajo. Se incorporaron siete pruebas HTTP propias en `tests/routes/checkoutIntegrante2.test.js`. La ejecución y repetición con Node v22.23.4 aprueban las **45 pruebas propias**, distribuidas en 9 válidas, 8 de límite y 28 inválidas.

| ID | Regla y clase | Oráculo | Resultado |
| --- | --- | --- | --- |
| Q01 | Cobro sin cupón, válida | 2×30, impuesto 6, total 66; stock 5→3; un pedido y una línea; estado checked_out | Pasa |
| Q02 | Cobro percent 0.1, mínimo 50, válida | Subtotal 60, descuento 6, base 54, impuesto 5.4, total 59.4; persistencia y stock | Pasa |
| Q03 | Cobro fixed 10, válida | Subtotal 60, descuento 10, base 50, impuesto 5, total 55; persistencia y stock | Pasa |
| Q04 | Stock insuficiente, inválida | Dos líneas de cantidad 2, stocks 5 y 1; 400; stocks intactos; carrito open; cero pedidos y líneas | Pasa |
| Q05 | ID abc, inválida | 400, Cart ID should be a number; cero pedidos y líneas | Pasa |
| Q06 | ID 99999, inválida | 404, Cart doesn't exist; cero pedidos y líneas | Pasa |
| Q07 | Carrito vacío, límite | Checkout 400 Cart is empty; GET pedido 404 Order not found; carrito open y cero pedidos/líneas | Pasa |

Q01–Q03 también cambian el precio a 99 después del cobro y comprueban que GET devuelve el pedido original completo. Un segundo cobro debe rechazarse sin descontar stock ni duplicar registros. Los nombres exactos de los siete `it` constan en [el log individual](evidencias-integrante2/checkout-node22.txt).

La corrección autorizada de I1 toma el archivo de `origin/main` 1054538 y elimina únicamente el prefijo accidental `npm` de su primera línea. Los cinco casos de ese archivo ya se ejecutan. El sexto caso descrito en el PDF continúa pendiente de conciliación con Lilineth.

| Servicio | Ramas cubiertas / total | Cobertura |
| --- | --- | --- |
| cartService.js | 13/18 | 72.22% |
| checkoutService.js | 29/32 | 90.62% |
| pricing.js | 62/62 | 100% |
| Agregado carrito + checkout + pricing | 104/112 | **92.86%** |
| Todos los servicios, incluido productService | 108/138 | 78.26% |

Se cumple el 70% tanto agregado como individualmente en los tres servicios del alcance. ProductService conserva 15.38% y su recurso permanece fuera del alcance principal.

La suite completa con cobertura registra **76 casos, 70 aprobados y 6 fallidos**, en 10 suites (8 aprobadas, 2 fallidas). Los 18 cuerpos vacíos heredados se excluyen del conteo funcional, que queda en 58 casos, 52 aprobados y 6 fallidos. Los fallos son los tres conocidos de I3 y los de I1 para cantidad 0, cantidad −3 y pertenencia de carrito. Se conserva la cautela sobre el contrato de redondeo de H3. [Reporte final](evidencias-integrante2/cobertura-final-node22.txt).

**Hueco actualizado.** Q04 cubre ahora la condición de stock insuficiente en checkoutService.js:98–99 y comprueba estado final atómico. No instrumenta el orden de lectura, por lo que no demuestra que se intentara guardar la primera línea antes del rechazo. Permanece sin cubrir checkoutService.js:150–151, brazo verdadero de `if (!cart)` en `getOrder`. Entrada propuesta para A3: GET /cart/99999/order, respuesta 404 Cart doesn't exist y ausencia de pedidos. Su riesgo es responder incorrectamente al consultar un carrito inexistente. La prueba POST Q06 no ejecuta ese camino de GET. La decisión es dejar explícitamente esa rama para A3.

**Registro de IA adicional.** Codex propuso y conservó Q01–Q07, con oráculos monetarios del README, consultas de persistencia, pedido congelado y estado final tras rechazo. Se actualizó la decisión del hueco anterior para cubrir inventario insuficiente en A1. La revisión humana sigue pendiente.

Comandos ejecutados con Node v22.23.4:
- `npx jest tests/routes/checkoutIntegrante2.test.js --runInBand` — 7/7.
- `npm run test:coverage -- --runInBand` — 70 aprobadas, 6 fallidas.
- `npx jest tests/routes/categoriesIntegrante2.test.js tests/routes/checkoutIntegrante2.test.js tests/services/pricingCombinatorio.integrante2.test.js --runInBand` — repetición 45/45.


## Antecedentes de la medición anterior

Fecha: 2026-11-10. Rama: `test/es-pruebas-categorias-combinatorio`.
Alcance: categorías y cálculo puro del checkout del carrito. Productos solo aparecen en el contrato de las líneas de cálculo; no se añaden pruebas del recurso productos. No se modifican producción, pruebas ajenas, README ni informe grupal.

## A. Casos principales

La especificación de categorías es limitada en el README: las reglas de nombre obligatorio y único provienen de `models/category.js` (`allowNull: false`, `unique: true`). Los contratos HTTP provienen de `routes/categories.js`: POST devuelve 201 o 400 con `error`; GET devuelve el arreglo completo. No se presupone un texto exacto de Sequelize ni orden de listado. Se mantienen los cuatro casos propuestos. T05 coincide temáticamente con el alta básica heredada, pero agrega un oráculo de persistencia; no duplica las integraciones del integrante 3.

Archivo de los cuatro casos: `tests/routes/categoriesIntegrante2.test.js`. Antes de **cada** caso se recrean todas las tablas con `initTestDb()`; al terminar se cierra la conexión. Jest fija `NODE_ENV=test` y el modelo utiliza SQLite `:memory:`. Se usa `app.js`, sin servidor externo ni mocks. Los comentarios identifican Arrange, Act y Assert.

| ID / clase | Regla y precondiciones | Entrada y pasos | Oráculo esperado | Nombre exacto del it | Resultado / hallazgo |
| --- | --- | --- | --- | --- | --- |
| T05 / válida | Nombre nuevo, BD vacía | POST `/categories` con `{name:"Instrumentos"}`; consultar modelo por ID | 201; nombre e ID numérico; exactamente una fila y nombre persistido | T05 nombre nuevo y persistencia — válida | Aprobada / ninguno |
| T06 / inválida | Nombre único; existe Instrumentos | Crear original por modelo; POST con el mismo nombre; consultar filas e ID original | 400; error textual no vacío; exactamente la fila original, mismo ID y nombre | T06 nombre único y rechazo sin inserción — inválida | Aprobada / ninguno |
| T07 / válida | Listado completo; Instrumentos, Libros y Ropa conocidos | Preparar tres categorías; GET `/categories`; consultar modelo | 200; conjunto exacto de ID/nombre, sin extras ni omisiones; BD conserva el mismo conjunto | T07 listar todas las categorías sin alterarlas — válida | Aprobada / ninguno |
| T08 / límite | Cardinalidad cero; BD vacía | Confirmar cero filas; GET `/categories`; volver a contar | 200; `[]`; cero filas posteriores | T08 lista vacía sin crear registros — límite | Aprobada / ninguno |

## B. Matriz resumida de trazabilidad

Los nombres parametrizados se expanden en pruebas Jest independientes. C01–C09 usan el nombre exacto `ID descuento, impuesto posterior y umbral de envío — CLASE`, reemplazando ID y CLASE por las celdas siguientes. N01–N23 usan `ID validación de entrada de checkout — inválida`. Los nombres expandidos constan en `evidencias-integrante2/pricing.txt`. Todos los casos de cálculo están en `tests/services/pricingCombinatorio.integrante2.test.js`.

| ID | Regla | Nombre del it | Clase | Oráculo | Resultado |
| --- | --- | --- | --- | --- | --- |
| T05 | Alta persistida | T05 nombre nuevo y persistencia — válida | válida | 201 y fila exacta | Aprobada |
| T06 | Unicidad | T06 nombre único y rechazo sin inserción — inválida | inválida | 400, solo original | Aprobada |
| T07 | Listado completo | T07 listar todas las categorías sin alterarlas — válida | válida | conjunto exacto y BD intacta | Aprobada |
| T08 | Listado vacío | T08 lista vacía sin crear registros — límite | límite | 200, [], cero filas | Aprobada |
| C01 | Descuento → impuesto → envío | C01 descuento, impuesto posterior y umbral de envío — válida | válida | S,D,B,I,E,T = 40, 0, 40, 4, 5, 49; línea, centavos y entrada intacta | Aprobada |
| C02 | Descuento → impuesto → envío | C02 descuento, impuesto posterior y umbral de envío — límite | límite | S,D,B,I,E,T = 50, 0, 50, 5, 0, 55; línea, centavos y entrada intacta | Aprobada |
| C03 | Descuento → impuesto → envío | C03 descuento, impuesto posterior y umbral de envío — válida | válida | S,D,B,I,E,T = 60, 0, 60, 6, 0, 66; línea, centavos y entrada intacta | Aprobada |
| C04 | Descuento → impuesto → envío | C04 descuento, impuesto posterior y umbral de envío — límite | límite | S,D,B,I,E,T = 50, 10, 40, 4, 5, 49; línea, centavos y entrada intacta | Aprobada |
| C05 | Descuento → impuesto → envío | C05 descuento, impuesto posterior y umbral de envío — límite | límite | S,D,B,I,E,T = 62.50, 12.50, 50, 5, 0, 55; línea, centavos y entrada intacta | Aprobada |
| C06 | Descuento → impuesto → envío | C06 descuento, impuesto posterior y umbral de envío — límite | límite | S,D,B,I,E,T = 75, 15, 60, 6, 0, 66; línea, centavos y entrada intacta | Aprobada |
| C07 | Descuento → impuesto → envío | C07 descuento, impuesto posterior y umbral de envío — válida | válida | S,D,B,I,E,T = 50, 10, 40, 4, 5, 49; línea, centavos y entrada intacta | Aprobada |
| C08 | Descuento → impuesto → envío | C08 descuento, impuesto posterior y umbral de envío — límite | límite | S,D,B,I,E,T = 60, 10, 50, 5, 0, 55; línea, centavos y entrada intacta | Aprobada |
| C09 | Descuento → impuesto → envío | C09 descuento, impuesto posterior y umbral de envío — válida | válida | S,D,B,I,E,T = 70, 10, 60, 6, 0, 66; línea, centavos y entrada intacta | Aprobada |
| C10 | Mínimo obligatorio | C10 mínimo porcentual incumplido impide calcular cobro — inválida | inválida | Excepción Coupon minimum not met; entrada intacta | Aprobada |
| A01 | Reparto y redondeo | A01 reparto proporcional, resto y redondeo al centavo — límite | límite | Descuentos [2,1] centavos; impuestos [0,0]; total 5.07 | Aprobada |
| N01 | Rechazar ítems [] | N01 validación de entrada de checkout — inválida | inválida | Excepción `Cart is empty` y entradas intactas | Aprobada |
| N02 | Rechazar ítems null | N02 validación de entrada de checkout — inválida | inválida | Excepción `Cart is empty` y entradas intactas | Aprobada |
| N03 | Rechazar línea null | N03 validación de entrada de checkout — inválida | inválida | Excepción `Quantity must be a positive integer` y entradas intactas | Aprobada |
| N04 | Rechazar cantidad 1.5 | N04 validación de entrada de checkout — inválida | inválida | Excepción `Quantity must be a positive integer` y entradas intactas | Aprobada |
| N05 | Rechazar cantidad 0 | N05 validación de entrada de checkout — inválida | inválida | Excepción `Quantity must be a positive integer` y entradas intactas | Aprobada |
| N06 | Rechazar precio -1 | N06 validación de entrada de checkout — inválida | inválida | Excepción `Price must be zero or greater` y entradas intactas | Aprobada |
| N07 | Rechazar precio Infinity | N07 validación de entrada de checkout — inválida | inválida | Excepción `Price must be zero or greater` y entradas intactas | Aprobada |
| N08 | Rechazar precio "60" | N08 validación de entrada de checkout — inválida | inválida | Excepción `Price must be zero or greater` y entradas intactas | Aprobada |
| N09 | Rechazar tasa -0.1 | N09 validación de entrada de checkout — inválida | inválida | Excepción `Tax rate must be between 0 and 1` y entradas intactas | Aprobada |
| N10 | Rechazar tasa 1.1 | N10 validación de entrada de checkout — inválida | inválida | Excepción `Tax rate must be between 0 and 1` y entradas intactas | Aprobada |
| N11 | Rechazar tasa NaN | N11 validación de entrada de checkout — inválida | inválida | Excepción `Tax rate must be between 0 and 1` y entradas intactas | Aprobada |
| N12 | Rechazar tasa "0.1" | N12 validación de entrada de checkout — inválida | inválida | Excepción `Tax rate must be between 0 and 1` y entradas intactas | Aprobada |
| N13 | Rechazar cupón [] | N13 validación de entrada de checkout — inválida | inválida | Excepción `Only one coupon is allowed` y entradas intactas | Aprobada |
| N14 | Rechazar cupón "fixed" | N14 validación de entrada de checkout — inválida | inválida | Excepción `Only one coupon is allowed` y entradas intactas | Aprobada |
| N15 | Rechazar tipo other, valor 1 | N15 validación de entrada de checkout — inválida | inválida | Excepción `Coupon type must be percent or fixed` y entradas intactas | Aprobada |
| N16 | Rechazar fixed valor 0 | N16 validación de entrada de checkout — inválida | inválida | Excepción `Coupon value must be greater than zero` y entradas intactas | Aprobada |
| N17 | Rechazar fixed valor Infinity | N17 validación de entrada de checkout — inválida | inválida | Excepción `Coupon value must be greater than zero` y entradas intactas | Aprobada |
| N18 | Rechazar fixed valor "1" | N18 validación de entrada de checkout — inválida | inválida | Excepción `Coupon value must be greater than zero` y entradas intactas | Aprobada |
| N19 | Rechazar percent 1.1, mínimo 0 | N19 validación de entrada de checkout — inválida | inválida | Excepción `Percent coupon cannot exceed 1` y entradas intactas | Aprobada |
| N20 | Rechazar percent 0.1 sin mínimo | N20 validación de entrada de checkout — inválida | inválida | Excepción `Percent coupon requires a minimum subtotal` y entradas intactas | Aprobada |
| N21 | Rechazar percent 0.1 mínimo -1 | N21 validación de entrada de checkout — inválida | inválida | Excepción `Percent coupon requires a minimum subtotal` y entradas intactas | Aprobada |
| N22 | Rechazar percent 0.1 mínimo Infinity | N22 validación de entrada de checkout — inválida | inválida | Excepción `Percent coupon requires a minimum subtotal` y entradas intactas | Aprobada |
| N23 | Rechazar fixed valor 60.01 > subtotal 60 | N23 validación de entrada de checkout — inválida | inválida | Excepción `Coupon exceeds subtotal` y entradas intactas | Aprobada |

N01–N23 emplean por defecto una línea con cantidad 1, precio 60 y tasa 0.1; la tabla indica la sustitución concreta. El cupón es ausente salvo indicación. N03 sustituye la línea completa; N01/N02 sustituyen la colección. Son validaciones unitarias del checkout, no duplican la integración de alta de ítems inválidos del compañero. En total: **38 pruebas propias, 6 válidas, 7 de límite y 25 inválidas; todas aprobadas**. Las clases se asignan por la condición principal: C04/C06 son límite por igualdad al mínimo aunque el envío no esté en el umbral.

## C. Análisis combinatorio

Operación: `POST /cart/:cartId/checkout`; se automatiza su núcleo puro `priceCheckout(items, coupon)`. No se afirma cobertura HTTP o transaccional del checkout por estas pruebas. Dominio monetario para esta matriz: valores exactos al centavo, cantidades y tasas válidas; las validaciones adicionales se separan de los tres factores.

Factores originales:

1. F1: tipo de cupón ∈ {ausente, percent, fixed}.
2. F2: relación del subtotal S con el mínimo M ∈ {S<M, S=M, S>M}.
3. F3: relación de la base efectiva B=S−D con 50 ∈ {B<50, B=50, B>50}.

Producto cartesiano ingenuo: **3×3×3=27**. No son 27 escenarios ejecutables distintos. Para ausente no existe M; para fixed la regla no consulta M: las 18 etiquetas de esos dos tipos son no aplicables en F2 y se normalizan a 6 escenarios (F2=NA). Para percent, S<M rechaza antes de obtener B: las 3 etiquetas de F3 son no aplicables y se normalizan a un escenario de rechazo (F3=NA). Quedan 6 escenarios percent aceptados (S=M o S>M, por las tres bases) y uno rechazado. **Espacio factible normalizado: 6+6+1=13 clases**, 12 aceptadas y una rechazada. Esta cuenta no cubre todo el dominio numérico ni todos los cupones malformados.

Las seis clases percent aceptadas son realizables: con porcentaje 0.2, S=50/62.50/75 produce B=40/50/60; M=S permite igualdad y M=0 permite S>M. Para ausencia se usa S=B=40/50/60; para fixed D=10 y S=50/60/70. El rechazo usa S=49, M=50. No se considera una base hipotética de una operación rechazada como salida observable.

| ID automatizado | F1 | F2 | F3 | S | Cupón (value; minSubtotal) | B / resultado |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | ausente | NA | <50 | 40 | ninguno | 40 |
| C02 | ausente | NA | =50 | 50 | ninguno | 50 |
| C03 | ausente | NA | >50 | 60 | ninguno | 60 |
| C04 | percent | =M | <50 | 50 | 0.2; 50 | 40 |
| C05 | percent | =M | =50 | 62.50 | 0.2; 62.50 | 50 |
| C06 | percent | =M | >50 | 75 | 0.2; 75 | 60 |
| C07 | fixed | NA | <50 | 50 | 10; NA | 40 |
| C08 | fixed | NA | =50 | 60 | 10; NA | 50 |
| C09 | fixed | NA | >50 | 70 | 10; NA | 60 |
| C10 | percent | <M | NA | 49 | 0.2; 50 | rechaza |

Selección: **10/13 clases normalizadas**, priorizando igualdad al mínimo, igualdad al umbral, tipos de cupón, impuesto posterior al descuento y rechazo. Cada fila tiene su prueba real independiente; C01–C09 comprueban todos los montos en unidades y centavos, la línea y ausencia de mutaciones. El impuesto es 10% de B; envío 5 para B<50, cero en otro caso. Por ejemplo C05: 62.50−12.50=50; impuesto 5; total 55. Los valores esperados fueron calculados a partir de las reglas, no capturados de la función. A01 añade riesgo de redondeo y reparto en dos líneas, fuera de la matriz.

**Combinaciones posibles excluidas:** (percent, S>M, B<50), (percent, S>M, B=50), (percent, S>M, B>50). Ejemplos: porcentaje 0.2, M=0, S=50/62.50/75. Se acepta esta reducción para A1 porque el camino de aceptación ya se ejerce en igualdad (el límite de mayor riesgo), y cada clase de envío se ejecuta con percent. Persiste el riesgo de un defecto específico de desigualdad estricta: se propone añadir estas tres clases en A3. No se declara pairwise completo: el par (percent, S>M) no está cubierto. La cobertura de ramas al 100% de pricing no equivale a cobertura completa de interacciones ni de valores: por ejemplo no se prueba aquí percent=1 o fixed=S.

## D. Hueco real de cobertura y requisito del 70%

Evidencia reproducible: `npm run test:coverage -- --runInBand`; reporte crudo en `evidencias-integrante2/cobertura.txt` y contadores Istanbul en `evidencias-integrante2/coverage-final.json`. No se cambia la configuración ni se excluyen archivos. Cobertura de ramas:

| Alcance | Alternativas ejecutadas / instrumentadas | Porcentaje |
| --- | --- | --- |
| services/pricing.js | 62/62 | 100% |
| services/cartService.js | 11/18 | 61.11% |
| services/checkoutService.js | 0/32 | 0% |
| Carrito + checkout + pricing | 73/112 | **65.18%** |
| services/productService.js (apoyo heredado, fuera del alcance principal) | 4/26 | 15.38% |
| Todos los servicios | 77/138 | 55.79% |
| Todos los archivos instrumentados | 80/148 | 54.05% |

El porcentaje agregado se calcula sumando contadores, no promediando porcentajes. Categorías no tiene servicio: su router tiene 100% de sentencias y no contiene ramas instrumentadas. El reporte de Jest muestra 100% en esa columna; no equivale a cubrir reglas adicionales de negocio.

**Hueco seleccionado:** `services/checkoutService.js:98–99`, condición `!product || product.inventory < item.quantity`. Ambos brazos de la condición y su camino de error tienen contador cero; el checkout completo no fue invocado. Entrada propuesta: carrito con dos productos, ambos con cantidad 2; primero con inventario 5, segundo con inventario 1 (preparar las líneas en BD para que el alta no bloquee el segundo). Ejecutar checkout: debe responder 400 `Not enough inventory available`, conservar stocks 5 y 1, carrito abierto y cero pedidos/líneas. Así se comprobaría rollback después de intentar descontar la primera línea, además del rechazo. El orden deberá controlarse en el arnés o verificarse para demostrar ese camino de rollback; el servicio no declara un orden de lectura de ítems.

Riesgo: stock parcialmente descontado, pérdida de inventario o pedido inconsistente. **Decisión: dejar explícitamente para A3**, con riesgo relevante pendiente; no afirmar que una prueba pura acredita atomicidad. Para A1 el coordinador debe resolver la falta de cobertura transaccional antes de declarar cumplido el 70% del alcance de servicios; este aporte por sí solo no lo cumple. Serían necesarias pruebas propias de checkout exitoso (sin cupón, percent y fixed), lectura del pedido congelado, segundo cobro, carrito vacío/inexistente y rollback por stock insuficiente. En cartService faltan rechazos por producto inexistente, stock inicial o acumulado insuficiente, actualización de ítem inexistente/sin stock y eliminación existente/inexistente. No se alteraron pruebas ajenas para elevar el indicador.

## E. Uso de IA

Codex apoyó la inspección, implementación y ejecución. Propuso y conservó T05–T08 con respuesta y persistencia; C01–C10 con oráculos monetarios manuales; A01 para reparto; N01–N23 para validación e inmutabilidad. Modificó la propuesta combinatoria inicial de 27 etiquetas para distinguir NA y rechazo antes de calcular la base. Se descartó exigir un texto concreto de error de unicidad (no especificado y dependiente de Sequelize), imponer orden a GET y afirmar pairwise completo. No hubo revisión humana durante esta ejecución; queda pendiente del integrante y coordinador. La conservación indicada es una decisión técnica de esta implementación, no una aprobación humana.

## F. Ejecución, evidencia y límites

Entorno observado: Node **v24.22.2**, npm **11.19.1**, distinto de v22.23.4 del compañero. SQLite cargó correctamente; no fue necesario instalar ni reconstruir dependencias. No se detectaron errores de entorno o de implementación de las pruebas propias en las ejecuciones.

| Comando | Resultado |
| --- | --- |
| `npx jest tests/routes/categoriesIntegrante2.test.js --runInBand` | 4/4 aprobadas |
| `npx jest tests/services/pricingCombinatorio.integrante2.test.js --runInBand` | 34/34 aprobadas |
| `npx jest tests/routes/categoriesIntegrante2.test.js tests/services/pricingCombinatorio.integrante2.test.js --runInBand` | Repetición: 38/38 aprobadas |
| `npm test -- --runInBand` | 8 suites: 7 aprobadas, 1 fallida; 64 casos Jest: 61 aprobados, 3 fallidos; salida 1 |
| `npm run test:coverage -- --runInBand` | Mismos 61 aprobados y 3 fallidos; genera cobertura; salida 1 |

Los logs individuales, de repetición y de suite/cobertura se conservan en `docs/evidencias-integrante2/`. `coverage/` es un artefacto local ignorado; se conserva una copia propia de sus contadores. Hay **18 it vacíos heredados** (7 productService, 5 cartService, 3 rutas products, 2 rutas cart, 1 rutas categories). Jest los cuenta como aprobados: se excluyen de la cuenta funcional. De 64 casos reportados, 46 tienen cuerpo funcional (43 aprobados, 3 fallidos); 38 pertenecen a este aporte. Ningún caso propio está vacío. La revisión de independencia se apoya en reinicialización por caso, ausencia de mocks y repetición exitosa de ambos archivos; la función pura usa datos nuevos por prueba y verifica no mutación.

Clasificación de las tres fallas preservadas:

- **H1, conocido / incumplimiento funcional:** cantidad −1 en alta devuelve 201 donde la regla exige 400. No se vuelve a implementar esa integración.
- **H2, conocido / incumplimiento funcional:** PUT cruzado devuelve 200 y modifica ítem ajeno. La ejecución confirma PUT; no se añadió un DELETE duplicado ni se afirma haberlo vuelto a ejecutar.
- **H3, conocido / diferencia numérica observada:** impuesto 14.000000000000002 frente a expectativa 14. El README especifica cálculo sin redondeo explícito en GET y redondeo en checkout. Se conserva el oráculo ajeno, pero su clasificación como incumplimiento requiere aclarar el contrato del GET; no se declara automáticamente error de prueba ni se traslada la regla del checkout al GET. El cálculo puro de checkout sí produce montos redondeados en los casos propios.

No se hallaron defectos nuevos en los casos propios. Los huecos de cobertura no prueban ausencia ni presencia de defectos. La rama remota `origin/test/bh-pruebas-integracion` estaba disponible: se consultó por diff y sus archivos de integración/aporte coinciden con el checkout local; no se hizo merge ni push. El cambio local previo en `package-lock.json` se conservó y quedó fuera del commit. No había AGENTS.md en la estructura inspeccionada. Se consultó la guía de runtime disponible; su herramienta de estado no está expuesta en esta sesión y no fue necesaria para ejecutar Jest localmente.

Pendientes del coordinador: revisar contenido y clasificación de H3; incorporar resultados funcionales sin contar cuerpos vacíos; cubrir servicios para alcanzar el 70% acordado; ejecutar en Node 22 de referencia; integrar las contribuciones sin sobrescribirlas y condensar el informe grupal a cuatro páginas. No se editó ese informe.
