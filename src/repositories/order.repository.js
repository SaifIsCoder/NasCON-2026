'use strict';

/**
 * Merchandise Order Repository (Section 5.12)
 * Handles persistence and query operations for the `orders` table.
 */

const db = require('../config/database');

class OrderRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findByOrderId(orderId, client = null) {
    const res = await this.query('SELECT * FROM orders WHERE order_id = $1', [orderId], client);
    return res.rows[0] || null;
  }

  static async createOrder(order, client = null) {
    const itemsJson = typeof order.items === 'string' ? order.items : JSON.stringify(order.items);
    const paymentInfoJson = typeof order.payment_info === 'string' ? order.payment_info : JSON.stringify(order.payment_info);
    const receiptPayloadJson = typeof order.receipt_payload === 'string' ? order.receipt_payload : JSON.stringify(order.receipt_payload);
    const rawRequestJson = typeof order.raw_request === 'string' ? order.raw_request : JSON.stringify(order.raw_request);

    const res = await this.query(
      `INSERT INTO orders (
        order_id, customer_id, status, currency, items, subtotal_minor,
        discount_minor, total_minor, discount_code, payment_info,
        receipt_payload, receipt_signature, raw_request, paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        order.order_id,
        order.customer_id,
        order.status || 'paid',
        order.currency || 'PKR',
        itemsJson,
        order.subtotal_minor,
        order.discount_minor || 0,
        order.total_minor,
        order.discount_code || null,
        paymentInfoJson,
        receiptPayloadJson,
        order.receipt_signature,
        rawRequestJson,
        order.paid_at || new Date().toISOString(),
      ],
      client
    );
    return res.rows[0];
  }

  static async deleteAll(client = null) {
    return this.query('DELETE FROM orders', [], client);
  }
}

module.exports = {
  OrderRepository,
};
