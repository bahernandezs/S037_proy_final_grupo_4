const { priceCheckout } = require('../../services/pricing');

// Oráculos manuales: impuesto 10% DESPUÉS del descuento; envío 5 si base <50.
// Columnas: ID, clase, cupón, subtotal, descuento, base, impuesto, envío, total.
const cases = [
  ['C01', 'válida', undefined, 40, 0, 40, 4, 5, 49],
  ['C02', 'límite', undefined, 50, 0, 50, 5, 0, 55],
  ['C03', 'válida', undefined, 60, 0, 60, 6, 0, 66],
  ['C04', 'límite', { type: 'percent', value: 0.2, minSubtotal: 50 }, 50, 10, 40, 4, 5, 49],
  ['C05', 'límite', { type: 'percent', value: 0.2, minSubtotal: 62.5 }, 62.5, 12.5, 50, 5, 0, 55],
  ['C06', 'límite', { type: 'percent', value: 0.2, minSubtotal: 75 }, 75, 15, 60, 6, 0, 66],
  ['C07', 'válida', { type: 'fixed', value: 10 }, 50, 10, 40, 4, 5, 49],
  ['C08', 'límite', { type: 'fixed', value: 10 }, 60, 10, 50, 5, 0, 55],
  ['C09', 'válida', { type: 'fixed', value: 10 }, 70, 10, 60, 6, 0, 66],
];

describe('Integrante 2 — combinatoria del cálculo de checkout', () => {
  it.each(cases)('%s descuento, impuesto posterior y umbral de envío — %s',
    (id, classification, coupon, subtotal, discount, taxable, tax, shipping, total) => {
      // Arrange
      const items = [{ productId: 17, quantity: 1, unitPrice: subtotal, taxRate: 0.1 }];
      const before = JSON.parse(JSON.stringify(items));
      // Act
      const result = priceCheckout(items, coupon);
      // Assert: montos esperados independientes, en unidades y centavos.
      expect(result).toMatchObject({ subtotal, discount, taxable, tax, shipping, total,
        subtotalCents: Math.round(subtotal * 100), discountCents: Math.round(discount * 100),
        taxableCents: Math.round(taxable * 100), taxCents: Math.round(tax * 100),
        shippingCents: Math.round(shipping * 100), totalCents: Math.round(total * 100) });
      expect(result.lines).toEqual([expect.objectContaining({ productId: 17, quantity: 1,
        unitPrice: subtotal, lineSubtotal: subtotal, lineDiscount: discount, lineTax: tax,
        lineSubtotalCents: Math.round(subtotal * 100), lineDiscountCents: Math.round(discount * 100),
        lineTaxCents: Math.round(tax * 100) })]);
      expect(result.coupon).toEqual(coupon || null);
      expect(items).toEqual(before);
    });

  it('C10 mínimo porcentual incumplido impide calcular cobro — inválida', () => {
    // Arrange
    const items = [{ quantity: 1, unitPrice: 49, taxRate: 0.1 }];
    const coupon = { type: 'percent', value: 0.2, minSubtotal: 50 };
    // Act / Assert: no existe base efectiva ni resultado de cobro.
    expect(() => priceCheckout(items, coupon)).toThrow('Coupon minimum not met');
    expect(items).toEqual([{ quantity: 1, unitPrice: 49, taxRate: 0.1 }]);
  });

  it('A01 reparto proporcional, resto y redondeo al centavo — límite', () => {
    // Arrange: 0.05 / 0.10 del descuento 0.03 = 0.015 -> 0.02; resto 0.01.
    const items = [1, 2].map(productId => ({ productId, quantity: 1, unitPrice: 0.05, taxRate: 0.1 }));
    // Act
    const result = priceCheckout(items, { type: 'fixed', value: 0.03 });
    // Assert: impuestos 0.003 y 0.004 redondean ambos a cero.
    expect(result).toMatchObject({ subtotal: 0.1, discount: 0.03, taxable: 0.07, tax: 0, shipping: 5, total: 5.07 });
    expect(result.lines.map(l => l.lineDiscountCents)).toEqual([2, 1]);
    expect(result.lines.map(l => l.lineTaxCents)).toEqual([0, 0]);
  });
});

// Clases inválidas adicionales, fuera de la matriz de factores principales.
const validItem = { quantity: 1, unitPrice: 60, taxRate: 0.1 };
const invalidCases = [
  ['N01', [], undefined, 'Cart is empty'],
  ['N02', null, undefined, 'Cart is empty'],
  ['N03', [null], undefined, 'Quantity must be a positive integer'],
  ['N04', [{ ...validItem, quantity: 1.5 }], undefined, 'Quantity must be a positive integer'],
  ['N05', [{ ...validItem, quantity: 0 }], undefined, 'Quantity must be a positive integer'],
  ['N06', [{ ...validItem, unitPrice: -1 }], undefined, 'Price must be zero or greater'],
  ['N07', [{ ...validItem, unitPrice: Infinity }], undefined, 'Price must be zero or greater'],
  ['N08', [{ ...validItem, unitPrice: '60' }], undefined, 'Price must be zero or greater'],
  ['N09', [{ ...validItem, taxRate: -0.1 }], undefined, 'Tax rate must be between 0 and 1'],
  ['N10', [{ ...validItem, taxRate: 1.1 }], undefined, 'Tax rate must be between 0 and 1'],
  ['N11', [{ ...validItem, taxRate: NaN }], undefined, 'Tax rate must be between 0 and 1'],
  ['N12', [{ ...validItem, taxRate: '0.1' }], undefined, 'Tax rate must be between 0 and 1'],
  ['N13', [validItem], [], 'Only one coupon is allowed'],
  ['N14', [validItem], 'fixed', 'Only one coupon is allowed'],
  ['N15', [validItem], { type: 'other', value: 1 }, 'Coupon type must be percent or fixed'],
  ['N16', [validItem], { type: 'fixed', value: 0 }, 'Coupon value must be greater than zero'],
  ['N17', [validItem], { type: 'fixed', value: Infinity }, 'Coupon value must be greater than zero'],
  ['N18', [validItem], { type: 'fixed', value: '1' }, 'Coupon value must be greater than zero'],
  ['N19', [validItem], { type: 'percent', value: 1.1, minSubtotal: 0 }, 'Percent coupon cannot exceed 1'],
  ['N20', [validItem], { type: 'percent', value: 0.1 }, 'Percent coupon requires a minimum subtotal'],
  ['N21', [validItem], { type: 'percent', value: 0.1, minSubtotal: -1 }, 'Percent coupon requires a minimum subtotal'],
  ['N22', [validItem], { type: 'percent', value: 0.1, minSubtotal: Infinity }, 'Percent coupon requires a minimum subtotal'],
  ['N23', [validItem], { type: 'fixed', value: 60.01 }, 'Coupon exceeds subtotal'],
];

it.each(invalidCases)('%s validación de entrada de checkout — inválida', (id, items, coupon, message) => {
  // Arrange: copiar incluso NaN/Infinity sin convertirlos a null.
  const before = structuredClone({ items, coupon });
  // Act / Assert: mensaje normativo y ausencia de mutación de entradas.
  expect(() => priceCheckout(items, coupon)).toThrow(message);
  expect({ items, coupon }).toEqual(before);
});
