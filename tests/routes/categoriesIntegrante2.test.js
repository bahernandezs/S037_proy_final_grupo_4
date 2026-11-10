const request = require('supertest');
const { app } = require('../../app');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const Category = require('../../models/category');

describe('Integrante 2 — categorías reales, SQLite en memoria', () => {
  beforeEach(initTestDb);
  afterAll(closeTestDb);

  it('T05 nombre nuevo y persistencia — válida', async () => {
    // Arrange: tablas vacías, nombre no utilizado.
    const input = { name: 'Instrumentos' };
    // Act
    const response = await request(app).post('/categories').send(input);
    // Assert: contrato de routes/categories.js y restricciones del modelo.
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(input);
    expect(response.body.id).toEqual(expect.any(Number));
    expect(await Category.count()).toBe(1);
    expect((await Category.findByPk(response.body.id)).name).toBe(input.name);
  });

  it('T06 nombre único y rechazo sin inserción — inválida', async () => {
    // Arrange
    const original = await Category.create({ name: 'Instrumentos' });
    // Act
    const response = await request(app).post('/categories').send({ name: 'Instrumentos' });
    // Assert: no se fija un mensaje dependiente de la versión de Sequelize.
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
    expect(response.body.error.length).toBeGreaterThan(0);
    expect(await Category.count()).toBe(1);
    expect((await Category.findByPk(original.id)).name).toBe('Instrumentos');
    expect((await Category.findAll()).map(row => row.id)).toEqual([original.id]);
  });

  it('T07 listar todas las categorías sin alterarlas — válida', async () => {
    // Arrange
    const rows = await Category.bulkCreate([{ name: 'Instrumentos' }, { name: 'Libros' }, { name: 'Ropa' }]);
    const expected = rows.map(({ id, name }) => ({ id, name })).sort((a, b) => a.id - b.id);
    // Act
    const response = await request(app).get('/categories');
    // Assert: no se supone un orden que la ruta no garantiza.
    expect(response.status).toBe(200);
    expect(response.body.map(({ id, name }) => ({ id, name })).sort((a, b) => a.id - b.id)).toEqual(expected);
    expect((await Category.findAll()).map(({ id, name }) => ({ id, name })).sort((a, b) => a.id - b.id)).toEqual(expected);
  });

  it('T08 lista vacía sin crear registros — límite', async () => {
    // Arrange
    expect(await Category.count()).toBe(0);
    // Act
    const response = await request(app).get('/categories');
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(await Category.count()).toBe(0);
  });
});
