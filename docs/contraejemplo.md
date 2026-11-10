# Contraejemplo de la métrica: línea cubierta, falla no detectada

**Línea elegida:** [services/cartService.js:26](../services/cartService.js#L26), en `CartService.addItemToCart`

```js
const newQuantity = existingItem.quantity + quantity;   // regla R2: la cantidad nueva es la SUMA
```

**Mutación realista:** cambiar `+` por `-`. Sería un error de operador, muy típico en un refactor.

**Archivos:**

- Prueba débil: [docs/contraejemplo/addItemMerge.weak.js](contraejemplo/addItemMerge.weak.js). Fuera del patrón de Jest (termina en `.weak.js`), por lo que `npm test` no la ejecuta.
- Prueba fuerte: [tests/routes/cartIntegration.test.js](../tests/routes/cartIntegration.test.js), caso `R2 suma de cantidades — límite: 3 + 2 ...`.

## La prueba débil

Agrega 3 y luego 2 unidades del mismo producto (inventario 5). Solo comprueba el código HTTP y que el cuerpo tenga la propiedad `quantity`:

```js
expect(first.status).toBe(201);
expect(second.status).toBe(201);
expect(second.body).toHaveProperty('quantity');   // solo la forma, no el valor
```

## Paso 1. La prueba débil cubre la línea (código sin mutar)

```bash
npx jest --testMatch "**/docs/contraejemplo/*.weak.js" --coverage \
  --collectCoverageFrom=services/cartService.js --coverageReporters=json --coverageReporters=text
```

Salida resumida:

```
PASS docs/contraejemplo/addItemMerge.weak.js
  √ responde 201 en ambos POST y el cuerpo trae quantity
 cartService.js | 34.78 % Stmts | 27.77 % Branch | ... | Uncovered Line #s: 13,17,28,39-103
```

El detalle de `coverage-final.json` por línea (ejecuciones):

```
línea 25: 2    línea 26: 1    línea 27: 1    línea 28: 0 (rama de error, no se alcanza)    línea 30: 1
```

**La línea 26 está cubierta** (1 ejecución).

## Paso 2. Se aplica la mutación

```bash
sed -i 's/existingItem.quantity + quantity/existingItem.quantity - quantity/' services/cartService.js
git diff -- services/cartService.js
```

```diff
-      const newQuantity = existingItem.quantity + quantity;
+      const newQuantity = existingItem.quantity - quantity;
```

### Prueba débil con la mutación (misma cobertura)

```
√ responde 201 en ambos POST y el cuerpo trae quantity
Tests: 1 passed, 1 total
línea 26: ejecutada 1 vez/veces
```

**Sigue pasando y la línea sigue cubierta.** Con la mutación, 3 − 2 = 1, que no supera el inventario, así que el servidor responde 201 con `quantity: 1` y la prueba no mira ese valor.

### Prueba fuerte con la mutación

```bash
npx jest tests/routes/cartIntegration.test.js -t "R2 suma de cantidades"
```

```
× R2 suma de cantidades — límite: 3 + 2 iguala el inventario (5) y se fusiona en un solo ítem
    Expected: 5
    Received: 1
Tests: 1 failed
```

**La prueba fuerte detecta la mutación.** Su oráculo mira el efecto: `quantity` del cuerpo, la fila en BD y el `GET` del carrito.

## Paso 3. Reversión y comprobación

```bash
git checkout -- services/cartService.js
git status --short                                  # solo aparece docs/ (archivos nuevos)
git diff --stat -- services models routes app.js    # vacío: código de producción intacto
grep -n "existingItem.quantity" services/cartService.js
# 26:      const newQuantity = existingItem.quantity + quantity;
```

## Conclusión

La cobertura de líneas mide que la línea **se ejecutó**, no que su resultado **se verificó**. La prueba débil y la fuerte dan la misma cobertura sobre la línea 26, pero solo la fuerte comprueba el resultado que la regla promete.
