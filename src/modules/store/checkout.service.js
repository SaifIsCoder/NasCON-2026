'use strict';

/**
 * Merchandise Store Checkout & Receipt Persistence Service (Section 5.12)
 * Handles concurrency-safe inventory reservation, mock payment processing, and signed PDF receipt generation.
 */

const db = require('../../db');
const { signReceipt, canonicalize } = require('../../utils/signature');

class StoreError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Generate a minimal valid PDF base64 string conforming to Section 5.12:
 * - Starts with %PDF
 * - Contains order_id and formatted total (e.g., PKR 4500.00)
 */
function generateReceiptPdfBase64(orderId, totalMinor) {
  const majorFormatted = (totalMinor / 100).toFixed(2);
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
72 720 Td
(NaSCon '26 Merchandise Receipt) Tj
0 -24 Td
(Order ID: ${orderId}) Tj
0 -24 Td
(Total Paid: PKR ${majorFormatted}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000416 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
498
%%EOF`;

  return Buffer.from(pdfContent, 'utf8').toString('base64');
}

/**
 * Processes a checkout request with transactional concurrency controls (NFR-3).
 *
 * @param {Object} body - Request body containing order_id, customer_id, items, discount_code, payment
 * @returns {Promise<Object>} { statusCode, data }
 */
async function processCheckout(body) {
  const { order_id, customer_id, items, discount_code, payment } = body;

  // 1. Schema Validation (400)
  if (!order_id || typeof order_id !== 'string') {
    throw new StoreError(400, 'VALIDATION_ERROR', 'order_id is required', { fields: ['order_id'] });
  }
  if (!customer_id || typeof customer_id !== 'string') {
    throw new StoreError(400, 'VALIDATION_ERROR', 'customer_id is required', { fields: ['customer_id'] });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 10) {
    throw new StoreError(400, 'VALIDATION_ERROR', 'items must contain 1-10 items', { fields: ['items'] });
  }
  if (!payment || typeof payment.token !== 'string') {
    throw new StoreError(400, 'VALIDATION_ERROR', 'payment.token is required', { fields: ['payment.token'] });
  }

  // Validate discount code
  if (discount_code !== null && discount_code !== undefined && discount_code !== 'WELCOME10') {
    throw new StoreError(400, 'INVALID_DISCOUNT_CODE', `Unknown discount code: ${discount_code}`);
  }

  // 2. Idempotency Check
  const existingOrderRes = await db.query('SELECT * FROM orders WHERE order_id = $1', [order_id]);
  if (existingOrderRes.rows.length > 0) {
    const existing = existingOrderRes.rows[0];
    const incomingCanon = canonicalize(body);
    const existingCanon = canonicalize(existing.raw_request);

    if (incomingCanon === existingCanon) {
      // Replay of identical request -> return 200 with stored result
      return {
        statusCode: 200,
        data: {
          order_id: existing.order_id,
          status: existing.status,
          currency: existing.currency,
          items: existing.items,
          subtotal_minor: existing.subtotal_minor,
          discount_minor: existing.discount_minor,
          total_minor: existing.total_minor,
          payment: existing.payment_info,
          receipt: {
            payload: existing.receipt_payload,
            signature: existing.receipt_signature,
            pdf_base64: generateReceiptPdfBase64(existing.order_id, existing.total_minor),
          },
        },
      };
    } else {
      // Same order_id with different body -> 409 DUPLICATE_ORDER_ID
      throw new StoreError(409, 'DUPLICATE_ORDER_ID', `Order ID ${order_id} already exists with a different body.`);
    }
  }

  // 3. Concurrency-safe Transaction Execution (NFR-3)
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const variantIds = items.map((i) => i.variant_id);

    // Row-level lock on variants to prevent race conditions during concurrent checkouts
    const variantsRes = await client.query(
      'SELECT * FROM product_variants WHERE variant_id = ANY($1) FOR UPDATE',
      [variantIds]
    );

    const variantMap = new Map();
    for (const v of variantsRes.rows) {
      variantMap.set(v.variant_id, v);
    }

    // Check all variants exist (404)
    for (const item of items) {
      if (!variantMap.has(item.variant_id)) {
        throw new StoreError(404, 'VARIANT_NOT_FOUND', `Variant ${item.variant_id} does not exist.`);
      }
    }

    // Check stock availability (409 OUT_OF_STOCK)
    let subtotal_minor = 0;
    const orderItems = [];

    for (const item of items) {
      const variant = variantMap.get(item.variant_id);
      if (variant.stock < item.quantity) {
        throw new StoreError(409, 'OUT_OF_STOCK', `Variant ${item.variant_id} has insufficient stock.`, {
          variant_id: item.variant_id,
        });
      }

      const itemTotal = variant.price_minor * item.quantity;
      subtotal_minor += itemTotal;

      orderItems.push({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price_minor: variant.price_minor,
      });
    }

    // Calculate discount and total
    let discount_minor = 0;
    if (discount_code === 'WELCOME10') {
      discount_minor = Math.floor((subtotal_minor * 10) / 100);
    }
    const total_minor = subtotal_minor - discount_minor;

    // Mock payment gateway evaluation
    if (payment.token === 'tok_declined') {
      throw new StoreError(402, 'PAYMENT_DECLINED', 'Payment was declined by the card issuer.');
    }
    if (payment.token === 'tok_capture_fail') {
      throw new StoreError(402, 'PAYMENT_CAPTURE_FAILED', 'Payment authorization succeeded but capture failed.');
    }
    if (payment.token !== 'tok_success') {
      throw new StoreError(400, 'VALIDATION_ERROR', `Invalid payment token: ${payment.token}`);
    }

    // Deduct stock permanently
    for (const item of items) {
      await client.query(
        'UPDATE product_variants SET stock = stock - $1 WHERE variant_id = $2',
        [item.quantity, item.variant_id]
      );
    }

    const paid_at = new Date().toISOString();
    const paymentInfo = {
      authorization_id: `auth_${Date.now()}`,
      capture_id: `cap_${Date.now()}`,
      state: 'captured',
    };

    // Construct receipt payload according to Section 5.12
    const receiptPayload = {
      order_id,
      customer_id,
      items: orderItems,
      subtotal_minor,
      discount_minor,
      total_minor,
      currency: 'PKR',
      paid_at,
    };

    // Compute HMAC-SHA256 signature using DAY1_SALT
    const signature = signReceipt(order_id, receiptPayload);
    const pdfBase64 = generateReceiptPdfBase64(order_id, total_minor);

    // Persist order and signed receipt
    await client.query(
      `INSERT INTO orders (
        order_id, customer_id, status, currency, items, subtotal_minor,
        discount_minor, total_minor, discount_code, payment_info,
        receipt_payload, receipt_signature, raw_request, paid_at
      ) VALUES ($1, $2, 'paid', 'PKR', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        order_id,
        customer_id,
        JSON.stringify(orderItems),
        subtotal_minor,
        discount_minor,
        total_minor,
        discount_code || null,
        JSON.stringify(paymentInfo),
        JSON.stringify(receiptPayload),
        signature,
        JSON.stringify(body),
        paid_at,
      ]
    );

    await client.query('COMMIT');

    return {
      statusCode: 201,
      data: {
        order_id,
        status: 'paid',
        currency: 'PKR',
        items: orderItems,
        subtotal_minor,
        discount_minor,
        total_minor,
        payment: paymentInfo,
        receipt: {
          payload: receiptPayload,
          signature,
          pdf_base64: pdfBase64,
        },
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Query current stock of a variant (Section 5.12)
 *
 * @param {string} variant_id
 * @returns {Promise<Object>}
 */
async function getInventory(variant_id) {
  const res = await db.query('SELECT variant_id, stock, reserved FROM product_variants WHERE variant_id = $1', [
    variant_id,
  ]);
  if (res.rows.length === 0) {
    throw new StoreError(404, 'VARIANT_NOT_FOUND', `Variant ${variant_id} does not exist.`);
  }
  return res.rows[0];
}

module.exports = {
  StoreError,
  processCheckout,
  getInventory,
  generateReceiptPdfBase64,
};
