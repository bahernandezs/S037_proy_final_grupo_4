/**
 * PRUEBA DÉBIL (contraejemplo de la métrica). NO forma parte de la suite.
 *
 * El nombre termina en `.weak.js`, por lo que NO coincide con el patrón de Jest
 * por defecto y `npm test` no la ejecuta. Se corre a mano; ver docs/contraejemplo.md.
 *
 * Ejecuta la línea de fusión de cantidades de CartService.addItemToCart
 * (`existingItem.quantity + quantity`), pero solo mira el código HTTP y la
 * forma del cuerpo, no el efecto (la cantidad resultante).
 */
const request = require('supertest');
const { app } = require('../../app');
const { initTestDb, closeTestDb } = require('../../tests/setup/testDb');

describe('DÉBIL: agregar dos veces el mismo producto', () => {
  beforeEach(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('responde 201 en ambos POST y el cuerpo trae quantity', async () => {
    const category = (await request(app).post('/categories').send({ name: 'Electronics' })).body;
    const product = (await request(app).post('/products').send({
      name: 'Laptop', price: 100, inventory: 5, taxRate: 0.25, categoryId: category.id,
    })).body;
    const cart = (await request(app).post('/cart/1')).body;

    const first = await request(app).post(`/cart/${cart.id}/items`).send({ productId: product.id, quantity: 3 });
    const second = await request(app).post(`/cart/${cart.id}/items`).send({ productId: product.id, quantity: 2 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toHaveProperty('quantity'); // solo la forma, no el valor
  });
});
