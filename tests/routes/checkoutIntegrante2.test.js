const request = require('supertest');
const { app } = require('../../app');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const Category = require('../../models/category');
const Product = require('../../models/product');
const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Order = require('../../models/order');
const OrderLine = require('../../models/orderLine');

describe('Integrante 2 — checkout persistido', () => {
  beforeEach(initTestDb);
  afterAll(closeTestDb);

  it.each([
    ['Q01', undefined, 0, 60, 6, 66],
    ['Q02', { type: 'percent', value: 0.1, minSubtotal: 50 }, 6, 54, 5.4, 59.4],
    ['Q03', { type: 'fixed', value: 10 }, 10, 50, 5, 55],
  ])('%s cobro único, inventario y pedido congelado — válida', async (id, coupon, discount, taxable, tax, total) => {
    // Arrange
    const category = await Category.create({ name: 'Libros' });
    const product = await Product.create({ name: 'Manual', categoryId: category.id, price: 30, taxRate: 0.1, inventory: 5 });
    const cart = await Cart.create({ userId: 7 });
    await CartItem.create({ cartId: cart.id, productId: product.id, quantity: 2 });
    // Act
    const response = await request(app).post(`/cart/${cart.id}/checkout`).send({ coupon });
    // Assert: oráculos calculados con las reglas del README.
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ subtotal: 60, discount, taxable, tax, shipping: 0, total, coupon: coupon || null });
    expect(response.body.lines).toEqual([expect.objectContaining({ productId: product.id, quantity: 2, unitPrice: 30, lineSubtotal: 60, lineDiscount: discount, lineTax: tax })]);
    expect((await product.reload()).inventory).toBe(3);
    expect((await cart.reload()).status).toBe('checked_out');
    expect(await Order.count()).toBe(1);
    expect(await OrderLine.count()).toBe(1);
    expect((await Order.findOne()).totalCents).toBe(Math.round(total * 100));

    await product.update({ price: 99 });
    const saved = await request(app).get(`/cart/${cart.id}/order`).expect(200);
    expect(saved.body).toEqual(response.body);
    const second = await request(app).post(`/cart/${cart.id}/checkout`).send({ coupon });
    expect(second.status).toBe(400);
    expect(second.body).toEqual({ error: 'Cart already checked out' });
    expect((await product.reload()).inventory).toBe(3);
    expect(await Order.count()).toBe(1);
    expect(await OrderLine.count()).toBe(1);
  });

  it('Q04 inventario insuficiente conserva todos los stocks y pedidos — inválida', async () => {
    // Arrange: datos directos reproducen un stock reducido después del alta.
    const category = await Category.create({ name: 'Libros' });
    const products = await Product.bulkCreate([
      { name: 'Manual A', categoryId: category.id, price: 30, taxRate: 0, inventory: 5 },
      { name: 'Manual B', categoryId: category.id, price: 20, taxRate: 0, inventory: 1 },
    ]);
    const cart = await Cart.create({ userId: 7 });
    await CartItem.bulkCreate(products.map(product => ({ cartId: cart.id, productId: product.id, quantity: 2 })));
    // Act
    const response = await request(app).post(`/cart/${cart.id}/checkout`).send({});
    // Assert: estado final atómico, independientemente del orden de lectura.
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Not enough inventory available' });
    expect((await products[0].reload()).inventory).toBe(5);
    expect((await products[1].reload()).inventory).toBe(1);
    expect((await cart.reload()).status).toBe('open');
    expect(await Order.count()).toBe(0);
    expect(await OrderLine.count()).toBe(0);
    expect((await CartItem.findAll()).map(item => item.quantity)).toEqual([2, 2]);
  });

  it.each([
    ['Q05', 'abc', 400, 'Cart ID should be a number'],
    ['Q06', '99999', 404, "Cart doesn't exist"],
  ])('%s identificador inválido impide crear pedido — inválida', async (id, cartId, status, error) => {
    // Arrange: base vacía.
    // Act
    const response = await request(app).post(`/cart/${cartId}/checkout`).send({});
    // Assert
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error });
    expect(await Order.count()).toBe(0);
    expect(await OrderLine.count()).toBe(0);
  });

  it('Q07 carrito vacío y pedido ausente se rechazan — límite', async () => {
    // Arrange
    const cart = await Cart.create({ userId: 7 });
    // Act
    const response = await request(app).post(`/cart/${cart.id}/checkout`).send({});
    const order = await request(app).get(`/cart/${cart.id}/order`);
    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Cart is empty' });
    expect(order.status).toBe(404);
    expect(order.body).toEqual({ error: 'Order not found' });
    expect((await cart.reload()).status).toBe('open');
    expect(await Order.count()).toBe(0);
    expect(await OrderLine.count()).toBe(0);
  });
});
