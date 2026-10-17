'use strict';

/**
 * Merchandise Store & Inventory Repository (Section 5.12, NFR-3)
 * Handles operations for `products`, `product_variants`, and `discounts`.
 */

const db = require('../config/database');

class InventoryRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findProductById(productId, client = null) {
    const res = await this.query(
      'SELECT product_id, tenant_id, name, created_at FROM products WHERE product_id = $1',
      [productId],
      client
    );
    return res.rows[0] || null;
  }

  static async findVariantById(variantId, client = null) {
    const res = await this.query(
      'SELECT variant_id, product_id, name, price_minor, currency, stock, reserved, created_at FROM product_variants WHERE variant_id = $1',
      [variantId],
      client
    );
    return res.rows[0] || null;
  }

  static async findVariantsByIdsForUpdate(variantIds, client) {
    const res = await this.query(
      'SELECT variant_id, product_id, name, price_minor, currency, stock, reserved FROM product_variants WHERE variant_id = ANY($1) FOR UPDATE',
      [variantIds],
      client
    );
    return res.rows;
  }

  static async deductStock(variantId, quantity, client) {
    const res = await this.query(
      'UPDATE product_variants SET stock = stock - $1 WHERE variant_id = $2 RETURNING variant_id, stock',
      [quantity, variantId],
      client
    );
    return res.rows[0] || null;
  }

  static async findDiscountByCode(code, client = null) {
    const res = await this.query(
      'SELECT code, percent, active FROM discounts WHERE code = $1 AND active = TRUE',
      [code],
      client
    );
    return res.rows[0] || null;
  }

  static async findBaselineProducts(client = null) {
    const res = await this.query(
      `SELECT product_id FROM products WHERE product_id = 'prod-jersey-001'`,
      [],
      client
    );
    return res.rows;
  }

  static async findBaselineVariants(client = null) {
    const res = await this.query(
      `SELECT variant_id FROM product_variants WHERE variant_id IN ('var-jersey-001-M', 'var-jersey-001-L')`,
      [],
      client
    );
    return res.rows;
  }

  static async createProduct(product, client = null) {
    const res = await this.query(
      `INSERT INTO products (product_id, tenant_id, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, name = EXCLUDED.name
       RETURNING product_id, tenant_id, name, created_at`,
      [product.product_id, product.tenant_id, product.name],
      client
    );
    return res.rows[0];
  }

  static async createVariant(variant, client = null) {
    const res = await this.query(
      `INSERT INTO product_variants (variant_id, product_id, name, price_minor, currency, stock, reserved)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (variant_id) DO UPDATE SET stock = EXCLUDED.stock, reserved = EXCLUDED.reserved
       RETURNING variant_id, product_id, name, price_minor, currency, stock, reserved, created_at`,
      [
        variant.variant_id,
        variant.product_id,
        variant.name,
        variant.price_minor,
        variant.currency || 'PKR',
        variant.stock || 0,
        variant.reserved || 0,
      ],
      client
    );
    return res.rows[0];
  }

  static async deleteAll(client = null) {
    await this.query('DELETE FROM product_variants', [], client);
    await this.query('DELETE FROM products', [], client);
    await this.query('DELETE FROM discounts', [], client);
  }
}

module.exports = {
  InventoryRepository,
};
