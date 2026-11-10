/**
 * Pruebas de integración carrito ↔ productos ↔ categorías (Integrante 3).
 *
 * Montaje: se usa la aplicación REAL (`app.js`), con sus prefijos reales
 * /cart, /products y /categories. No hay prefijo de arnés (/api/...) en este archivo.
 *
 * BD: SQLite en memoria (NODE_ENV=test lo fija Jest). Antes de CADA prueba se
 * recrean las tablas con `sequelize.sync({ force: true })`, por lo que los ids
 * autoincrementales vuelven a 1 y cada caso es determinista.
 *
 * Oráculo: las reglas salen de la sección "Reglas" del README, no del código.
 * Cada prueba comprueba el efecto con una segunda consulta (GET) y/o con
 * consulta directa a la BD. Si el servidor incumple la regla, la prueba debe
 * fallar: eso es un hallazgo, no un motivo para cambiar la aserción.
 */
const request = require('supertest');
const { app } = require('../../app');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');

// ---------- Ayudantes de preparación (usan la API real) ----------

async function createCategory(name) {
  const res = await request(app).post('/categories').send({ name }).expect(201);
  return res.body;
}

async function createProduct({ name, price, inventory, taxRate, categoryId }) {
  const res = await request(app)
    .post('/products')
    .send({ name, price, inventory, taxRate, categoryId })
    .expect(201);
  return res.body;
}

async function createCart(userId) {
  const res = await request(app).post(`/cart/${userId}`).expect(201);
  return res.body;
}

describe('Integración carrito ↔ productos ↔ categorías', () => {
  beforeEach(async () => {
    await initTestDb(); // BD limpia y determinista en cada prueba
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('R2 suma de cantidades — límite: 3 + 2 iguala el inventario (5) y se fusiona en un solo ítem', async () => {
    const category = await createCategory('Electronics');
    const product = await createProduct({
      name: 'Laptop', price: 100, inventory: 5, taxRate: 0.25, categoryId: category.id,
    });
    const cart = await createCart(1);

    await request(app)
      .post(`/cart/${cart.id}/items`)
      .send({ productId: product.id, quantity: 3 })
      .expect(201);
    const second = await request(app)
      .post(`/cart/${cart.id}/items`)
      .send({ productId: product.id, quantity: 2 });

    // Estado real tras las dos operaciones
    const rows = await CartItem.findAll({ where: { cartId: cart.id } });
    const view = await request(app).get(`/cart/${cart.id}/items`);
    const stock = await Product.findByPk(product.id);

    expect(second.status).toBe(201);
    expect(second.body.quantity).toBe(5);
    expect(rows).toHaveLength(1); // sin ítems fantasma
    expect(rows[0].quantity).toBe(5);
    expect(rows[0].productId).toBe(product.id);
    expect(view.body.items).toHaveLength(1);
    expect(view.body.items[0].quantity).toBe(5);
    expect(view.body.summary.subtotal).toBe(500);
    expect(stock.inventory).toBe(5); // R6: agregar no descuenta inventario
  });

  // HALLAZGO H1: el servidor responde 201 y guarda un CartItem con quantity -1 (subtotal -100, total -125); también acepta quantity 0.
  it('R1 cantidad — inválida: quantity -1 con producto válido se rechaza y el carrito sigue vacío', async () => {
    const category = await createCategory('Electronics');
    const product = await createProduct({
      name: 'Laptop', price: 100, inventory: 5, taxRate: 0.25, categoryId: category.id,
    });
    const cart = await createCart(1);

    const res = await request(app)
      .post(`/cart/${cart.id}/items`)
      .send({ productId: product.id, quantity: -1 });

    // Estado real tras la operación
    const rows = await CartItem.findAll({ where: { cartId: cart.id } });
    const view = await request(app).get(`/cart/${cart.id}/items`);
    const stock = await Product.findByPk(product.id);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Quantity must be a positive integer' });
    expect(rows).toHaveLength(0); // no quedó ningún ítem con cantidad -1
    expect(view.body.items).toEqual([]);
    expect(view.body.summary).toEqual({ subtotal: 0, totalTax: 0, total: 0 });
    expect(stock.inventory).toBe(5);
  });

  // HALLAZGO H2: PUT /cart/2/items/1 responde 200 y cambia a 4 el ítem del carrito 1; el servidor ignora :cartId (DELETE igual: 204 y borra el ítem ajeno).
  it('R3 pertenencia — inválida: PUT /cart/2/items/1 con un ítem del carrito 1 no modifica el ítem', async () => {
    const category = await createCategory('Electronics');
    const product = await createProduct({
      name: 'Laptop', price: 100, inventory: 10, taxRate: 0.25, categoryId: category.id,
    });
    const cart1 = await createCart(1);
    const cart2 = await createCart(2);
    const added = await request(app)
      .post(`/cart/${cart1.id}/items`)
      .send({ productId: product.id, quantity: 2 })
      .expect(201);

    // El ítem es del carrito 1, pero la URL dice carrito 2
    const res = await request(app)
      .put(`/cart/${cart2.id}/items/${added.body.id}`)
      .send({ quantity: 4 });

    // Estado real tras la operación
    const item = await CartItem.findByPk(added.body.id);
    const view1 = await request(app).get(`/cart/${cart1.id}/items`);
    const view2 = await request(app).get(`/cart/${cart2.id}/items`);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(item.quantity).toBe(2); // el ítem no cambió
    expect(item.cartId).toBe(cart1.id); // y sigue en el carrito 1
    expect(view1.body.items[0].quantity).toBe(2);
    expect(view2.body.items).toEqual([]);
  });

  it('R4 total de consulta — válida: 2×100 (taxRate 0.25) en Electronics + 3×20 (taxRate 0) en Books', async () => {
    const electronics = await createCategory('Electronics');
    const books = await createCategory('Books');
    const laptop = await createProduct({
      name: 'Laptop', price: 100, inventory: 10, taxRate: 0.25, categoryId: electronics.id,
    });
    const novel = await createProduct({
      name: 'Novel', price: 20, inventory: 10, taxRate: 0, categoryId: books.id,
    });
    const cart = await createCart(1);
    await request(app).post(`/cart/${cart.id}/items`).send({ productId: laptop.id, quantity: 2 }).expect(201);
    await request(app).post(`/cart/${cart.id}/items`).send({ productId: novel.id, quantity: 3 }).expect(201);

    const view = await request(app).get(`/cart/${cart.id}/items`);
    const lineLaptop = view.body.items.find((i) => i.productId === laptop.id);
    const lineNovel = view.body.items.find((i) => i.productId === novel.id);
    const byElectronics = await request(app).get(`/products/category/${electronics.id}`);
    const byBooks = await request(app).get(`/products/category/${books.id}`);

    expect(view.body.items).toHaveLength(2);
    expect(lineLaptop.itemSubtotal).toBe(200);
    expect(lineLaptop.itemTax).toBe(50);
    expect(lineNovel.itemSubtotal).toBe(60);
    expect(lineNovel.itemTax).toBe(0);
    expect(view.body.summary).toEqual({ subtotal: 260, totalTax: 50, total: 310 });
    // Relación indirecta carrito → producto → categoría
    expect(lineLaptop.Product.categoryId).toBe(electronics.id);
    expect(lineNovel.Product.categoryId).toBe(books.id);
    expect(byElectronics.body.map((p) => p.id)).toEqual([laptop.id]);
    expect(byBooks.body.map((p) => p.id)).toEqual([novel.id]);
    // La consulta no altera el inventario
    expect((await Product.findByPk(laptop.id)).inventory).toBe(10);
    expect((await Product.findByPk(novel.id)).inventory).toBe(10);
  });

  // HALLAZGO H3 (regla inferida del redondeo al centavo del cobro): itemTax y totalTax salen 14.000000000000002 en vez de 14; total sí da 214.
  it('R4 total de consulta — válida (decimal no binario): 2×100 con taxRate 0.07 da impuesto 14 y total 214', async () => {
    const category = await createCategory('Electronics');
    const product = await createProduct({
      name: 'Laptop', price: 100, inventory: 10, taxRate: 0.07, categoryId: category.id,
    });
    const cart = await createCart(1);
    await request(app)
      .post(`/cart/${cart.id}/items`)
      .send({ productId: product.id, quantity: 2 })
      .expect(201);

    const view = await request(app).get(`/cart/${cart.id}/items`);

    expect(view.body.items).toHaveLength(1);
    expect(view.body.items[0].itemSubtotal).toBe(200);
    expect(view.body.items[0].itemTax).toBe(14);
    expect(view.body.summary.subtotal).toBe(200);
    expect(view.body.summary.totalTax).toBe(14);
    expect(view.body.summary.total).toBe(214);
  });
});
