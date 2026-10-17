'use strict';

/**
 * Merchandise Checkout & Receipt Persistence Service (Section 5.12, NFR-3)
 * Handles concurrency-safe inventory reservation, mock payment processing, and signed PDF receipt generation.
 */

const { OrderRepository } = require('../repositories/order.repository');
const { InventoryRepository } = require('../repositories/inventory.repository');
const { CheckoutValidator } = require('../validators/checkout.validator');
const { MockPaymentGateway } = require('../integrations/payment/mock-payment.gateway');
const { signReceipt } = require('../utils/signature.util');
const { canonicalize } = require('../utils/canonical-json.util');
const { withTransaction } = require('../database/transactions');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');
const { APP_CONSTANTS } = require('../constants/app.constants');

/**
 * Generate a minimal valid PDF base64 string conforming to Section 5.12
 * @param {string} orderId
 * @param {number} totalMinor
 * @returns {string} Base64 encoded PDF
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

class CheckoutService {
  /**
   * Process a merchandise checkout request
   *
   * @param {Object} body - Request body
   * @returns {Promise<{ statusCode: number, data: Object }>}
   */
  static async processCheckout(body) {
    const { order_id, customer_id, items, discount_code, payment } = CheckoutValidator.validateCheckout(body);

    // 1. Idempotency Check
    const existing = await OrderRepository.findByOrderId(order_id);
    if (existing) {
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
        throw new ApiError(409, ERROR_CODES.DUPLICATE_ORDER_ID, `Order ID ${order_id} already exists with a different body.`);
      }
    }

    // 2. Concurrency-safe Transaction Execution (NFR-3)
    return withTransaction(async (client) => {
      const variantIds = items.map((i) => i.variant_id);

      // Row-level lock on variants to prevent race conditions during concurrent checkouts
      const variants = await InventoryRepository.findVariantsByIdsForUpdate(variantIds, client);
      const variantMap = new Map();
      for (const v of variants) {
        variantMap.set(v.variant_id, v);
      }

      // Check all variants exist (404)
      for (const item of items) {
        if (!variantMap.has(item.variant_id)) {
          throw new ApiError(404, ERROR_CODES.VARIANT_NOT_FOUND, `Variant ${item.variant_id} does not exist.`);
        }
      }

      // Check stock availability (409 OUT_OF_STOCK)
      let subtotal_minor = 0;
      const orderItems = [];

      for (const item of items) {
        const variant = variantMap.get(item.variant_id);
        if (variant.stock < item.quantity) {
          throw new ApiError(409, ERROR_CODES.OUT_OF_STOCK, `Variant ${item.variant_id} has insufficient stock.`, {
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
      if (discount_code === APP_CONSTANTS.WELCOME_DISCOUNT_CODE) {
        discount_minor = Math.floor((subtotal_minor * APP_CONSTANTS.WELCOME_DISCOUNT_PERCENT) / 100);
      }
      const total_minor = subtotal_minor - discount_minor;

      // Mock payment gateway evaluation
      const paymentInfo = await MockPaymentGateway.processPayment(payment, total_minor, 'PKR');

      // Deduct stock permanently
      for (const item of items) {
        await InventoryRepository.deductStock(item.variant_id, item.quantity, client);
      }

      const paid_at = new Date().toISOString();

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
      await OrderRepository.createOrder(
        {
          order_id,
          customer_id,
          status: 'paid',
          currency: 'PKR',
          items: orderItems,
          subtotal_minor,
          discount_minor,
          total_minor,
          discount_code: discount_code || null,
          payment_info: paymentInfo,
          receipt_payload: receiptPayload,
          receipt_signature: signature,
          raw_request: body,
          paid_at,
        },
        client
      );

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
    });
  }

  static generateReceiptPdfBase64(orderId, totalMinor) {
    return generateReceiptPdfBase64(orderId, totalMinor);
  }
}

module.exports = {
  CheckoutService,
  generateReceiptPdfBase64,
};
