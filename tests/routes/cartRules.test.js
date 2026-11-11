npm/**
 * A1 - Integrante 1: pruebas del carrito.
 *
 * Montaje del arnés: se crea una app Express aislada y se monta el router del
 * carrito bajo /api/carts. TODAS las URLs de este archivo usan ese prefijo.
 * (El servidor real de `npm start` monta /cart; no se mezclan.)
 *
 * Reglas (README, "Alta de un ítem" e "Ítem y carrito de la URL"):
 *   R-CART-01  Se agrega la cantidad solo si el producto existe y quantity es un
 *              entero mayor que cero que no supera el inventario.
 *   R-CART-02  Si el producto ya está en el carrito, la cantidad nueva es la suma
 *              y esa suma tampoco puede superar el inventario.
 *   R-CART-03  El producto agregado debe existir (cruce carrito + catálogo).
 *   R-CART-04  El ítem de PUT/DELETE pertenece al carrito indicado en la URL.
 *
 * Datos fijos: producto price 100, inventory 5, taxRate 0.07.
 */
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const cartRouter = require('../../routes/cart');
const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');
const Category = require('../../models/category');

const app = express();
app.use(bodyParser.json());
app.use('/api/carts', cartRouter);

describe('Carrito - reglas de alta y pertenencia (Integrante 1)', () => {
  let product;
  let cart;

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await initTestDb(); // sync({ force: true }): cada caso parte de una BD vacía
    const category = await Category.create({ name: 'Electronica' });
    product = await Product.create({
      name: 'Teclado',
      price: 100,
      inventory: 5,
      taxRate: 0.07,
      categoryId: category.id,
    });
    cart = await Cart.create({ userId: 1 });
  });

  const addItem = (cartId, body) =>
    request(app).post(`/api/carts/${cartId}/items`).send(body);

  // R-CART-01 / clase: inválida (cero, que además es el límite inferior excluido)
  it('R-CART-01 [inválida]: quantity 0 en producto con inventory 5 → error y el carrito no gana ninguna línea', async () => {
    const res = await addItem(cart.id, { productId: product.id, quantity: 0 });

    // Oráculo: la regla dice "no se agrega" → error 4xx y ningún ítem guardado
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(await CartItem.count({ where: { cartId: cart.id } })).toBe(0);

    const consulta = await request(app).get(`/api/carts/${cart.id}/items`);
    expect(consulta.body.items).toEqual([]);
    expect(consulta.body.summary.total).toBe(0);
  });

  // R-CART-01 / clase: inválida (negativo)
  it('R-CART-01 [inválida]: quantity -3 en producto con inventory 5 → error y el carrito no gana ninguna línea', async () => {
    const res = await addItem(cart.id, { productId: product.id, quantity: -3 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(await CartItem.count({ where: { cartId: cart.id } })).toBe(0);

    const consulta = await request(app).get(`/api/carts/${cart.id}/items`);
    expect(consulta.body.items).toEqual([]);
    expect(consulta.body.summary.total).toBe(0);
  });

  // R-CART-01 + R-CART-02 / clase: límite (inventario exacto, y exacto + 1 por suma)
  it('R-CART-02 [límite]: quantity 5 (= inventory) se acepta; sumar 1 más (6 > 5) se rechaza y queda en 5', async () => {
    const ok = await addItem(cart.id, { productId: product.id, quantity: 5 });

    // Oráculo del caso válido: efecto, no solo el 201
    expect(ok.status).toBe(201);
    expect(ok.body.quantity).toBe(5);
    const consulta = await request(app).get(`/api/carts/${cart.id}/items`);
    expect(consulta.body.items).toHaveLength(1);
    expect(consulta.body.items[0].quantity).toBe(5);
    expect(consulta.body.summary.subtotal).toBe(500);
    expect(consulta.body.summary.totalTax).toBeCloseTo(35, 2);
    expect(consulta.body.summary.total).toBeCloseTo(535, 2);

    // Un paso más allá del límite: la suma 5 + 1 = 6 supera el inventario
    const sobra = await addItem(cart.id, { productId: product.id, quantity: 1 });
    expect(sobra.status).toBe(400);
    expect(sobra.body.error).toBe('Not enough inventory available');

    const item = await CartItem.findOne({ where: { cartId: cart.id } });
    expect(item.quantity).toBe(5); // la cantidad guardada no cambió
    const prod = await Product.findByPk(product.id);
    expect(prod.inventory).toBe(5); // agregar al carrito no descuenta inventario
  });

  // R-CART-03 / clase: inválida, cruce carrito + catálogo
  it('R-CART-03 [inválida, cruce]: productId 99999 inexistente con quantity 1 → error y el carrito no gana ninguna línea', async () => {
    const res = await addItem(cart.id, { productId: 99999, quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Product not found');
    expect(await CartItem.count({ where: { cartId: cart.id } })).toBe(0);
    const prod = await Product.findByPk(product.id);
    expect(prod.inventory).toBe(5); // el catálogo no se tocó
  });

  // EXTRA (opcional): R-CART-04 / clase: inválida. Descártenla si prefieren quedarse con 4.
  it('R-CART-04 [inválida, cruce de carritos]: PUT al ítem del carrito A usando la URL del carrito B → se rechaza y la cantidad del ítem sigue en 2', async () => {
    const otroCarrito = await Cart.create({ userId: 2 });
    const item = await CartItem.create({
      cartId: cart.id,
      productId: product.id,
      quantity: 2,
    });

    const res = await request(app)
      .put(`/api/carts/${otroCarrito.id}/items/${item.id}`)
      .send({ quantity: 4 });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const guardado = await CartItem.findByPk(item.id);
    expect(guardado.quantity).toBe(2);
    expect(guardado.cartId).toBe(cart.id);
  });
});
