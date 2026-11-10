# Aporte del Integrante 3: pruebas de integración carrito ↔ productos ↔ categorías

**Archivo de pruebas:** [tests/routes/cartIntegration.test.js](../tests/routes/cartIntegration.test.js) (5 casos).
**Recursos:** carrito y categorías. La relación carrito → categoría es **indirecta**: `CartItem → Product → Category`. Los casos 1 a 3 y 5 cruzan carrito y producto, y el caso 4 cruza también la categoría.
**Fuente de las reglas:** sección "Reglas" del [README](../README.md) (R1 a R6). No se usó el comportamiento del código como oráculo. La única regla inferida es la de H3 y se marca como tal.

| Id | Regla (README) |
|---|---|
| R1 | `addItemToCart` exige producto existente y `quantity` entero > 0 que no supera el inventario |
| R2 | Si el producto ya está en el carrito, la cantidad nueva es la suma, y esa suma tampoco puede superar el inventario |
| R3 | El ítem de `PUT`/`DELETE /cart/:cartId/items/:itemId` pertenece al carrito de la URL |
| R4 | `GET /cart/:cartId/items`: subtotal de línea = cant × precio, impuesto = subtotal × `taxRate`, `summary` = suma de líneas, `total` = `subtotal + totalTax` |
| R5 | Texto de errores: `Quantity must be a positive integer`, `Not enough inventory available`, `Product not found` (400) |
| R6 | El inventario baja solo en el cobro, no al agregar |

## 1. Filas para la matriz de trazabilidad

| Regla | Nombre exacto del `it` | Oráculo | Clase | ¿IA? | Estado |
|---|---|---|---|---|---|
| R2 (+R6) | `R2 suma de cantidades — límite: 3 + 2 iguala el inventario (5) y se fusiona en un solo ítem` | Segundo POST 201 con `body.quantity` = 5; en BD **1** `CartItem` con quantity 5 (sin fantasmas); `GET` del carrito trae 1 línea, quantity 5, `summary.subtotal` 500; `Product.inventory` sigue en 5 | límite | Sí | Conservada |
| R1 + R5 | `R1 cantidad — inválida: quantity -1 con producto válido se rechaza y el carrito sigue vacío` | 400 y `body` = `{error: 'Quantity must be a positive integer'}`; BD con 0 `CartItem`; `GET` con `items: []` y `summary` en ceros; inventario sin cambio | inválida (negativa) | Sí | Conservada |
| R3 | `R3 pertenencia — inválida: PUT /cart/2/items/1 con un ítem del carrito 1 no modifica el ítem` | Estado ≥ 400 y `body` = `{error: <texto>}`; en BD el ítem sigue con quantity 2 y `cartId` 1; el `GET` del carrito 1 muestra quantity 2 y el del carrito 2 está vacío | inválida (negativa) | Sí | Conservada |
| R4 | `R4 total de consulta — válida: 2×100 (taxRate 0.25) en Electronics + 3×20 (taxRate 0) en Books` | `itemSubtotal` 200 y 60; `itemTax` 50 y 0; `summary` = `{260, 50, 310}`; cada línea trae `Product.categoryId` correcto; `GET /products/category/:id` devuelve el producto correspondiente; inventarios sin cambio | válida | Sí | Conservada |
| R4 (+ regla inferida de redondeo) | `R4 total de consulta — válida (decimal no binario): 2×100 con taxRate 0.07 da impuesto 14 y total 214` | `itemSubtotal` 200, `itemTax` 14, `summary.subtotal` 200, `totalTax` 14, `total` 214, todo con `toBe` estricto | válida | Sí | Añadida a petición tuya tras la propuesta original de 4 |

## 2. Hallazgos

Ejecución: `npx jest tests/routes/cartIntegration.test.js` da 2 pruebas en verde y **3 en rojo a propósito**. Ninguna aserción se modificó para que pasara.

- **H1 (R1/R5, caso 2):** `POST /cart/1/items` con `quantity: -1` responde **201** y guarda un ítem con quantity -1 (subtotal -100, total -125 en el `GET`). También acepta `quantity: 0` (comprobado con una sonda aparte, no está en la suite).
- **H2 (R3, caso 3):** `PUT /cart/2/items/1` responde **200** y deja el ítem del carrito 1 con quantity 4; la ruta ignora `:cartId`. `DELETE` por otro carrito responde 204 y borra el ítem ajeno (también con sonda, fuera de la suite).
- **H3 (R4, caso 5, regla inferida):** con `taxRate` 0.07, `itemTax` y `totalTax` salen `14.000000000000002` en vez de 14. `total` sale 214 exacto, porque la suma lo redondea por casualidad.

## 3. Resumen del contraejemplo

La línea [services/cartService.js:26](../services/cartService.js#L26) (`existingItem.quantity + quantity`) la ejecuta una prueba débil que solo espera 201 en ambos POST y que el cuerpo tenga `quantity`. Con cobertura, la línea queda ejecutada. Se mutó `+` por `-`: 3 − 2 da 1, que no supera el inventario, y la prueba débil **sigue pasando con la línea cubierta**. El caso fuerte 1 de esta suite falla (`Expected: 5, Received: 1`) porque su oráculo mira la cantidad resultante. La mutación se revirtió con `git checkout` y `git diff` quedó vacío en producción. La cobertura mide que la línea se ejecutó, no que se verificó su efecto. Detalle en [contraejemplo.md](contraejemplo.md).

## 4. Casos considerados y no automatizados

Aquí están los casos que quedaron fuera y si valía la pena hacerlos. Un `—` en "¿Observado?" significa que solo lo deduje al leer el código y no lo ejecuté.

| Caso | Regla | ¿Observado? | ¿Vale la pena? | Razón |
|---|---|---|---|---|
| `productId` 999999 inexistente, cantidad válida | R1/R5 `Product not found` | — | **Sí, con prioridad baja para mí** | Es el cruce clásico "id que no existe". Falta comprobar que no queda un `CartItem` huérfano. Debería pasar (`findByPk` devuelve null y lanza el error), así que aporta poco como hallazgo. Probablemente lo cubre Integrante 1 en carrito. Hay que confirmarlo con Integrante 1 para no duplicar. |
| `quantity` 0 (límite exacto de R1) | R1 | Sí (sonda: 201 y fila con 0) | **Sí** | Es el límite de la partición "entero > 0". El caso 2 cubre -1, pero 0 es el valor justo en la frontera y un cambio de `<` a `<=` en una futura validación lo separa de -1. Se deja para Integrante 1 o para A3. |
| `quantity` 6 con inventario 5 en un solo POST | R1 | — | **Sí** | Es el complemento del caso 1: el caso 1 prueba 5 (en el límite) y este prueba 6 (el primer valor sobre el límite). Riesgo bajo de fallo, pero cierra la frontera por ambos lados. |
| `quantity` 1.5 o `undefined` | R1 | — | **Sí, probablemente hallazgo** | Por el código, `undefined` cae al default 1 del modelo y se aceptaría. Es una hipótesis por lectura, no ejecutada. Es la misma familia de H1, por eso no se duplicó aquí. |
| `PUT` con `quantity` inválida (-1, 0) | R1 (por analogía) | — | **A3** | `updateCartItem` no valida cantidad positiva (lectura del código). El README formula R1 sobre `addItemToCart`, no sobre `PUT`, así que el oráculo sería una regla inferida. |
| `DELETE /cart/:otro/items/:id` | R3 | Sí (sonda: 204 y borra) | **Vale la pena, pero cubrirlo poco añade** | Tiene la misma causa raíz que H2 (`:cartId` se ignora), pero es otra ruta y otro método de servicio (`removeCartItem`). H2 ya lo señala en una línea. Se puede añadir en A3. |
| `POST` de ítem a un `cartId` inexistente | — | — | **No por ahora** | El README no dice qué debe pasar, así que no hay oráculo independiente. Si en A3 se acuerda una regla, vale la pena. |
| Descuento de inventario en el cobro (R6, lado cobro) | R6 | — | **Fuera de mi recorte** | Pertenece al checkout, que no está entre los recursos elegidos (carrito y categorías). |

### El caso 0.07 (incluido)

**Decisión:** se incluyó como 5.º caso, a petición tuya, en lugar de dejar solo el caso 4 con 0.25. Quedan los dos.

**Por qué:**
- Es el ejemplo canónico del propio README (2 × 100 con `taxRate` 0.07 → `tax` 14).
- El README advierte que `price` y `taxRate` son FLOAT y que un decimal no binario puede entrar al cálculo ya distinto.
- Con 0.25 (exacto en binario) esa advertencia no se prueba.
- La sonda mostró que el servidor devuelve `14.000000000000002`.
- Un monto con 15 decimales en una respuesta de dinero es el tipo de defecto que genera diferencias de centavos al sumar pedidos.

**Matiz:** la regla de `GET` no fija redondeo; el redondeo al centavo está especificado para el cobro. Por eso H3 se marca como **regla inferida**: el monto debe estar en centavos exactos. Es discutible como incumplimiento categórico.

**Lo que no se hizo:** se usó `toBe(14)` estricto y no `toBeCloseTo`, porque la tolerancia habría ocultado el hallazgo. Un caso con precio decimal (por ejemplo 19.99) tampoco se automatizó: tiene el mismo origen que H3 y queda para A3 si el equipo decide que `GET` debe redondear.

## 5. Registro de IA

**Qué propuse yo (Claude):**
- Las **4 pruebas** originales: reglas, clases, datos concretos y oráculos.
- Todas las aserciones de las 5 pruebas.
- El diseño del cruce carrito → producto → categoría, que es indirecto.
- Usar la app real, sin prefijo de arnés.
- Recrear la BD con `sync({force:true})` antes de cada prueba.
- El 5.º caso (0.07), ofrecido como opción.
- La tabla de casos fuera de alcance.

**Qué decidiste tú, tal cual:**
1. Diste el OK al plan de 4 casos sin pedir cambios a ninguna fila.
2. Pediste primero una justificación del 0.07 antes de decidir.
3. Tras la justificación, dijiste "sí te doy el okay, incluye el quinto caso".
4. Aceptaste que `productId` inexistente y `quantity` 0 quedaran fuera, con la condición de que el informe los registrara con un veredicto sobre si valen la pena. También pediste lo mismo para el 0.07.

**Resultado:**
- **Conservados:** los 4 casos y sus aserciones, sin modificaciones.
- **Descartados:** ninguno.
- **Añadido:** el caso 5.
- **Cambiado después de ver resultados:** nada en las aserciones. Solo añadí una línea de comentario con el hallazgo sobre cada caso que falla.

**Sondas de apoyo.** Antes de comprometerme con el 0.07 corrí una sonda aparte, fuera del repo, y otra para confirmar el efecto real de H1 y H2. No forman parte de la suite.

## 6. Ejecución de mis pruebas

| Dato | Valor |
|---|---|
| Solo mi archivo | `npx jest tests/routes/cartIntegration.test.js` |
| Prefijo de montaje | **Ninguno de arnés.** Se usa `app.js` con los prefijos reales: `/cart`, `/products`, `/categories` |
| Node | v22.23.4 (LTS) |
| SQLite | `sqlite3` ^5.1.7 (según `package.json`); el binding nativo cargó sin pasos extra en Windows 11 con `npm install` |
| BD | En memoria (`NODE_ENV=test` lo fija Jest); se recrea antes de cada prueba |
| Resultado esperado | **5 pruebas: 2 pasan, 3 fallan por diseño** (H1, H2, H3). `npm test` termina en rojo por esos hallazgos |

Si el binding nativo de `sqlite3` no carga en otra máquina, `npm rebuild sqlite3` es el paso habitual. No lo probé aquí porque no lo necesité. Un error así sería de **entorno** y no un fallo de las reglas.

Los 21 tests previos del repo en verde son casi todos stubs sin cuerpo. Su verde no indica cobertura real.
