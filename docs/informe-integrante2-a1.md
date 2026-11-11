# A1 · Aporte al informe grupal de Edwin Saucedo

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

## Texto para incorporar

### 1. Matriz de trazabilidad

**Archivos y montaje (I2).** `tests/routes/categoriesIntegrante2.test.js` usa Supertest con la app real en `/categories` y SQLite en memoria, con tablas recreadas antes de cada caso. `tests/services/pricingCombinatorio.integrante2.test.js` usa Jest sobre el cálculo puro del checkout. Con Node v22.23.4 se ejecutaron ambos con `npx jest tests/routes/categoriesIntegrante2.test.js tests/services/pricingCombinatorio.integrante2.test.js --runInBand`. Pasan 38 de 38 casos (6 válidos, 7 de límite y 25 inválidos), sin errores de entorno ni hallazgos nuevos.

| ID | Regla | Nombre exacto del it | Clase | Oráculo (efecto comprobado) | Recurso(s) | ¿Neg.? | IA prop./cons. | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T05 | Alta de nombre nuevo | T05 nombre nuevo y persistencia — válida | Válida | 201, ID devuelto y única fila Instrumentos con ese ID | Categorías | No | Sí / sí | Pasa |
| T06 | Nombre único | T06 nombre único y rechazo sin inserción — inválida | Inválida | 400 con error y solo la fila original Instrumentos | Categorías | Sí | Sí / sí | Pasa |
| T07 | Listado completo | T07 listar todas las categorías sin alterarlas — válida | Válida | 200, conjunto exacto de ID/nombre de Instrumentos, Libros y Ropa, conservado en BD | Categorías | No | Sí / sí | Pasa |
| T08 | Listado vacío | T08 lista vacía sin crear registros — límite | Límite | 200 con `[]` y cero filas en BD | Categorías | No | Sí / sí | Pasa |

**Reglas y conteo (I2).** Unicidad en `models/category.js` y contrato HTTP en `routes/categories.js`. Las reglas del cálculo y sus errores provienen del README. Negativas I2: T06, C10 y N01–N23. C01–C09 comprueban montos en unidades y centavos, impuesto después del descuento y envío. A01 comprueba reparto y redondeo. C10 y N01–N23 comprueban error e inmutabilidad de entradas. Nombres exactos, oráculos por ID y resultados en la [matriz ampliada](aporte-integrante2.md).

### 2. Recorte combinatorio

**Operación elegida.** `POST /cart/:cartId/checkout`, evaluada mediante su función de cálculo `priceCheckout`. P1 distingue cupón ausente, porcentual y fijo. P2 compara el subtotal S con `minSubtotal` M (<, =, >). P3 compara la base B = S − descuento con 50 (<, =, >). El envío cuesta 5 si B < 50 y 0 desde B = 50.

El espacio inicial es 3 × 3 × 3 = 27. P2 no aplica sin cupón ni con cupón fijo, lo que da seis clases para esos tipos. Para percent hay seis clases aceptadas (S ≥ M) y una rechazada (S < M), sin base efectiva. Quedan **13 clases factibles**. Se eligen diez para comprobar igualdad al mínimo, las tres clases de envío con cada tipo y rechazo por mínimo insuficiente.

| P1 | P2 | S en unidades | Cupón (valor; mínimo) | B en unidades | ID en orden |
| --- | --- | --- | --- | --- | --- |
| Ausente | No aplica | 40 / 50 / 60 | — | 40 / 50 / 60 | C01 / C02 / C03 |
| Percent | S = M | 50 / 62,50 / 75 | 0,2; M = S | 40 / 50 / 60 | C04 / C05 / C06 |
| Fixed | No aplica | 50 / 60 / 70 | 10; — | 40 / 50 / 60 | C07 / C08 / C09 |
| Percent | S < M | 49 | 0,2; 50 | No aplica; rechazo | C10 |

Cada ID corresponde a una prueba independiente. Se excluyen las tres clases percent con S > M (B <, = y > 50). Las tres clases de envío se ejercitan con percent en la igualdad, que es el límite más sensible. Queda pendiente el comportamiento particular de S > M y el recorte carece de cobertura completa por pares.

### 3. Hueco de cobertura

En `services/checkoutService.js:98–99`, la rama de inventario insuficiente registra cero ejecuciones. Caso propuesto: dos líneas de cantidad 2, con inventarios 5 y 1, ordenadas para intentar primero la línea con stock. El checkout debe responder 400, mantener ambos inventarios y el estado del carrito, y dejar cero pedidos y líneas de pedido. Un rollback defectuoso puede descontar stock sin crear pedido. Se deja el caso para A3.

**Medición integrada.** `npm run test:coverage -- --runInBand`, Node v22.23.4, `origin/main` en `1054538`. Ramas: `cartService.js` 61,11 % (11/18), `pricing.js` 100 % (62/62), `checkoutService.js` 0 % (0/32). Agregado de los tres: **65,18 % (73/112)**. Categorías carece de servicio y su router no tiene ramas instrumentadas. El piso del 70 % sigue pendiente. [Reporte adjunto](evidencias-integrante2/cobertura-integrada-node22.txt).

### 5. Registro de IA

**Edwin Saucedo — Codex (OpenAI).** Propuso las aserciones de persistencia y estado final en T05–T08, los montos esperados de C01–C09, el rechazo C10, el reparto A01 y las validaciones N01–N23. Se conservaron los casos y oráculos. Se modificó la matriz de 27 etiquetas para representar condiciones no aplicables y el rechazo sin base. Se descartaron el orden obligatorio de GET, un mensaje literal de unicidad y la afirmación de cobertura completa por pares. La revisión humana queda pendiente.

## Notas de revisión para el coordinador

- **Página 1.** Sustituir el marcador de archivos por los dos de I2 y mantener el archivo de I1 ya identificado. Sustituir el montaje y comando de I2 y agregar T05–T08 en la matriz.
- **Página 2.** Insertar reglas, IDs negativos y resultado de entorno de I2. La sección de datos creados por API y oráculos del README describe I3. Identificarla como tal para distinguir las pruebas de categorías, que siembran datos por modelo y comprueban el contrato de ruta y modelo.
- **Página 3.** Completar el marcador de hallazgos de I2 con «ninguno». Sustituir las plantillas completas de recorte y hueco. La operación combinatoria es checkout, aunque el marcador sugiera categorías. La sección 4 ya está desarrollada por Bryan.
- **Página 4.** Los dos marcadores de IA compartidos pueden reemplazarse por el bloque de Edwin, ya que Lilineth tiene su propio registro. Reemplazar los campos de cobertura por la medición integrada de la sección 3 y enlazar el reporte. Conservar la distinción de H3 como regla de redondeo inferida para GET.
- **Discrepancia de I1.** El PDF atribuye seis casos a `cartRules.test.js`. En `1054538` hay cinco cuerpos de prueba. I1-4 (cantidad 6 en un solo POST) no está y no debe reportarse como aprobado para esa revisión. Además, la línea 1 empieza con `npm/**` y genera `ReferenceError: npm is not defined` al cargar la suite. Es un error del archivo de pruebas, separado de los fallos de reglas y de SQLite. El equipo debe conciliar la revisión de entrega y repetir cobertura tras resolverlo.
- **Cifras de ejecución.** Con los archivos de I1, I2 e I3 presentes en la revisión integrada, Jest reportó 9 suites (7 aprobadas y 2 fallidas). De los 64 casos ejecutados, 61 pasaron y 3 fallaron por H1–H3, y 18 de los aprobados son cuerpos vacíos heredados. Excluyéndolos quedan 46 casos funcionales ejecutados (43 aprobados y 3 fallidos). I1 queda fuera del conteo ejecutado por el error de carga. [Ejecución aislada de I2 en Node 22](evidencias-integrante2/pruebas-propias-node22.txt).
- **Extensión.** El PDF de referencia tiene cuatro páginas. Para conservar el límite, enlazar la matriz ampliada y el reporte de cobertura, usar las cuatro filas principales de I2 en el cuerpo y agrupar las tuplas según la tabla compacta. Verificar el total de páginas al exportar el documento editable.
